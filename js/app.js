// ════════════════════════════════════════════════════════════
//  EnviroLog — Main Application Controller
// ════════════════════════════════════════════════════════════

import { OBSERVATION_TYPES, STATUS_TYPES, DEFAULT_PROJECT, getType, getStatus } from './config.js';
import { getAllEntries, getEntriesByDate, getSetting, setSetting, openDB } from './db.js';
import { today, formatDate, formatDateShort, friendlyDate, formatTime, icon,
         sanitizeHtml, toast, closeModal, closeLightbox, confirmDialog, groupBy } from './utils.js';
import { renderEntryForm } from './entry-form.js';
import { renderLibrary } from './library.js';
import { renderReports } from './reports.js';

// ── App State ─────────────────────────────────────────────

const App = {
  currentView: null,
  project: { ...DEFAULT_PROJECT },
  categorySettings: {},   // { [typeId]: { visible: boolean, prompts: string[]|null } }
};

// ── Category Settings Helpers ─────────────────────────────

function getDefaultCategorySettings() {
  const s = {};
  OBSERVATION_TYPES.forEach(t => { s[t.id] = { visible: true, prompts: null }; });
  return s;
}

function applyCategorySettings() {
  OBSERVATION_TYPES.forEach(type => {
    const cs = App.categorySettings[type.id];
    if (cs?.prompts && Array.isArray(cs.prompts) && cs.prompts.length > 0) {
      type.prompts = cs.prompts;
    } else {
      type.prompts = [...type._defaultPrompts];
    }
  });
}

function isCategoryVisible(typeId) {
  const cs = App.categorySettings[typeId];
  if (!cs) return true;        // default: visible
  return cs.visible !== false;
}

// ── Boot ─────────────────────────────────────────────────

async function boot() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Load project settings
  App.project = {
    ...DEFAULT_PROJECT,
    ...(await getSetting('project', {})),
  };

  // Load category settings
  const saved = await getSetting('categorySettings', null);
  const defaults = getDefaultCategorySettings();
  if (saved) {
    // Merge saved with defaults (handles new categories added after user saved)
    App.categorySettings = { ...defaults, ...saved };
  } else {
    App.categorySettings = defaults;
  }
  applyCategorySettings();

  updateSidebarProject();
  setupNavigation();
  setupGlobalEventListeners();
  watchOnlineStatus();

  // Route to initial view
  const hash = location.hash.replace('#', '') || 'dashboard';
  navigate(hash);
}

// ── Navigation ────────────────────────────────────────────

function navigate(view, params = {}) {
  // Strip params from view string
  const [viewName] = view.split('?');

  App.currentView = viewName;
  location.hash = viewName;

  // Update nav links
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });

  // Render view
  const container = document.getElementById('view-container');
  container.innerHTML = '';

  const views = {
    dashboard: renderDashboard,
    library:   renderLibrary,
    reports:   renderReports,
    settings:  renderSettings,
    'new-entry': () => renderEntryForm(null, App.project, navigate),
    'edit-entry': () => renderEntryForm(params.id, App.project, navigate),
  };

  const renderer = views[viewName];
  if (renderer) {
    renderer({ container, project: App.project, navigate, params });
  } else {
    navigate('dashboard');
  }
}

function setupNavigation() {
  // Sidebar links
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', e => {
      const view = link.dataset.view;
      if (view) {
        e.preventDefault();
        navigate(view);
      }
    });
  });

  // New entry buttons
  document.getElementById('sidebar-new-btn')?.addEventListener('click', () => navigate('new-entry'));
  document.getElementById('mobile-fab')?.addEventListener('click', () => navigate('new-entry'));

  // Hash changes (back/forward)
  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#', '');
    if (hash && hash !== App.currentView) navigate(hash);
  });
}

function updateSidebarProject() {
  const el = document.getElementById('sidebar-project-name');
  if (el) el.textContent = App.project.name || 'Construction Monitor';
}

// ── Dashboard ─────────────────────────────────────────────

async function renderDashboard({ container }) {
  const todayStr = today();
  const allEntries = await getAllEntries();
  const todayEntries = allEntries.filter(e => e.date === todayStr);

  // Count by status
  const statusCounts = {};
  STATUS_TYPES.forEach(s => { statusCounts[s.id] = 0; });
  allEntries.forEach(e => { if (statusCounts[e.status] !== undefined) statusCounts[e.status]++; });

  // Count by type today
  const typeCount = {};
  OBSERVATION_TYPES.forEach(t => { typeCount[t.id] = 0; });
  allEntries.forEach(e => { if (typeCount[e.type] !== undefined) typeCount[e.type]++; });

  // Filter visible categories
  const visibleTypes = OBSERVATION_TYPES.filter(t => isCategoryVisible(t.id));

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">${sanitizeHtml(App.project.name)}</div>
        <div class="page-subtitle">${formatDate(todayStr)}</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" id="dash-new-btn">
          ${icon('plus')} New Entry
        </button>
      </div>
    </div>
    <div class="page-body animate-in">

      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card">
          <div class="stat-icon" style="background:#dbeafe;color:#1d4ed8">${icon('book')}</div>
          <div class="stat-body">
            <div class="stat-value">${allEntries.length}</div>
            <div class="stat-label">Total Entries</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#dcfce7;color:#16a34a">${icon('check')}</div>
          <div class="stat-body">
            <div class="stat-value">${statusCounts['compliant']}</div>
            <div class="stat-label">Compliant</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fee2e2;color:#dc2626">${icon('alert')}</div>
          <div class="stat-body">
            <div class="stat-value">${statusCounts['non-compliant']}</div>
            <div class="stat-label">Non-Compliant</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef3c7;color:#d97706">${icon('layers')}</div>
          <div class="stat-body">
            <div class="stat-value">${todayEntries.length}</div>
            <div class="stat-label">Today's Entries</div>
          </div>
        </div>
      </div>

      <div class="dashboard-section-title">Quick Log by Category</div>
      ${visibleTypes.length === 0 ? `
        <div style="color:var(--slate-400);font-size:13px;margin-bottom:24px;padding:16px;background:white;border:1px solid var(--color-border);border-radius:var(--radius-lg)">
          No categories are active. Enable categories in <a href="#settings" style="color:var(--blue-600)">Settings</a>.
        </div>
      ` : `<div class="quick-types-grid" id="quick-types"></div>`}

      <div class="dashboard-section-title" style="margin-top:8px">
        Today's Entries
        ${todayEntries.length > 0 ? `<span style="font-weight:400;color:var(--slate-400);font-size:12px;margin-left:6px">${todayEntries.length} logged</span>` : ''}
      </div>
      <div id="today-entries"></div>

    </div>
  `;

  // Quick type buttons
  const quickGrid = document.getElementById('quick-types');
  if (quickGrid) {
    visibleTypes.forEach(type => {
      const card = document.createElement('div');
      card.className = 'quick-type-card';
      const count = typeCount[type.id] || 0;
      card.innerHTML = `
        <div class="quick-type-dot" style="background:${type.color}"></div>
        <div style="flex:1;min-width:0">
          <div class="quick-type-label">${sanitizeHtml(type.label)}</div>
          ${count > 0 ? `<div style="font-size:11px;color:var(--slate-400)">${count} total</div>` : ''}
        </div>
      `;
      card.addEventListener('click', () => {
        navigate('new-entry');
        // Pre-select type after form renders
        setTimeout(() => {
          const chip = document.querySelector(`.type-chip[data-type="${type.id}"]`);
          chip?.click();
        }, 100);
      });
      quickGrid.appendChild(card);
    });
  }

  // Today's entries
  const todayContainer = document.getElementById('today-entries');
  if (todayEntries.length === 0) {
    todayContainer.innerHTML = `
      <div class="empty-state" style="padding:40px 20px">
        ${icon('leaf', 'empty-icon')}
        <div class="empty-title">No entries yet today</div>
        <div class="empty-text">Tap "New Entry" to log your first observation for ${formatDateShort(todayStr)}</div>
        <button class="btn btn-primary" id="first-entry-btn">${icon('plus')} Log First Entry</button>
      </div>
    `;
    document.getElementById('first-entry-btn')?.addEventListener('click', () => navigate('new-entry'));
  } else {
    const stack = document.createElement('div');
    stack.className = 'entries-stack';
    todayEntries.forEach(entry => {
      stack.appendChild(createEntryCard(entry, { navigate, compact: true }));
    });
    todayContainer.appendChild(stack);
  }

  document.getElementById('dash-new-btn')?.addEventListener('click', () => navigate('new-entry'));
}

// ── Settings ──────────────────────────────────────────────

async function renderSettings({ container }) {
  const project = App.project;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Settings</div>
        <div class="page-subtitle">Project information and preferences</div>
      </div>
    </div>
    <div class="page-body animate-in">
      <div class="settings-sections">

        <div class="card">
          <div class="card-header"><span class="card-title">Project Details</span></div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group">
                <label>Project Name</label>
                <input type="text" id="set-name" value="${sanitizeHtml(project.name)}" placeholder="Project name">
              </div>
              <div class="form-group">
                <label>Project Number</label>
                <input type="text" id="set-number" value="${sanitizeHtml(project.number)}" placeholder="e.g. PRJ-2024-001">
              </div>
            </div>
            <div class="form-group">
              <label>Site Address</label>
              <input type="text" id="set-address" value="${sanitizeHtml(project.address)}" placeholder="Full site address">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Client / Principal</label>
                <input type="text" id="set-client" value="${sanitizeHtml(project.client)}" placeholder="Client name">
              </div>
              <div class="form-group">
                <label>Contractor</label>
                <input type="text" id="set-contractor" value="${sanitizeHtml(project.contractor)}" placeholder="Contractor name">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Observer — First Name</label>
                <input type="text" id="set-observer-first" value="${sanitizeHtml(project.observerFirst || '')}" placeholder="First name">
              </div>
              <div class="form-group">
                <label>Observer — Last Name</label>
                <input type="text" id="set-observer-last" value="${sanitizeHtml(project.observerLast || '')}" placeholder="Last name">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Approval / Consent Ref</label>
                <input type="text" id="set-approval" value="${sanitizeHtml(project.approvalRef)}" placeholder="e.g. DA-2024-100">
              </div>
            </div>
            <div class="divider"></div>
            <div style="font-size:12px;font-weight:600;color:var(--slate-500);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">Report Header</div>
            <div class="form-group">
              <label>Report Title</label>
              <input type="text" id="set-report-title" value="${sanitizeHtml(project.reportTitle || 'Environmental Monitoring Report')}" placeholder="Report title">
            </div>
            <div class="form-group">
              <label>Report Subtitle</label>
              <input type="text" id="set-report-subtitle" value="${sanitizeHtml(project.reportSubtitle || 'Construction Site Environmental Inspection')}" placeholder="Report subtitle">
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Report Logo</span></div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--slate-500);margin-bottom:12px">Upload a logo to appear on generated reports.</p>
            <div style="display:flex;align-items:center;gap:16px">
              <div class="logo-preview" id="logo-preview" title="Click to upload logo">
                ${project.logo
                  ? `<img src="${project.logo}" alt="Logo">`
                  : `<div class="logo-placeholder">${icon('camera')}<br>Upload</div>`}
              </div>
              <div>
                <button class="btn btn-secondary btn-sm" id="logo-upload-btn">${icon('camera')} Upload Logo</button>
                ${project.logo ? `<button class="btn btn-ghost btn-sm" id="logo-clear-btn" style="margin-left:8px">${icon('x')} Remove</button>` : ''}
                <p class="help-text" style="margin-top:6px">PNG, JPG. Max 2MB. Displayed at top of reports.</p>
              </div>
            </div>
            <input type="file" id="logo-file-input" accept="image/*" hidden>
          </div>
        </div>

        <div class="card" id="category-settings-card">
          <div class="card-header">
            <span class="card-title">Dashboard Categories</span>
            <span style="font-size:12px;color:var(--slate-400)">Toggle visibility &amp; edit checklists</span>
          </div>
          <div class="card-body" style="padding:0">
            <div id="category-settings-list"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Data Management</span></div>
          <div class="card-body">
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-secondary" id="export-data-btn">${icon('download')} Export All Data (JSON)</button>
              <button class="btn btn-danger" id="clear-all-btn">${icon('trash')} Clear All Data</button>
            </div>
            <p class="help-text" style="margin-top:8px">All data is stored locally on this device. Export regularly to back up your records.</p>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end">
          <button class="btn btn-primary btn-lg" id="save-settings-btn">${icon('check')} Save Settings</button>
        </div>

      </div>
    </div>
  `;

  // ── Build category settings list ──
  buildCategorySettingsList();

  // Logo upload
  const logoInput = document.getElementById('logo-file-input');
  const logoPreview = document.getElementById('logo-preview');

  document.getElementById('logo-upload-btn')?.addEventListener('click', () => logoInput.click());
  logoPreview?.addEventListener('click', () => logoInput.click());

  logoInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Logo must be under 2MB', 'error'); return; }
    const { fileToBase64 } = await import('./utils.js');
    App.project.logo = await fileToBase64(file);
    logoPreview.innerHTML = `<img src="${App.project.logo}" alt="Logo">`;
    toast('Logo uploaded', 'success');
  });

  document.getElementById('logo-clear-btn')?.addEventListener('click', () => {
    App.project.logo = null;
    logoPreview.innerHTML = `<div class="logo-placeholder">${icon('camera')}<br>Upload</div>`;
  });

  // Save settings
  document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    App.project = {
      ...App.project,
      name:          document.getElementById('set-name').value.trim(),
      number:        document.getElementById('set-number').value.trim(),
      address:       document.getElementById('set-address').value.trim(),
      client:        document.getElementById('set-client').value.trim(),
      contractor:    document.getElementById('set-contractor').value.trim(),
      observerFirst: document.getElementById('set-observer-first').value.trim(),
      observerLast:  document.getElementById('set-observer-last').value.trim(),
      approvalRef:   document.getElementById('set-approval').value.trim(),
      reportTitle:   document.getElementById('set-report-title').value.trim() || 'Environmental Monitoring Report',
      reportSubtitle: document.getElementById('set-report-subtitle').value.trim() || 'Construction Site Environmental Inspection',
    };
    await setSetting('project', App.project);

    // Save category settings
    await setSetting('categorySettings', App.categorySettings);
    applyCategorySettings();

    updateSidebarProject();
    toast('Settings saved', 'success');
  });

  // Export data
  document.getElementById('export-data-btn')?.addEventListener('click', async () => {
    const { getAllEntries } = await import('./db.js');
    const { downloadText } = await import('./utils.js');
    const entries = await getAllEntries();
    const data = { project: App.project, entries, exportedAt: new Date().toISOString() };
    downloadText(JSON.stringify(data, null, 2), `envirolog-export-${today()}.json`, 'application/json');
    toast('Data exported', 'success');
  });

  // Clear data
  document.getElementById('clear-all-btn')?.addEventListener('click', () => {
    confirmDialog(
      'Clear All Data',
      'This will permanently delete all entries. This cannot be undone. Are you sure?',
      async () => {
        const db = await openDB();
        const tx = db.transaction(['entries', 'settings'], 'readwrite');
        tx.objectStore('entries').clear();
        tx.objectStore('settings').clear();
        App.project = { ...DEFAULT_PROJECT };
        App.categorySettings = getDefaultCategorySettings();
        applyCategorySettings();
        updateSidebarProject();
        toast('All data cleared', 'warning');
        navigate('dashboard');
      },
      'Delete Everything',
      'btn-danger'
    );
  });
}

// ── Category Settings List Builder ────────────────────────

function buildCategorySettingsList() {
  const list = document.getElementById('category-settings-list');
  if (!list) return;

  list.innerHTML = '';

  OBSERVATION_TYPES.forEach((type, idx) => {
    const cs = App.categorySettings[type.id] || { visible: true, prompts: null };
    const effectivePrompts = (cs.prompts && cs.prompts.length > 0) ? cs.prompts : [...type._defaultPrompts];
    const isVisible = cs.visible !== false;
    const isLast = idx === OBSERVATION_TYPES.length - 1;

    const row = document.createElement('div');
    row.className = 'cat-setting-row';
    row.style.cssText = `border-bottom:${isLast ? 'none' : '1px solid var(--slate-100)'}`;

    row.innerHTML = `
      <div class="cat-row-header">
        <label class="cat-toggle" title="${isVisible ? 'Shown on dashboard' : 'Hidden from dashboard'}">
          <input type="checkbox" class="cat-visibility-check" data-type="${type.id}" ${isVisible ? 'checked' : ''}>
          <span class="cat-toggle-track"></span>
        </label>
        <span class="cat-color-dot" style="background:${type.color}"></span>
        <span class="cat-name" style="${isVisible ? '' : 'opacity:0.45;text-decoration:line-through'}">${sanitizeHtml(type.label)}</span>
        <button class="btn btn-ghost btn-sm cat-edit-btn" data-type="${type.id}" style="margin-left:auto;font-size:12px">
          Edit Checklist
        </button>
      </div>
      <div class="cat-checklist-panel" id="cat-panel-${type.id}" style="display:none">
        <div class="cat-prompts-list" id="cat-prompts-${type.id}">
          ${effectivePrompts.map((p, i) => `
            <div class="cat-prompt-row" data-idx="${i}">
              <input type="text" class="cat-prompt-input" value="${sanitizeHtml(p)}" placeholder="Checklist item…">
              <button class="cat-prompt-remove btn btn-ghost btn-sm" title="Remove item">${icon('x')}</button>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px;padding:8px 16px 12px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm cat-add-prompt-btn" data-type="${type.id}">
            ${icon('plus')} Add Item
          </button>
          <button class="btn btn-ghost btn-sm cat-reset-prompts-btn" data-type="${type.id}" style="color:var(--slate-400)">
            Reset to Defaults
          </button>
        </div>
      </div>
    `;

    list.appendChild(row);

    // Visibility toggle
    const check = row.querySelector('.cat-visibility-check');
    check.addEventListener('change', () => {
      if (!App.categorySettings[type.id]) App.categorySettings[type.id] = { visible: true, prompts: null };
      App.categorySettings[type.id].visible = check.checked;
      const nameEl = row.querySelector('.cat-name');
      nameEl.style.opacity = check.checked ? '' : '0.45';
      nameEl.style.textDecoration = check.checked ? '' : 'line-through';
    });

    // Edit checklist toggle
    const editBtn = row.querySelector('.cat-edit-btn');
    const panel = row.querySelector(`#cat-panel-${type.id}`);
    editBtn.addEventListener('click', () => {
      const isOpen = panel.style.display !== 'none';
      panel.style.display = isOpen ? 'none' : 'block';
      editBtn.textContent = isOpen ? 'Edit Checklist' : 'Done';
    });

    // Add prompt
    const addBtn = row.querySelector('.cat-add-prompt-btn');
    addBtn.addEventListener('click', () => {
      const promptsList = row.querySelector(`#cat-prompts-${type.id}`);
      const newRow = document.createElement('div');
      newRow.className = 'cat-prompt-row';
      newRow.innerHTML = `
        <input type="text" class="cat-prompt-input" value="" placeholder="New checklist item…">
        <button class="cat-prompt-remove btn btn-ghost btn-sm" title="Remove item">${icon('x')}</button>
      `;
      promptsList.appendChild(newRow);
      newRow.querySelector('input').focus();
      newRow.querySelector('.cat-prompt-remove').addEventListener('click', () => newRow.remove());
      savePromptsToState(type.id, row);
    });

    // Remove prompt handlers
    row.querySelectorAll('.cat-prompt-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.cat-prompt-row').remove();
        savePromptsToState(type.id, row);
      });
    });

    // Auto-save on input change
    row.querySelectorAll('.cat-prompt-input').forEach(input => {
      input.addEventListener('input', () => savePromptsToState(type.id, row));
    });

    // Reset to defaults
    const resetBtn = row.querySelector('.cat-reset-prompts-btn');
    resetBtn.addEventListener('click', () => {
      const promptsList = row.querySelector(`#cat-prompts-${type.id}`);
      promptsList.innerHTML = type._defaultPrompts.map((p, i) => `
        <div class="cat-prompt-row" data-idx="${i}">
          <input type="text" class="cat-prompt-input" value="${sanitizeHtml(p)}" placeholder="Checklist item…">
          <button class="cat-prompt-remove btn btn-ghost btn-sm" title="Remove item">${icon('x')}</button>
        </div>
      `).join('');

      // Re-attach remove handlers
      promptsList.querySelectorAll('.cat-prompt-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.closest('.cat-prompt-row').remove();
          savePromptsToState(type.id, row);
        });
      });
      promptsList.querySelectorAll('.cat-prompt-input').forEach(input => {
        input.addEventListener('input', () => savePromptsToState(type.id, row));
      });

      if (!App.categorySettings[type.id]) App.categorySettings[type.id] = { visible: true, prompts: null };
      App.categorySettings[type.id].prompts = null;
      toast(`${type.label} checklist reset`, 'success');
    });
  });
}

function savePromptsToState(typeId, rowEl) {
  const inputs = rowEl.querySelectorAll('.cat-prompt-input');
  const prompts = [...inputs].map(i => i.value.trim()).filter(Boolean);
  if (!App.categorySettings[typeId]) App.categorySettings[typeId] = { visible: true, prompts: null };
  App.categorySettings[typeId].prompts = prompts.length > 0 ? prompts : null;
}

// ── Entry Card (shared component) ─────────────────────────

export function createEntryCard(entry, { navigate, compact = false, onDelete, onDuplicate } = {}) {
  const type = getType(entry.type);
  const status = getStatus(entry.status);

  const card = document.createElement('div');
  card.className = 'entry-card animate-in';
  card.dataset.entryId = entry.id;

  const photos = (entry.photos || []).slice(0, 4);
  const extraPhotos = (entry.photos || []).length - 4;
  const hasLocation = entry.location?.lat && entry.location?.lng;

  const mediaHtml = photos.length > 0 ? `
    <div class="entry-card-media">
      ${photos.map((src, i) => {
        const isVid = src.startsWith('data:video');
        if (isVid) {
          return `<div class="video-thumb-wrapper">
            <video class="entry-thumb" src="${src}" preload="metadata" muted></video>
            <div class="video-play-icon">${icon('video')}</div>
          </div>`;
        }
        if (i === 3 && extraPhotos > 0) {
          return `<div class="entry-thumb-more" data-idx="${i}">+${extraPhotos + 1}</div>`;
        }
        return `<img class="entry-thumb" src="${src}" alt="Photo ${i+1}" loading="lazy" data-idx="${i}">`;
      }).join('')}
    </div>
  ` : '';

  const locationHtml = hasLocation ? `
    <div class="entry-card-location">
      ${icon('map-pin')}
      <span>${entry.location.lat.toFixed(6)}, ${entry.location.lng.toFixed(6)}</span>
      ${entry.location.address ? `<span style="color:var(--slate-300)">·</span><span>${sanitizeHtml(entry.location.address)}</span>` : ''}
    </div>
  ` : '';

  const correctiveHtml = entry.correctiveActions ? `
    <div class="entry-corrective">
      <strong>${icon('alert')} Corrective Action Required</strong>
      ${sanitizeHtml(entry.correctiveActions)}
    </div>
  ` : '';

  const tagsHtml = (entry.tags || []).length > 0 ? `
    <div class="entry-tags">
      ${entry.tags.map(t => `<span class="tag">${sanitizeHtml(t)}</span>`).join('')}
    </div>
  ` : '<div></div>';

  const followUpHtml = entry.followUpRequired ? `
    <span class="followup-badge">${icon('calendar')} Follow-up</span>
  ` : '';

  card.innerHTML = `
    <div class="entry-card-header">
      <div class="entry-type-indicator" style="background:${type.color}"></div>
      <div class="entry-meta">
        <div class="entry-meta-row">
          <span class="entry-type-label" style="color:${type.color}">${sanitizeHtml(type.label)}</span>
          <div style="display:flex;align-items:center;gap:6px">
            ${(entry.observer || entry.inspector) ? `<span class="inspector-badge">${sanitizeHtml(entry.observer || entry.inspector)}</span>` : ''}
            ${entry.entryCode ? `<span class="inspector-badge" style="font-family:monospace;letter-spacing:0.3px">${sanitizeHtml(entry.entryCode)}</span>` : ''}
            <span class="entry-time">${formatTime(entry.time)}</span>
          </div>
        </div>
        <div class="entry-meta-row">
          <div class="entry-title">${sanitizeHtml(entry.title || 'Untitled Entry')}</div>
          <span class="badge badge-${entry.status}" style="background:${status.bg};color:${status.color}">${sanitizeHtml(status.label)}</span>
        </div>
        ${followUpHtml}
      </div>
    </div>
    ${entry.description ? `<div class="entry-description">${sanitizeHtml(entry.description)}</div>` : ''}
    ${mediaHtml}
    ${locationHtml}
    ${correctiveHtml}
    <div class="entry-card-footer">
      ${tagsHtml}
      <div class="entry-actions">
        <button class="entry-action-btn" title="Edit" data-action="edit">${icon('edit')}</button>
        <button class="entry-action-btn" title="Duplicate" data-action="duplicate">${icon('copy')}</button>
        <button class="entry-action-btn danger" title="Delete" data-action="delete">${icon('trash')}</button>
      </div>
    </div>
  `;

  // Media click handlers
  card.querySelectorAll('.entry-thumb, .entry-thumb-more').forEach((el, i) => {
    el.addEventListener('click', () => {
      const allMedia = [...(entry.photos || []), ...(entry.videos || [])];
      if (allMedia[i]) {
        const { openLightbox } = import('./utils.js').then(m => m.openLightbox(allMedia[i], `${type.label} — ${formatTime(entry.time)}`));
      }
    });
  });

  // Action buttons
  card.querySelector('[data-action="edit"]')?.addEventListener('click', e => {
    e.stopPropagation();
    navigate('edit-entry', { id: entry.id });
  });

  card.querySelector('[data-action="duplicate"]')?.addEventListener('click', async e => {
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(entry);
    } else {
      const { uuid, today: todayFn, nowTime } = await import('./utils.js');
      const { saveEntry, getNextOrder } = await import('./db.js');
      const newOrder = await getNextOrder(todayFn());
      const dup = {
        ...entry,
        id: uuid(),
        date: todayFn(),
        time: nowTime(),
        order: newOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveEntry(dup);
      toast('Entry duplicated to today', 'success');
      navigate('library');
    }
  });

  card.querySelector('[data-action="delete"]')?.addEventListener('click', e => {
    e.stopPropagation();
    confirmDialog(
      'Delete Entry',
      `Delete "${entry.title || 'this entry'}"? This cannot be undone.`,
      async () => {
        const { deleteEntry } = await import('./db.js');
        await deleteEntry(entry.id);
        card.style.opacity = '0';
        card.style.transform = 'translateY(-4px)';
        card.style.transition = '200ms ease';
        setTimeout(() => {
          card.remove();
          if (onDelete) onDelete(entry.id);
        }, 200);
        toast('Entry deleted', 'warning');
      }
    );
  });

  return card;
}

// ── Global Event Listeners ────────────────────────────────

function setupGlobalEventListeners() {
  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Lightbox close
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLightbox();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeLightbox(); }
    if (e.key === 'n' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); navigate('new-entry'); }
  });

  // Media click delegation (lightbox)
  document.addEventListener('click', e => {
    const thumb = e.target.closest('.entry-thumb');
    if (thumb) {
      const card = thumb.closest('.entry-card');
      if (!card) return;
      const idx = thumb.dataset.idx ? parseInt(thumb.dataset.idx) : 0;
      // Try to get the src from the img or video element
      const src = thumb.src || thumb.querySelector('source')?.src || '';
      if (src) {
        const { openLightbox: lb } = { openLightbox: null };
        import('./utils.js').then(m => m.openLightbox(src, ''));
      }
    }
  });
}

// ── Online Status ─────────────────────────────────────────

function watchOnlineStatus() {
  const badge = document.getElementById('offline-badge');

  const update = () => {
    if (badge) badge.classList.toggle('hidden', navigator.onLine);
  };

  update();
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

// ── Start ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', boot);
