// ════════════════════════════════════════════════════════════
//  EnviroLog — Report Generation (PDF, Markdown, HTML)
// ════════════════════════════════════════════════════════════

import { OBSERVATION_TYPES, STATUS_TYPES, getType, getStatus } from './config.js';
import { getAllEntries, getEntriesByDateRange, getSetting } from './db.js';
import { today, formatDate, formatDateShort, formatTime, sanitizeHtml,
         icon, toast, downloadText, downloadBlob, groupBy } from './utils.js';

// ── Reports View ──────────────────────────────────────────

export async function renderReports({ container, navigate }) {
  const allEntries = await getAllEntries();
  const project = await getSetting('project', {});

  const minDate = allEntries.length > 0 ? allEntries[0].date : today();
  const maxDate = allEntries.length > 0 ? allEntries[allEntries.length - 1].date : today();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Reports</div>
        <div class="page-subtitle">Generate inspection reports from your entries</div>
      </div>
    </div>
    <div class="page-body animate-in">

      <div class="report-config">

        <!-- Left: Config -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <div class="card">
            <div class="card-header"><span class="card-title report-card-title">${icon('calendar')} Date Range</span></div>
            <div class="card-body">
              <div class="date-range-inputs">
                <div class="form-group">
                  <label>From</label>
                  <input type="date" id="rep-date-from" value="${minDate}" max="${maxDate}">
                </div>
                <div class="form-group">
                  <label>To</label>
                  <input type="date" id="rep-date-to" value="${maxDate}" max="${today()}">
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
                <button class="btn btn-secondary btn-sm" data-range="today">Today</button>
                <button class="btn btn-secondary btn-sm" data-range="week">This Week</button>
                <button class="btn btn-secondary btn-sm" data-range="month">This Month</button>
                <button class="btn btn-secondary btn-sm" data-range="all">All Time</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title report-card-title">${icon('filter')} Filter by Type</span></div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:6px" id="type-checkboxes">
                <label style="font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px">
                  <input type="checkbox" id="rep-all-types" checked style="width:auto"> <strong>All Types</strong>
                </label>
                <div class="divider"></div>
                ${OBSERVATION_TYPES.map(t => `
                  <label style="font-size:13px;font-weight:400;cursor:pointer;display:flex;align-items:center;gap:8px" class="type-filter-row">
                    <input type="checkbox" class="rep-type-check" data-type="${t.id}" checked style="width:auto">
                    <span class="type-dot" style="background:${t.color};flex-shrink:0"></span>
                    ${sanitizeHtml(t.label)}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title report-card-title">${icon('filter')} Filter by Status</span></div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:6px">
                ${STATUS_TYPES.map(s => `
                  <label style="font-size:13px;font-weight:400;cursor:pointer;display:flex;align-items:center;gap:8px">
                    <input type="checkbox" class="rep-status-check" data-status="${s.id}" checked style="width:auto">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
                    ${sanitizeHtml(s.label)}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title report-card-title">${icon('settings')} Options</span></div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:8px">
                <label style="font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px">
                  <input type="checkbox" id="rep-include-photos" checked style="width:auto"> Include photos in report
                </label>
                <label style="font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px">
                  <input type="checkbox" id="rep-include-maps" checked style="width:auto"> Include map coordinates
                </label>
                <label style="font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px">
                  <input type="checkbox" id="rep-include-corrective" checked style="width:auto"> Include corrective actions summary
                </label>
              </div>
            </div>
          </div>

        </div>

        <!-- Right: Format + Preview -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <div class="card">
            <div class="card-header"><span class="card-title report-card-title">${icon('file')} Export Format</span></div>
            <div class="card-body">
              <div class="format-grid">
                <div class="format-card selected" data-format="pdf">
                  <div class="format-icon-sm">PDF</div>
                  <div class="format-label">PDF</div>
                  <div class="format-desc">Professional printable report</div>
                </div>
                <div class="format-card" data-format="html">
                  <div class="format-icon-sm">HTML</div>
                  <div class="format-label">HTML</div>
                  <div class="format-desc">Shareable web page</div>
                </div>
                <div class="format-card" data-format="markdown">
                  <div class="format-icon-sm">MD</div>
                  <div class="format-label">Markdown</div>
                  <div class="format-desc">Plain text with formatting</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title report-card-title">${icon('layers')} Preview</span></div>
            <div class="card-body">
              <div class="report-preview" id="report-preview">
                <div style="color:var(--slate-400);font-size:13px;text-align:center;padding:20px 0">
                  Configure your report options, then click "Preview" to see a summary.
                </div>
              </div>
              <div class="generate-actions">
                <button class="btn btn-secondary" id="rep-preview-btn">${icon('search')} Preview</button>
                <button class="btn btn-primary btn-lg" id="rep-generate-btn">${icon('download')} Generate Report</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  let selectedFormat = 'pdf';

  // Format selection
  document.querySelectorAll('.format-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.format-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedFormat = card.dataset.format;
    });
  });

  // Quick date ranges
  document.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      const from = document.getElementById('rep-date-from');
      const to = document.getElementById('rep-date-to');
      const d = new Date();

      to.value = today();
      switch (btn.dataset.range) {
        case 'today':
          from.value = today();
          break;
        case 'week': {
          const w = new Date(d);
          w.setDate(d.getDate() - d.getDay());
          from.value = w.toISOString().split('T')[0];
          break;
        }
        case 'month': {
          from.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        }
        case 'all':
          from.value = minDate;
          to.value = maxDate || today();
          break;
      }
    });
  });

  // All types toggle
  document.getElementById('rep-all-types')?.addEventListener('change', e => {
    document.querySelectorAll('.rep-type-check').forEach(c => { c.checked = e.target.checked; });
  });

  // Individual type changes
  document.querySelectorAll('.rep-type-check').forEach(c => {
    c.addEventListener('change', () => {
      const all = document.querySelectorAll('.rep-type-check');
      const checked = [...all].filter(x => x.checked);
      document.getElementById('rep-all-types').checked = checked.length === all.length;
    });
  });

  // Collect filter state
  const getFilters = () => ({
    dateFrom:         document.getElementById('rep-date-from')?.value,
    dateTo:           document.getElementById('rep-date-to')?.value,
    types:            [...document.querySelectorAll('.rep-type-check:checked')].map(c => c.dataset.type),
    statuses:         [...document.querySelectorAll('.rep-status-check:checked')].map(c => c.dataset.status),
    includePhotos:    document.getElementById('rep-include-photos')?.checked,
    includeMaps:      document.getElementById('rep-include-maps')?.checked,
    includeCorrective: document.getElementById('rep-include-corrective')?.checked,
  });

  const getFilteredEntries = async (filters) => {
    const entries = await getEntriesByDateRange(filters.dateFrom, filters.dateTo);
    return entries.filter(e =>
      filters.types.includes(e.type) && filters.statuses.includes(e.status)
    );
  };

  // Preview
  document.getElementById('rep-preview-btn')?.addEventListener('click', async () => {
    const filters = getFilters();
    const entries = await getFilteredEntries(filters);
    renderPreview(entries, filters, project);
  });

  // Generate
  document.getElementById('rep-generate-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('rep-generate-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Generating…`;

    const filters = getFilters();
    const entries = await getFilteredEntries(filters);

    if (entries.length === 0) {
      toast('No entries match your filter criteria', 'warning');
      btn.disabled = false;
      btn.innerHTML = `${icon('download')} Generate Report`;
      return;
    }

    try {
      switch (selectedFormat) {
        case 'pdf':      await generatePDF(entries, filters, project); break;
        case 'html':     generateHTML(entries, filters, project); break;
        case 'markdown': generateMarkdown(entries, filters, project); break;
      }
      toast('Report generated successfully', 'success');
    } catch (err) {
      toast('Report generation failed: ' + err.message, 'error');
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('download')} Generate Report`;
    }
  });
}

// ── Preview ───────────────────────────────────────────────

function renderPreview(entries, filters, project) {
  const preview = document.getElementById('report-preview');
  if (!preview) return;

  if (entries.length === 0) {
    preview.innerHTML = `<div style="color:var(--red-600);text-align:center;padding:20px">No entries match the selected filters.</div>`;
    return;
  }

  const byStatus = groupBy(entries, 'status');
  const byType   = groupBy(entries, 'type');
  const dates    = [...new Set(entries.map(e => e.date))].sort();

  preview.innerHTML = `
    <div style="font-size:13px;line-height:1.7">
      <div style="font-weight:700;font-size:15px;margin-bottom:8px">${sanitizeHtml(project.name || 'Environmental Monitoring Report')}</div>
      <div style="color:var(--slate-500);margin-bottom:12px">
        ${formatDateShort(filters.dateFrom)} — ${formatDateShort(filters.dateTo)}
        &nbsp;·&nbsp; ${entries.length} entries across ${dates.length} day${dates.length !== 1 ? 's' : ''}
      </div>
      <div class="divider"></div>
      <div style="margin:10px 0">
        <div style="font-weight:600;margin-bottom:6px">Status Summary</div>
        ${STATUS_TYPES.map(s => {
          const count = (byStatus[s.id] || []).length;
          const pct = entries.length > 0 ? Math.round(count / entries.length * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
            <span style="flex:1">${sanitizeHtml(s.label)}</span>
            <span style="font-weight:600">${count}</span>
            <span style="color:var(--slate-400);font-size:11px">${pct}%</span>
          </div>`;
        }).join('')}
      </div>
      <div class="divider"></div>
      <div style="margin:10px 0">
        <div style="font-weight:600;margin-bottom:6px">Top Observation Types</div>
        ${Object.entries(byType).sort((a,b) => b[1].length - a[1].length).slice(0, 5).map(([typeId, ents]) => {
          const type = getType(typeId);
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${type.color};flex-shrink:0"></span>
            <span style="flex:1">${sanitizeHtml(type.label)}</span>
            <span style="font-weight:600">${ents.length}</span>
          </div>`;
        }).join('')}
      </div>
      ${entries.some(e => e.followUpRequired) ? `
        <div class="divider"></div>
        <div style="margin:10px 0;color:var(--amber-600)">
          ${icon('alert')} <strong>${entries.filter(e => e.followUpRequired).length}</strong> entries require follow-up
        </div>
      ` : ''}
    </div>
  `;
}

// ── PDF Report ────────────────────────────────────────────

async function generatePDF(entries, filters, project) {
  if (!window.jspdf) throw new Error('jsPDF not loaded');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // Palette
  const black    = [0, 0, 0];
  const charcoal = [30, 41, 59];
  const slate700 = [51, 65, 85];
  const slate900 = [15, 23, 42];
  const slate600 = [71, 85, 105];
  const slate400 = [148, 163, 184];
  const slate200 = [226, 232, 240];
  const slate50  = [248, 250, 252];
  const white    = [255, 255, 255];

  // Muted status colours (text only — used for tinted badges)
  const statusTextColors = {
    'compliant':     [22, 101, 52],   // green-800
    'non-compliant': [153, 27, 27],   // red-800
    'advisory':      [146, 64, 14],   // amber-800
    'observation':   [30, 64, 175],   // blue-800
  };
  const statusBgColors = {
    'compliant':     [240, 253, 244],  // green-50
    'non-compliant': [254, 242, 242],  // red-50
    'advisory':      [255, 251, 235],  // amber-50
    'observation':   [239, 246, 255],  // blue-50
  };

  // Keep for backward compat (used in autoTable didParseCell)
  const statusColors = {
    'compliant':     statusTextColors['compliant'],
    'non-compliant': statusTextColors['non-compliant'],
    'advisory':      statusTextColors['advisory'],
    'observation':   statusTextColors['observation'],
  };

  let page = 1;
  let y = MARGIN;
  const pagesWithFooter = new Set();

  const addPageFooter = () => {
    const p = doc.internal.getCurrentPageInfo().pageNumber;
    if (pagesWithFooter.has(p)) return;
    pagesWithFooter.add(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...slate400);
    doc.text(`${sanitizeHtml(project.name || 'Environmental Monitoring')} — Page ${p}`, MARGIN, PAGE_H - 7);
    doc.text(`Generated ${new Date().toLocaleString('en-AU')}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' });
    doc.setTextColor(...slate900);
  };

  const newPage = () => {
    addPageFooter();   // footer on current page before turning
    doc.addPage();
    page++;
    y = MARGIN;
  };

  const checkY = (needed = 20) => {
    // Cap so a single block never infinitely loops
    if (y + Math.min(needed, PAGE_H - MARGIN * 3) > PAGE_H - 22) newPage();
  };

  // Helper: render multi-line text with automatic page breaks
  const renderText = (lines, x, lineH = 4.5) => {
    let i = 0;
    while (i < lines.length) {
      const avail = Math.max(1, Math.floor((PAGE_H - 22 - y) / lineH));
      const chunk = lines.slice(i, i + avail);
      doc.text(chunk, x, y);
      y += chunk.length * lineH;
      i += chunk.length;
      if (i < lines.length) newPage();
    }
  };

  // ── Pre-fetch static map images ──
  const mapImages = {};
  if (filters.includeMaps) {
    const withLoc = entries.filter(e => e.location?.lat);
    for (const e of withLoc) {
      try {
        const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${e.location.lat},${e.location.lng}&zoom=16&size=400x200&markers=${e.location.lat},${e.location.lng},red-pushpin`;
        const resp = await fetch(mapUrl, { signal: AbortSignal.timeout(6000) });
        if (resp.ok) {
          const blob = await resp.blob();
          mapImages[e.id] = await new Promise(res => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch { /* offline or timeout — skip map */ }
    }
  }

  // ── Pre-render status icons as white PNG data URLs via canvas ──
  const statusIconPaths = {
    'compliant':     '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'non-compliant': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    'advisory':      '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'observation':   '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  };
  const iconPngs = {};
  await Promise.all(
    Object.entries(statusIconPaths).map(([id, paths]) =>
      new Promise(resolve => {
        const size = 64;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
        const img = new Image();
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          canvas.getContext('2d').drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          iconPngs[id] = canvas.toDataURL('image/png');
          resolve();
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        img.src = url;
      })
    )
  );

  // ── Cover Page ──
  const reportTitle = project.reportTitle || 'Environmental Monitoring Report';
  const reportSubtitle = project.reportSubtitle || 'Construction Site Environmental Inspection';

  // Black header — 26mm (50% of original 52mm)
  doc.setFillColor(...black);
  doc.rect(0, 0, PAGE_W, 26, 'F');

  // Logo (scaled to fit in 26mm header)
  if (project.logo) {
    try {
      const ext = project.logo.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(project.logo, ext, MARGIN, 5, 16, 16);
    } catch {}
  }

  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titleX = project.logo ? MARGIN + 20 : MARGIN;
  doc.text(reportTitle, titleX, 14);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);  // slate-400
  doc.text(reportSubtitle, titleX, 22);

  doc.setTextColor(...slate900);

  // Push y below the black header
  y = 30;

  // ── Report Period & Total Entries — small pills directly below header ──
  const pillH = 15;
  const halfW = CONTENT_W / 2 - 3;

  doc.setFillColor(...slate50);
  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, halfW, pillH, 2, 2, 'FD');
  doc.setTextColor(...slate400);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT PERIOD', MARGIN + 4, y + 5.5);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate700);
  doc.text(`${formatDateShort(filters.dateFrom)} — ${formatDateShort(filters.dateTo)}`, MARGIN + 4, y + 12);

  doc.setFillColor(...slate50);
  doc.setDrawColor(...slate200);
  doc.roundedRect(MARGIN + halfW + 6, y, halfW, pillH, 2, 2, 'FD');
  doc.setTextColor(...slate400);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ENTRIES', MARGIN + halfW + 10, y + 5.5);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...charcoal);
  doc.text(String(entries.length), MARGIN + halfW + 10, y + 13.5);

  y += pillH + 5;

  // ── Two-column: Project Info (left) | Status Summary (right) ──
  const leftW  = 113;
  const gapW   = 5;
  const rightW = CONTENT_W - leftW - gapW;
  const rightX = MARGIN + leftW + gapW;

  // Status counts (needed for both columns)
  const statusCounts = {};
  STATUS_TYPES.forEach(s => { statusCounts[s.id] = 0; });
  entries.forEach(e => { if (statusCounts[e.status] !== undefined) statusCounts[e.status]++; });

  // Right column: Status summary (vertical stack) — draw first to know height
  const cardH = 13;
  const cardGap = 2.5;
  const statusStackH = 9 + STATUS_TYPES.length * (cardH + cardGap) - cardGap;

  const projBoxH = Math.max(66, statusStackH);

  // Left column: Project Info box
  doc.setFillColor(...white);
  doc.setDrawColor(...slate200);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, leftW, projBoxH, 3, 3, 'FD');

  const details = [
    ['Project',      project.name || '—'],
    ['Project No.',  project.number || '—'],
    ['Site Address', project.address || '—'],
    ['Client',       project.client || '—'],
    ['Contractor',   project.contractor || '—'],
  ];

  const col1X = MARGIN + 5;
  const col2X = MARGIN + 43;
  let detY = y + 9;

  details.forEach(([label, value]) => {
    if (detY > y + projBoxH - 5) return;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate400);
    doc.text(label.toUpperCase(), col1X, detY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate700);
    doc.text(String(value).slice(0, 48), col2X, detY);
    detY += (projBoxH - 9) / details.length;
  });

  // Right column: Status stack
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate400);
  doc.text('STATUS SUMMARY', rightX, y + 5.5);

  const tabW = 14; // wider tab with icon
  const tabR = 2;  // corner radius — matches enclosing card

  let sy = y + 9;
  STATUS_TYPES.forEach(s => {
    const bg  = statusBgColors[s.id]   || slate50;
    const txt = statusTextColors[s.id] || slate700;

    // Card background
    doc.setFillColor(...bg);
    doc.setDrawColor(...txt);
    doc.setLineWidth(0.35);
    doc.roundedRect(rightX, sy, rightW, cardH, tabR, tabR, 'FD');

    // Left accent tab — rounded on left side only:
    //   1. Draw full rounded rect (all corners rounded)
    doc.setFillColor(...txt);
    doc.roundedRect(rightX, sy, tabW, cardH, tabR, tabR, 'F');
    //   2. Fill a plain rect over the right portion to square off those corners
    doc.rect(rightX + tabW - tabR, sy, tabR, cardH, 'F');

    // Icon centred inside the tab
    if (iconPngs[s.id]) {
      try {
        const iconSize = cardH - 4;
        doc.addImage(
          iconPngs[s.id], 'PNG',
          rightX + (tabW - iconSize) / 2, sy + 2,
          iconSize, iconSize,
          undefined, 'NONE'
        );
      } catch {}
    }

    // Status label — left of content area, after tab
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...txt);
    doc.text(s.label, rightX + tabW + 3, sy + cardH / 2 + 2.5);

    // Count — right-aligned
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(String(statusCounts[s.id]), rightX + rightW - 4, sy + cardH / 2 + 3.5, { align: 'right' });

    sy += cardH + cardGap;
  });

  y += projBoxH + 8;

  // ── Summary Table — on cover page, auto-continues if needed ──
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate400);
  doc.text('ENTRIES SUMMARY', MARGIN, y);
  y += 5;

  doc.autoTable({
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['ID', 'Date', 'Time', 'Type', 'Title', 'Status', 'Observer']],
    body: entries.map(e => [
      e.entryCode || '—',
      formatDateShort(e.date),
      formatTime(e.time),
      getType(e.type).label,
      (e.title || 'Untitled').slice(0, 35),
      getStatus(e.status).label,
      e.observer || e.inspector || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 3, textColor: slate700 },
    headStyles: { fillColor: charcoal, textColor: white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: slate50 },
    columnStyles: {
      0: { cellWidth: 28, font: 'courier', fontSize: 7 },
      1: { cellWidth: 20 },
      2: { cellWidth: 13 },
      3: { cellWidth: 28 },
      4: { cellWidth: 48 },
      5: { cellWidth: 22 },
      6: { cellWidth: 15 },
    },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === 'body') {
        const status = STATUS_TYPES.find(s => s.label === data.cell.raw);
        if (status) {
          data.cell.styles.textColor = statusColors[status.id] || slate700;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => { page = data.pageNumber; addPageFooter(); },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Detailed Entries — one page per entry ──
  const grouped = groupBy(entries, 'date');
  const sortedDates = Object.keys(grouped).sort();

  // Helper: draw the date header band (repeated at top of each entry page)
  const drawDateBand = (date, totalForDate) => {
    doc.setFillColor(...charcoal);
    doc.rect(MARGIN, y, 3, 9, 'F');
    doc.setFillColor(...slate50);
    doc.setDrawColor(...slate200);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN + 3, y, CONTENT_W - 3, 9, 'FD');
    doc.setTextColor(...charcoal);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(date), MARGIN + 8, y + 6.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate400);
    doc.setFontSize(8);
    doc.text(`${totalForDate} entr${totalForDate === 1 ? 'y' : 'ies'}`, PAGE_W - MARGIN - 3, y + 6.2, { align: 'right' });
    y += 13;
  };

  // Helper: draw a section divider with label
  const drawSectionRule = (label) => {
    y += 4;
    doc.setDrawColor(...slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 4;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate400);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 5;
  };

  for (const date of sortedDates) {
    const dayEntries = grouped[date].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const entry of dayEntries) {
      newPage();
      drawDateBand(date, dayEntries.length);

      const type = getType(entry.type);
      const status = getStatus(entry.status);
      const typeRgb = type.color.match(/\w\w/g)?.map(x => parseInt(x, 16)) || charcoal;
      const observer = entry.observer || entry.inspector || '';

      // Build conditions string
      const conditionsParts = [
        entry.weather,
        entry.temperature != null ? `${entry.temperature}°C` : null,
        entry.windDirection ? `Wind: ${entry.windDirection}` : null,
      ].filter(Boolean);
      const hasConditions = conditionsParts.length > 0;
      const hasLocation = entry.location?.lat;

      // Calculate entry header height dynamically
      const headerH = 20 + (hasConditions ? 6 : 0) + (hasLocation ? 6 : 0);

      checkY(headerH + 4);

      // Entry header box
      doc.setFillColor(...white);
      doc.setDrawColor(...slate200);
      doc.setLineWidth(0.25);
      doc.roundedRect(MARGIN, y, CONTENT_W, headerH, 2, 2, 'FD');
      // Left accent stripe
      doc.setFillColor(...typeRgb);
      doc.roundedRect(MARGIN, y, 3.5, headerH, 1, 1, 'F');

      const hx = MARGIN + 7; // text start x inside header
      let hy = y + 6;

      // Row 1: Type label (left) | Entry Code (right, monospace)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...typeRgb);
      doc.text(type.label.toUpperCase(), hx, hy);

      if (entry.entryCode) {
        doc.setFont('courier', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...slate600);
        doc.text(entry.entryCode, PAGE_W - MARGIN - 5, hy, { align: 'right' });
      }
      hy += 6;

      // Row 2: Title (left) | Status badge (right)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...slate900);
      const titleMaxW = CONTENT_W - 40;
      const titleLine = doc.splitTextToSize(entry.title || 'Untitled Entry', titleMaxW)[0];
      doc.text(titleLine, hx, hy);

      const statusBg = statusBgColors[entry.status] || slate50;
      const statusTxt = statusTextColors[entry.status] || slate700;
      doc.setFillColor(...statusBg);
      doc.setDrawColor(...statusTxt);
      doc.setLineWidth(0.3);
      doc.roundedRect(PAGE_W - MARGIN - 32, y + 3.5, 29, 7, 1.5, 1.5, 'FD');
      doc.setTextColor(...statusTxt);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(status.label.toUpperCase(), PAGE_W - MARGIN - 17.5, y + 7.8, { align: 'center' });
      hy += 7;

      // Row 3: Observer · Time
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...slate600);
      const observerTimeParts = [
        observer ? `Observer: ${observer}` : null,
        entry.time ? formatTime(entry.time) : null,
      ].filter(Boolean);
      doc.text(observerTimeParts.join('   ·   '), hx, hy);
      hy += 6;

      // Row 4: Conditions (if any)
      if (hasConditions) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...slate600);
        doc.text(`Conditions: ${conditionsParts.join('  ·  ')}`, hx, hy);
        hy += 6;
      }

      // Row 5: Location coords (if any)
      if (hasLocation) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...slate600);
        const coordStr = `${entry.location.lat.toFixed(6)}, ${entry.location.lng.toFixed(6)}${entry.location.address ? `  —  ${entry.location.address}` : ''}`;
        doc.text(`Location: ${coordStr}`, hx, hy);
        hy += 6;
      }

      y += headerH + 4;

      // ── DESCRIPTION ──
      drawSectionRule('Description');
      doc.setTextColor(...slate900);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (entry.description) {
        const lines = doc.splitTextToSize(entry.description, CONTENT_W);
        renderText(lines, MARGIN, 4.5);
        y += 2;
      } else {
        doc.setTextColor(...slate400);
        doc.text('N/A', MARGIN, y);
        y += 5;
      }

      // ── CORRECTIVE ACTIONS ──
      drawSectionRule('Corrective Actions');
      if (filters.includeCorrective && entry.correctiveActions) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(146, 64, 14);
        doc.text('ACTION REQUIRED', MARGIN, y);
        y += 5;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate900);
        const caLines = doc.splitTextToSize(entry.correctiveActions, CONTENT_W - 4);
        renderText(caLines, MARGIN + 2, 4.5);
        y += 2;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate400);
        doc.text('None Required', MARGIN, y);
        y += 5;
      }

      // ── FOLLOW-UP ──
      drawSectionRule('Follow-Up');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (entry.followUpRequired) {
        doc.setTextColor(146, 64, 14);
        doc.setFont('helvetica', 'bold');
        doc.text(
          entry.followUpDate ? `Required by ${formatDateShort(entry.followUpDate)}` : 'Required — no date specified',
          MARGIN, y
        );
        y += 5;
      } else {
        doc.setTextColor(...slate400);
        doc.text('None Required', MARGIN, y);
        y += 5;
      }

      // ── PHOTOGRAPHS ──
      drawSectionRule('Photographs');
      const photosToShow = filters.includePhotos
        ? (entry.photos || []).filter(p => !p.startsWith('data:video')).slice(0, 6)
        : [];
      if (photosToShow.length > 0) {
        const COLS = 2;
        const GAP = 4;
        const imgW = (CONTENT_W - GAP * (COLS - 1)) / COLS;
        const captions = entry.photoCaptions || [];
        const numRows = Math.ceil(photosToShow.length / COLS);

        for (let row = 0; row < numRows; row++) {
          const rowPhotos = photosToShow.slice(row * COLS, row * COLS + COLS);
          const rowHeights = rowPhotos.map(src => {
            try {
              const props = doc.getImageProperties(src);
              const aspect = props.height / props.width;
              return Math.min(130, Math.max(25, imgW * aspect));
            } catch { return imgW * 0.75; }
          });
          const rowH = Math.max(...rowHeights);
          checkY(rowH + 6);

          for (let col = 0; col < rowPhotos.length; col++) {
            try {
              const src = rowPhotos[col];
              const ext = src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
              const xPos = MARGIN + col * (imgW + GAP);
              const yOff = (rowH - rowHeights[col]) / 2;
              doc.addImage(src, ext, xPos, y + yOff, imgW, rowHeights[col], undefined, 'MEDIUM');
            } catch {}
          }
          y += rowH + 3;

          let maxCapLines = 0;
          for (let col = 0; col < rowPhotos.length; col++) {
            const pi = row * COLS + col;
            const cap = (captions[pi] || '').trim();
            if (!cap) continue;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...slate400);
            const capLines = doc.splitTextToSize(cap, imgW - 2);
            capLines.forEach((line, li) => {
              doc.text(line, MARGIN + col * (imgW + GAP) + 1, y + li * 3.8);
            });
            maxCapLines = Math.max(maxCapLines, capLines.length);
          }
          if (maxCapLines > 0) y += maxCapLines * 3.8 + 2;
          y += 2;
        }
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate400);
        doc.text('None', MARGIN, y);
        y += 5;
      }

      // ── MAP ──
      drawSectionRule('Location Map');
      if (filters.includeMaps && hasLocation) {
        const mapImg = mapImages[entry.id];
        if (mapImg) {
          checkY(44);
          try {
            doc.addImage(mapImg, 'PNG', MARGIN, y, CONTENT_W, 40, undefined, 'MEDIUM');
            y += 42;
          } catch {}
        }
        checkY(8);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate900);
        const coordText = `${entry.location.lat.toFixed(6)}, ${entry.location.lng.toFixed(6)}${entry.location.address ? `  —  ${entry.location.address}` : ''}`;
        doc.text(coordText, MARGIN, y);
        y += 6;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate400);
        doc.text('N/A', MARGIN, y);
        y += 5;
      }

      // ── TAGS ──
      if (entry.tags?.length > 0) {
        drawSectionRule('Tags');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate900);
        doc.text(entry.tags.join(', '), MARGIN, y);
        y += 5;
      }
    }
  }

  // ── Corrective Actions Appendix ──
  const caEntries = entries.filter(e => e.correctiveActions || e.followUpRequired);
  if (caEntries.length > 0) {
    newPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate900);
    doc.text('Corrective Actions Register', MARGIN, y);
    y += 8;

    doc.autoTable({
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Date', 'Type', 'Title', 'Action Required', 'Follow-up']],
      body: caEntries.map(e => [
        formatDateShort(e.date),
        getType(e.type).label,
        (e.title || '—').slice(0, 30),
        (e.correctiveActions || '—').slice(0, 50),
        e.followUpRequired ? (e.followUpDate ? formatDateShort(e.followUpDate) : 'Yes') : '—',

      ]),
      styles: { fontSize: 8, cellPadding: 3, textColor: slate700 },
      headStyles: { fillColor: charcoal, textColor: white, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: slate50 },
      didDrawPage: (data) => { page = data.pageNumber; addPageFooter(); },
    });
  }

  const filename = `EnviroLog_${slugify(project.name || 'Report')}_${filters.dateFrom}_to_${filters.dateTo}.pdf`;
  doc.save(filename);
}

// ── HTML Report ───────────────────────────────────────────

function generateHTML(entries, filters, project) {
  const grouped = groupBy(entries, 'date');
  const sortedDates = Object.keys(grouped).sort();

  const statusColors = {
    'compliant':     { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    'non-compliant': { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    'advisory':      { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    'observation':   { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Environmental Monitoring Report — ${sanitizeHtml(project.name || 'Project')}</title>
<style>
  :root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f1f5f9; color: #1e293b; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .cover { background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%); color: white; padding: 52px 48px 44px; }
  .cover h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.4px; }
  .cover .subtitle { font-size: 15px; color: #94a3b8; margin-bottom: 32px; }
  .project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; max-width: 580px; }
  .project-item label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; display: block; margin-bottom: 3px; }
  .project-item span { font-size: 13.5px; font-weight: 500; color: #e2e8f0; }
  .stats-row { display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap; }
  .stat-pill { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 18px; min-width: 90px; }
  .stat-pill .num { font-size: 20px; font-weight: 700; display: block; color: white; }
  .stat-pill .lbl { font-size: 11px; color: #64748b; margin-top: 2px; }
  .content { max-width: 900px; margin: 0 auto; padding: 36px 24px; }
  .date-group { margin-bottom: 40px; }
  .date-header { background: white; border: 1px solid #e2e8f0; border-left: 4px solid #334155; color: #1e293b; padding: 10px 16px; border-radius: 6px; margin-bottom: 16px; font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
  .date-header .count { font-size: 12px; color: #94a3b8; font-weight: 400; }
  .entry-card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 14px; overflow: hidden; }
  .entry-header { display: flex; align-items: flex-start; padding: 16px; gap: 12px; border-bottom: 1px solid #f1f5f9; }
  .type-bar { width: 3.5px; border-radius: 2px; align-self: stretch; flex-shrink: 0; }
  .entry-meta { flex: 1; }
  .type-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
  .entry-title { font-size: 15px; font-weight: 600; margin-bottom: 5px; color: #0f172a; }
  .meta-row { display: flex; gap: 14px; font-size: 12px; color: #64748b; flex-wrap: wrap; }
  .status-badge { display: inline-block; padding: 3px 9px; border-radius: 9999px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; border: 1px solid transparent; }
  .entry-body { padding: 14px 16px 16px; }
  .description { font-size: 13.5px; color: #334155; line-height: 1.65; margin-bottom: 14px; white-space: pre-wrap; }
  .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-bottom: 12px; }
  .photo-item { display: flex; flex-direction: column; gap: 4px; }
  .photos img { width: 100%; border-radius: 6px; object-fit: cover; aspect-ratio: 4/3; display: block; }
  .photo-caption { font-size: 11px; color: #64748b; line-height: 1.4; word-break: break-word; }
  .map-snapshot { width: 100%; max-width: 400px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 10px; display: block; }
  .location { font-size: 12px; color: #475569; margin-bottom: 10px; display: flex; align-items: center; gap: 5px; }
  .corrective { background: #fffbeb; border: 1px solid #fde68a; border-left: 3px solid #b45309; padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 10px; color: #334155; }
  .corrective strong { display: block; color: #b45309; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 700; }
  .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
  .tag { background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 9999px; font-size: 11.5px; border: 1px solid #e2e8f0; }
  .followup { background: #fefce8; color: #854d0e; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; display: inline-block; }
  .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
  .summary-table th { background: #1e293b; color: #cbd5e1; padding: 10px 13px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-table td { padding: 10px 13px; font-size: 13px; border-bottom: 1px solid #f1f5f9; color: #334155; }
  .summary-table tr:last-child td { border-bottom: none; }
  .summary-table tr:nth-child(even) td { background: #f8fafc; }
  h2 { font-size: 18px; font-weight: 700; margin: 36px 0 16px; color: #0f172a; letter-spacing: -0.3px; }
  .footer { background: #1e293b; color: #475569; text-align: center; padding: 24px; font-size: 12px; margin-top: 48px; }
  @media print { body { background: white; } .cover { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="cover">
  ${project.logo ? `<img src="${project.logo}" style="height:52px;margin-bottom:20px;border-radius:4px;opacity:0.9" alt="Logo">` : ''}
  <h1>${sanitizeHtml(project.reportTitle || 'Environmental Monitoring Report')}</h1>
  <div class="subtitle">${sanitizeHtml(project.reportSubtitle || project.name || 'Construction Site Environmental Inspection')}</div>
  <div class="project-grid">
    ${[['Project No.', project.number], ['Site Address', project.address], ['Client', project.client], ['Contractor', project.contractor], ['Observer', [project.observerFirst, project.observerLast].filter(Boolean).join(' ')], ['Approval Ref', project.approvalRef]].filter(([,v]) => v).map(([l,v]) => `
      <div class="project-item"><label>${l}</label><span>${sanitizeHtml(v)}</span></div>
    `).join('')}
  </div>
  <div class="stats-row">
    <div class="stat-pill"><span class="num">${entries.length}</span><span class="lbl">Total Entries</span></div>
    <div class="stat-pill"><span class="num">${formatDateShort(filters.dateFrom)}</span><span class="lbl">Period From</span></div>
    <div class="stat-pill"><span class="num">${formatDateShort(filters.dateTo)}</span><span class="lbl">Period To</span></div>
    <div class="stat-pill"><span class="num">${new Date().toLocaleDateString('en-AU')}</span><span class="lbl">Generated</span></div>
  </div>
</div>

<div class="content">

  <h2>Summary</h2>
  <table class="summary-table">
    <thead><tr><th>ID</th><th>Date</th><th>Time</th><th>Type</th><th>Title</th><th>Status</th><th>Observer</th></tr></thead>
    <tbody>
      ${entries.map(e => {
        const sc = statusColors[e.status] || { bg: '#f1f5f9', color: '#64748b' };
        return `<tr>
          <td style="font-family:monospace;font-size:11px">${sanitizeHtml(e.entryCode || '—')}</td>
          <td>${formatDateShort(e.date)}</td>
          <td>${formatTime(e.time)}</td>
          <td style="color:${getType(e.type).color};font-weight:600">${sanitizeHtml(getType(e.type).label)}</td>
          <td>${sanitizeHtml(e.title || '—')}</td>
          <td><span class="status-badge" style="background:${sc.bg};color:${sc.color};border-color:${sc.border}">${sanitizeHtml(getStatus(e.status).label)}</span></td>
          <td>${sanitizeHtml(e.observer || e.inspector || '—')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2>Detailed Entries</h2>
  ${sortedDates.map(date => {
    const dayEntries = grouped[date].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return `
      <div class="date-group">
        <div class="date-header">
          <span>${formatDate(date)}</span>
          <span class="count">${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'}</span>
        </div>
        ${dayEntries.map(e => {
          const type = getType(e.type);
          const status = getStatus(e.status);
          const sc = statusColors[e.status] || { bg: '#f1f5f9', color: '#64748b' };
          const rawPhotos = filters.includePhotos ? (e.photos || []).filter(p => !p.startsWith('data:video')).slice(0, 6) : [];
          const captions = e.photoCaptions || [];
          const mapUrl = filters.includeMaps && e.location?.lat
            ? `https://staticmap.openstreetmap.de/staticmap.php?center=${e.location.lat},${e.location.lng}&zoom=16&size=400x200&markers=${e.location.lat},${e.location.lng},red-pushpin`
            : null;
          return `
            <div class="entry-card">
              <div class="entry-header">
                <div class="type-bar" style="background:${type.color}"></div>
                <div class="entry-meta">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <div class="type-label" style="color:${type.color}">${sanitizeHtml(type.label)}</div>
                    ${e.entryCode ? `<code style="font-size:10px;color:#64748b;background:#f1f5f9;padding:1px 6px;border-radius:4px">${sanitizeHtml(e.entryCode)}</code>` : ''}
                  </div>
                  <div class="entry-title">${sanitizeHtml(e.title || 'Untitled Entry')}</div>
                  <div class="meta-row">
                    ${e.time ? `<span>${formatTime(e.time)}</span>` : ''}
                    ${(e.observer || e.inspector) ? `<span>👤 ${sanitizeHtml(e.observer || e.inspector)}</span>` : ''}
                    ${e.weather ? `<span>🌤 ${sanitizeHtml(e.weather)}</span>` : ''}
                    ${e.temperature != null ? `<span>${e.temperature}°C</span>` : ''}
                    ${e.location?.lat ? `<span>📍 ${e.location.lat.toFixed(5)}, ${e.location.lng.toFixed(5)}</span>` : ''}
                  </div>
                </div>
                <span class="status-badge" style="background:${sc.bg};color:${sc.color};border-color:${sc.border}">${sanitizeHtml(status.label)}</span>
              </div>
              <div class="entry-body">
                ${e.description ? `<div class="description">${sanitizeHtml(e.description)}</div>` : ''}
                ${rawPhotos.length > 0 ? `<div class="photos">${rawPhotos.map((src, i) => `<div class="photo-item"><img src="${src}" alt="Photo">${captions[i] ? `<div class="photo-caption">${sanitizeHtml(captions[i])}</div>` : ''}</div>`).join('')}</div>` : ''}
                ${mapUrl ? `<img class="map-snapshot" src="${mapUrl}" alt="Map" loading="lazy">` : ''}
                ${filters.includeMaps && e.location?.lat ? `<div class="location">📍 ${e.location.lat.toFixed(6)}, ${e.location.lng.toFixed(6)}${e.location.address ? ` — ${sanitizeHtml(e.location.address)}` : ''}</div>` : ''}
                ${filters.includeCorrective && e.correctiveActions ? `<div class="corrective"><strong>⚠ Corrective Action Required</strong>${sanitizeHtml(e.correctiveActions)}</div>` : ''}
                ${e.followUpRequired ? `<div style="margin-bottom:8px"><span class="followup">⏰ Follow-up${e.followUpDate ? ' by ' + formatDateShort(e.followUpDate) : ' Required'}</span></div>` : ''}
                ${(e.tags || []).length > 0 ? `<div class="tags">${e.tags.map(t => `<span class="tag">${sanitizeHtml(t)}</span>`).join('')}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('')}

</div>

<div class="footer">
  <p>EnviroLog Environmental Monitoring Report · Generated ${new Date().toLocaleString('en-AU')}</p>
  <p style="margin-top:4px">${sanitizeHtml(project.name || 'Construction Project')} · ${entries.length} entries</p>
</div>

</body>
</html>`;

  const filename = `EnviroLog_${slugify(project.name || 'Report')}_${filters.dateFrom}_to_${filters.dateTo}.html`;
  downloadText(html, filename, 'text/html');
}

// ── Markdown Report ───────────────────────────────────────

function generateMarkdown(entries, filters, project) {
  const grouped = groupBy(entries, 'date');
  const sortedDates = Object.keys(grouped).sort();

  const statusCounts = {};
  STATUS_TYPES.forEach(s => { statusCounts[s.id] = 0; });
  entries.forEach(e => { if (statusCounts[e.status] !== undefined) statusCounts[e.status]++; });

  let md = '';

  // Front matter
  md += `---\n`;
  md += `title: Environmental Monitoring Report\n`;
  md += `project: ${project.name || 'Construction Project'}\n`;
  md += `period: ${filters.dateFrom} to ${filters.dateTo}\n`;
  md += `entries: ${entries.length}\n`;
  md += `generated: ${new Date().toISOString()}\n`;
  md += `---\n\n`;

  // Title
  md += `# Environmental Monitoring Report\n\n`;
  md += `## ${project.name || 'Construction Project'}\n\n`;

  // Project details
  md += `### Project Details\n\n`;
  md += `| Field | Value |\n|-------|-------|\n`;
  if (project.number)      md += `| Project No. | ${project.number} |\n`;
  if (project.address)     md += `| Site Address | ${project.address} |\n`;
  if (project.client)      md += `| Client | ${project.client} |\n`;
  if (project.contractor)  md += `| Contractor | ${project.contractor} |\n`;
  const mdObserver = [project.observerFirst, project.observerLast].filter(Boolean).join(' ');
  if (mdObserver)          md += `| Observer | ${mdObserver} |\n`;
  if (project.approvalRef) md += `| Approval Ref | ${project.approvalRef} |\n`;
  md += `| Report Period | ${formatDateShort(filters.dateFrom)} — ${formatDateShort(filters.dateTo)} |\n`;
  md += `| Total Entries | ${entries.length} |\n`;
  md += `| Generated | ${new Date().toLocaleDateString('en-AU')} |\n\n`;

  // Status summary
  md += `### Status Summary\n\n`;
  md += `| Status | Count | % |\n|--------|-------|---|\n`;
  STATUS_TYPES.forEach(s => {
    const count = statusCounts[s.id] || 0;
    const pct = entries.length > 0 ? ((count / entries.length) * 100).toFixed(0) : 0;
    md += `| ${s.label} | ${count} | ${pct}% |\n`;
  });
  md += '\n';

  // Entries table
  md += `### Entries Summary\n\n`;
  md += `| ID | Date | Time | Type | Title | Status | Observer |\n`;
  md += `|------|------|------|-------|-------|--------|-----------|\n`;
  entries.forEach(e => {
    md += `| ${e.entryCode || '—'} | ${formatDateShort(e.date)} | ${formatTime(e.time)} | ${getType(e.type).label} | ${(e.title || 'Untitled').replace(/\|/g, '\\|')} | ${getStatus(e.status).label} | ${(e.observer || e.inspector || '—').replace(/\|/g, '\\|')} |\n`;
  });
  md += '\n---\n\n';

  // Detailed entries
  md += `## Detailed Entries\n\n`;

  sortedDates.forEach(date => {
    const dayEntries = grouped[date].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    md += `---\n\n`;
    md += `### ${formatDate(date)}\n\n`;
    md += `*${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'} recorded*\n\n`;

    dayEntries.forEach((e, idx) => {
      const type = getType(e.type);
      const status = getStatus(e.status);

      md += `#### ${idx + 1}. ${e.title || 'Untitled Entry'}\n\n`;
      md += `**Type:** ${type.label}  \n`;
      md += `**Status:** ${status.label}  \n`;
      if (e.time) md += `**Time:** ${formatTime(e.time)}  \n`;
      if (e.observer || e.inspector) md += `**Observer:** ${e.observer || e.inspector}  \n`;
      if (e.weather) md += `**Weather:** ${e.weather}${e.temperature != null ? `, ${e.temperature}°C` : ''}${e.windDirection ? `, Wind: ${e.windDirection}` : ''}  \n`;
      md += '\n';

      if (e.description) {
        md += `${e.description}\n\n`;
      }

      if (filters.includeMaps && e.location?.lat) {
        md += `📍 **Location:** ${e.location.lat.toFixed(6)}, ${e.location.lng.toFixed(6)}`;
        if (e.location.address) md += ` — ${e.location.address}`;
        md += `  \n[View on Map](https://www.openstreetmap.org/?mlat=${e.location.lat}&mlon=${e.location.lng}#map=17/${e.location.lat}/${e.location.lng})\n\n`;
      }

      if (filters.includeCorrective && e.correctiveActions) {
        md += `> ⚠️ **Corrective Action Required:**  \n`;
        md += `> ${e.correctiveActions.replace(/\n/g, '\n> ')}\n\n`;
      }

      if (e.followUpRequired) {
        md += `⏰ **Follow-up Required**${e.followUpDate ? `: by ${formatDateShort(e.followUpDate)}` : ''}\n\n`;
      }

      if ((e.tags || []).length > 0) {
        md += `**Tags:** ${e.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
      }

      if (filters.includePhotos && e.photos?.length > 0) {
        const photoCount = e.photos.filter(p => !p.startsWith('data:video')).length;
        if (photoCount > 0) {
          md += `*[${photoCount} photo${photoCount !== 1 ? 's' : ''} attached — see HTML or PDF report for images]*\n\n`;
        }
      }

      md += '\n';
    });
  });

  // Corrective actions register
  const caEntries = entries.filter(e => e.correctiveActions || e.followUpRequired);
  if (caEntries.length > 0) {
    md += `---\n\n## Corrective Actions Register\n\n`;
    md += `| Date | Type | Title | Action Required | Follow-up |\n`;
    md += `|------|------|-------|-----------------|----------|\n`;
    caEntries.forEach(e => {
      const followUp = e.followUpRequired ? (e.followUpDate ? formatDateShort(e.followUpDate) : 'Yes') : '—';
      md += `| ${formatDateShort(e.date)} | ${getType(e.type).label} | ${(e.title || '—').replace(/\|/g, '\\|')} | ${(e.correctiveActions || '—').replace(/\n/g, ' ').slice(0, 60).replace(/\|/g, '\\|')} | ${followUp} |\n`;
    });
    md += '\n';
  }

  md += `---\n\n*Report generated by EnviroLog on ${new Date().toLocaleString('en-AU')}*\n`;

  const filename = `EnviroLog_${slugify(project.name || 'Report')}_${filters.dateFrom}_to_${filters.dateTo}.md`;
  downloadText(md, filename, 'text/markdown');
}

// ── Helpers ───────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
