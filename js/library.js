// ════════════════════════════════════════════════════════════
//  EnviroLog — Library View
// ════════════════════════════════════════════════════════════

import { OBSERVATION_TYPES, STATUS_TYPES, getType, getStatus } from './config.js';
import { getAllEntries, deleteEntry, saveEntry, getNextOrder } from './db.js';
import { uuid, today, nowTime, formatDate, formatDateShort, friendlyDate,
         formatTime, sanitizeHtml, icon, toast, confirmDialog, groupBy, debounce } from './utils.js';
import { createEntryCard } from './app.js';

let _allEntries = [];
let _filteredEntries = [];
let _miniMaps = {};

// ── Library Renderer ──────────────────────────────────────

export async function renderLibrary({ container, navigate }) {
  _allEntries = await getAllEntries();
  _filteredEntries = [..._allEntries];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Library</div>
        <div class="page-subtitle" id="lib-count">${_allEntries.length} entries</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="lib-new-btn">${icon('plus')} New Entry</button>
      </div>
    </div>

    <div class="library-toolbar">
      <div class="search-box">
        ${icon('search')}
        <input type="text" id="lib-search" placeholder="Search entries…" autocomplete="off">
      </div>
      <select class="input filter-select" id="lib-filter-type" style="width:auto">
        <option value="">All Types</option>
        ${OBSERVATION_TYPES.map(t => `<option value="${t.id}">${sanitizeHtml(t.label)}</option>`).join('')}
      </select>
      <select class="input filter-select" id="lib-filter-status" style="width:auto">
        <option value="">All Statuses</option>
        ${STATUS_TYPES.map(s => `<option value="${s.id}">${sanitizeHtml(s.label)}</option>`).join('')}
      </select>
      <input type="date" class="input filter-select" id="lib-filter-date" style="width:auto" title="Filter by date">
      <button class="btn btn-ghost btn-sm" id="lib-clear-filters" style="display:none">${icon('x')} Clear</button>
    </div>

    <div class="page-body-wide" id="lib-content" style="padding-top:16px"></div>
  `;

  document.getElementById('lib-new-btn')?.addEventListener('click', () => navigate('new-entry'));

  // Search & filter
  const searchInput = document.getElementById('lib-search');
  const typeFilter = document.getElementById('lib-filter-type');
  const statusFilter = document.getElementById('lib-filter-status');
  const dateFilter = document.getElementById('lib-filter-date');
  const clearBtn = document.getElementById('lib-clear-filters');

  const applyFilters = debounce(() => {
    const q = searchInput.value.toLowerCase().trim();
    const type = typeFilter.value;
    const status = statusFilter.value;
    const date = dateFilter.value;
    const hasFilters = q || type || status || date;

    clearBtn.style.display = hasFilters ? 'inline-flex' : 'none';

    _filteredEntries = _allEntries.filter(e => {
      if (type && e.type !== type) return false;
      if (status && e.status !== status) return false;
      if (date && e.date !== date) return false;
      if (q) {
        const haystack = [e.title, e.description, e.correctiveActions, ...(e.tags || []),
                          getType(e.type).label, e.inspector].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    document.getElementById('lib-count').textContent =
      _filteredEntries.length === _allEntries.length
        ? `${_allEntries.length} entries`
        : `${_filteredEntries.length} of ${_allEntries.length} entries`;

    renderEntryList(navigate);
  }, 200);

  searchInput?.addEventListener('input', applyFilters);
  typeFilter?.addEventListener('change', applyFilters);
  statusFilter?.addEventListener('change', applyFilters);
  dateFilter?.addEventListener('change', applyFilters);

  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    typeFilter.value = '';
    statusFilter.value = '';
    dateFilter.value = '';
    applyFilters();
  });

  renderEntryList(navigate);
}

function renderEntryList(navigate) {
  const content = document.getElementById('lib-content');
  if (!content) return;

  // Clean up mini maps
  Object.values(_miniMaps).forEach(m => { try { m.remove(); } catch {} });
  _miniMaps = {};

  if (_filteredEntries.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        ${icon('book', 'empty-icon')}
        <div class="empty-title">${_allEntries.length === 0 ? 'No entries yet' : 'No matching entries'}</div>
        <div class="empty-text">
          ${_allEntries.length === 0
            ? 'Create your first environmental observation entry to get started.'
            : 'Try adjusting your search or filter criteria.'}
        </div>
        ${_allEntries.length === 0 ? `<button class="btn btn-primary" id="lib-first-entry">${icon('plus')} Create First Entry</button>` : ''}
      </div>
    `;
    document.getElementById('lib-first-entry')?.addEventListener('click', () => navigate('new-entry'));
    return;
  }

  // Group by date (most recent first)
  const grouped = groupBy(_filteredEntries, 'date');
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  content.innerHTML = '';

  sortedDates.forEach(date => {
    const entries = grouped[date].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const group = document.createElement('div');
    group.className = 'date-group';

    const label = friendlyDate(date);
    const fullDate = formatDate(date);

    group.innerHTML = `
      <div class="date-group-header">
        <div class="date-group-label" title="${fullDate}">${label}</div>
        <span class="date-group-count">${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}</span>
        <div class="date-group-line"></div>
        <button class="btn btn-ghost btn-sm" data-date="${date}" data-action="new-for-date" title="Add entry for ${label}">
          ${icon('plus')}
        </button>
      </div>
      <div class="entries-stack" data-date-stack="${date}"></div>
    `;

    const stack = group.querySelector(`[data-date-stack="${date}"]`);

    entries.forEach(entry => {
      const card = createEntryCard(entry, {
        navigate,
        onDelete: (id) => {
          _allEntries = _allEntries.filter(e => e.id !== id);
          _filteredEntries = _filteredEntries.filter(e => e.id !== id);
          document.getElementById('lib-count').textContent = `${_allEntries.length} entries`;
          // Remove group if empty
          if (stack.children.length === 0) group.remove();
        },
        onDuplicate: async (entry) => {
          const newOrder = await getNextOrder(today());
          const dup = {
            ...entry,
            id: uuid(),
            date: today(),
            time: nowTime(),
            order: newOrder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveEntry(dup);
          _allEntries = await getAllEntries();
          _filteredEntries = [..._allEntries];
          renderEntryList(navigate);
          toast('Entry duplicated to today', 'success');
        },
      });

      stack.appendChild(card);

      // Mini map for entries with location
      if (entry.location?.lat && entry.location?.lng && window.L) {
        const mapId = `mini-map-${entry.id}`;
        const mapDiv = document.createElement('div');
        mapDiv.id = mapId;
        mapDiv.className = 'entry-mini-map';
        card.querySelector('.entry-card-location')?.insertAdjacentElement('afterend', mapDiv);

        setTimeout(() => {
          if (!document.getElementById(mapId)) return;
          try {
            const m = L.map(mapId, {
              zoomControl: false,
              attributionControl: false,
              dragging: false,
              scrollWheelZoom: false,
              doubleClickZoom: false,
              touchZoom: false,
            }).setView([entry.location.lat, entry.location.lng], 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
            }).addTo(m);

            L.circleMarker([entry.location.lat, entry.location.lng], {
              radius: 8,
              fillColor: getType(entry.type).color,
              fillOpacity: 0.9,
              color: 'white',
              weight: 2,
            }).addTo(m);

            _miniMaps[entry.id] = m;

            // Click to open full map
            mapDiv.style.cursor = 'pointer';
            mapDiv.title = 'Click to open in maps';
            mapDiv.addEventListener('click', () => {
              window.open(`https://www.openstreetmap.org/?mlat=${entry.location.lat}&mlon=${entry.location.lng}#map=17/${entry.location.lat}/${entry.location.lng}`, '_blank');
            });
          } catch {}
        }, 100);
      }
    });

    // "New entry for this date" button
    group.querySelector('[data-action="new-for-date"]')?.addEventListener('click', () => {
      navigate('new-entry');
      setTimeout(() => {
        const dateInput = document.getElementById('f-date');
        if (dateInput) {
          dateInput.value = date;
          dateInput.dispatchEvent(new Event('change'));
        }
      }, 150);
    });

    content.appendChild(group);
  });
}
