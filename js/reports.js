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
            <div class="card-header"><span class="card-title">${icon('calendar')} Date Range</span></div>
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
            <div class="card-header"><span class="card-title">${icon('filter')} Filter by Type</span></div>
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
            <div class="card-header"><span class="card-title">${icon('filter')} Filter by Status</span></div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:6px">
                ${STATUS_TYPES.map(s => `
                  <label style="font-size:13px;font-weight:400;cursor:pointer;display:flex;align-items:center;gap:8px">
                    <input type="checkbox" class="rep-status-check" data-status="${s.id}" checked style="width:auto">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
                    ${sanitizeHtml(s.label)}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title">${icon('settings')} Options</span></div>
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
            <div class="card-header"><span class="card-title">${icon('file')} Export Format</span></div>
            <div class="card-body">
              <div class="format-grid">
                <div class="format-card selected" data-format="pdf">
                  <div class="format-icon">📄</div>
                  <div class="format-label">PDF</div>
                  <div class="format-desc">Professional printable report</div>
                </div>
                <div class="format-card" data-format="html">
                  <div class="format-icon">🌐</div>
                  <div class="format-label">HTML</div>
                  <div class="format-desc">Shareable web page</div>
                </div>
                <div class="format-card" data-format="markdown">
                  <div class="format-icon">📝</div>
                  <div class="format-label">Markdown</div>
                  <div class="format-desc">Plain text with formatting</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><span class="card-title">${icon('layers')} Preview</span></div>
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

  const blue = [29, 78, 216];
  const slate900 = [15, 23, 42];
  const slate600 = [71, 85, 105];
  const slate400 = [148, 163, 184];
  const slate100 = [241, 245, 249];

  const statusColors = {
    'compliant':     [22, 163, 74],
    'non-compliant': [220, 38, 38],
    'advisory':      [217, 119, 6],
    'observation':   [37, 99, 235],
  };

  let page = 1;
  let y = MARGIN;

  const newPage = () => {
    doc.addPage();
    page++;
    y = MARGIN;
    addPageFooter();
  };

  const checkY = (needed = 20) => {
    if (y + needed > PAGE_H - 20) newPage();
  };

  const addPageFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(...slate400);
    doc.text(`${sanitizeHtml(project.name || 'Environmental Monitoring')} — Page ${page}`, MARGIN, PAGE_H - 8);
    doc.text(`Generated ${new Date().toLocaleString('en-AU')}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
    doc.setTextColor(...slate900);
  };

  // ── Cover Page ──
  // Header bar
  doc.setFillColor(...blue);
  doc.rect(0, 0, PAGE_W, 50, 'F');

  // Logo (if available)
  if (project.logo) {
    try {
      const ext = project.logo.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(project.logo, ext, MARGIN, 8, 30, 30);
    } catch {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const titleX = project.logo ? MARGIN + 36 : MARGIN;
  doc.text('Environmental Monitoring Report', titleX, 22);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Construction Site Environmental Inspection', titleX, 32);

  y = 65;
  doc.setTextColor(...slate900);

  // Project details box
  doc.setFillColor(...slate100);
  doc.roundedRect(MARGIN, y, CONTENT_W, 70, 3, 3, 'F');

  const details = [
    ['Project', project.name || '—'],
    ['Project No.', project.number || '—'],
    ['Site Address', project.address || '—'],
    ['Client', project.client || '—'],
    ['Contractor', project.contractor || '—'],
    ['Inspector', project.inspector || '—'],
    ['Approval Ref', project.approvalRef || '—'],
  ];

  const col1X = MARGIN + 5;
  const col2X = MARGIN + 45;
  let detY = y + 8;

  details.forEach(([label, value]) => {
    if (detY > y + 65) return;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate600);
    doc.text(label.toUpperCase(), col1X, detY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate900);
    doc.text(String(value).slice(0, 60), col2X, detY);
    detY += 9;
  });

  y += 78;

  // Report period
  doc.setFillColor(...blue);
  doc.roundedRect(MARGIN, y, CONTENT_W / 2 - 4, 24, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT PERIOD', MARGIN + 5, y + 7);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatDateShort(filters.dateFrom)} — ${formatDateShort(filters.dateTo)}`, MARGIN + 5, y + 17);

  doc.setFillColor(...slate100);
  doc.roundedRect(MARGIN + CONTENT_W / 2 + 4, y, CONTENT_W / 2 - 4, 24, 2, 2, 'F');
  doc.setTextColor(...slate900);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ENTRIES', MARGIN + CONTENT_W / 2 + 9, y + 7);
  doc.setFontSize(20);
  doc.text(String(entries.length), MARGIN + CONTENT_W / 2 + 9, y + 19);

  y += 34;

  // Status summary
  doc.setTextColor(...slate900);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Status Summary', MARGIN, y + 5);
  y += 10;

  const statusCounts = {};
  STATUS_TYPES.forEach(s => { statusCounts[s.id] = 0; });
  entries.forEach(e => { if (statusCounts[e.status] !== undefined) statusCounts[e.status]++; });

  const swatchW = CONTENT_W / STATUS_TYPES.length - 3;
  STATUS_TYPES.forEach((s, i) => {
    const sx = MARGIN + i * (swatchW + 3);
    const count = statusCounts[s.id];
    const col = statusColors[s.id] || blue;
    doc.setFillColor(...col);
    doc.roundedRect(sx, y, swatchW, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(count), sx + swatchW / 2, y + 12, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(s.label.toUpperCase(), sx + swatchW / 2, y + 18, { align: 'center' });
  });

  y += 28;
  addPageFooter();

  // ── Summary Table ──
  newPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate900);
  doc.text('Entries Summary', MARGIN, y);
  y += 6;

  doc.autoTable({
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Date', 'Time', 'Type', 'Title', 'Status', 'Inspector']],
    body: entries.map(e => [
      formatDateShort(e.date),
      formatTime(e.time),
      getType(e.type).label,
      (e.title || 'Untitled').slice(0, 40),
      getStatus(e.status).label,
      e.inspector || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: slate100 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 14 },
      2: { cellWidth: 32 },
      3: { cellWidth: 60 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22 },
    },
    didParseCell: (data) => {
      if (data.column.index === 4 && data.section === 'body') {
        const status = STATUS_TYPES.find(s => s.label === data.cell.raw);
        if (status) {
          data.cell.styles.textColor = statusColors[status.id] || [0, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: () => { addPageFooter(); page = doc.internal.getCurrentPageInfo().pageNumber; },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Detailed Entries ──
  const grouped = groupBy(entries, 'date');
  const sortedDates = Object.keys(grouped).sort();

  for (const date of sortedDates) {
    const dayEntries = grouped[date].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    newPage();

    // Date header
    doc.setFillColor(...blue);
    doc.rect(MARGIN, y, CONTENT_W, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(date), MARGIN + 3, y + 7);
    doc.text(`${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'}`, PAGE_W - MARGIN - 3, y + 7, { align: 'right' });
    y += 14;

    for (const entry of dayEntries) {
      const type = getType(entry.type);
      const status = getStatus(entry.status);
      const statusCol = statusColors[entry.status] || blue;

      checkY(35);

      // Entry header bar
      doc.setFillColor(240, 244, 255);
      doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, 'F');
      doc.setFillColor(...(type.color.match(/\w\w/g).map(x => parseInt(x, 16)) || blue));
      doc.rect(MARGIN, y, 3, 14, 'F');

      doc.setTextColor(...slate900);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(entry.title || 'Untitled Entry', MARGIN + 6, y + 5.5);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate600);
      doc.text(`${type.label}  ·  ${formatTime(entry.time)}${entry.inspector ? `  ·  ${entry.inspector}` : ''}`, MARGIN + 6, y + 11);

      // Status badge
      doc.setFillColor(...statusCol);
      doc.roundedRect(PAGE_W - MARGIN - 28, y + 3, 25, 7, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(status.label.toUpperCase(), PAGE_W - MARGIN - 15.5, y + 7.5, { align: 'center' });

      y += 17;

      // Description
      if (entry.description) {
        checkY(10);
        doc.setTextColor(...slate900);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(entry.description, CONTENT_W);
        const maxLines = Math.min(lines.length, 8);
        doc.text(lines.slice(0, maxLines), MARGIN, y);
        y += maxLines * 4.5 + 3;
      }

      // Weather/conditions row
      if (entry.weather || entry.temperature != null || entry.windDirection) {
        checkY(8);
        const conditions = [
          entry.weather,
          entry.temperature != null ? `${entry.temperature}°C` : null,
          entry.windDirection ? `Wind: ${entry.windDirection}` : null,
        ].filter(Boolean).join('  ·  ');
        doc.setFontSize(8);
        doc.setTextColor(...slate600);
        doc.text(`Conditions: ${conditions}`, MARGIN, y);
        y += 6;
      }

      // Location
      if (filters.includeMaps && entry.location?.lat) {
        checkY(8);
        doc.setFontSize(8);
        doc.setTextColor(...slate600);
        doc.text(`📍 ${entry.location.lat.toFixed(6)}, ${entry.location.lng.toFixed(6)}${entry.location.address ? `  — ${entry.location.address}` : ''}`, MARGIN, y);
        y += 6;
      }

      // Corrective actions
      if (filters.includeCorrective && entry.correctiveActions) {
        checkY(14);
        doc.setFillColor(255, 248, 231);
        doc.roundedRect(MARGIN, y, CONTENT_W, 12, 1, 1, 'F');
        doc.setTextColor(180, 100, 0);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('CORRECTIVE ACTION REQUIRED', MARGIN + 3, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate900);
        const caLines = doc.splitTextToSize(entry.correctiveActions, CONTENT_W - 6);
        doc.text(caLines.slice(0, 1), MARGIN + 3, y + 9);
        y += 15;
      }

      // Photos (max 4 per entry)
      if (filters.includePhotos && entry.photos?.length > 0) {
        const photosToShow = entry.photos.filter(p => !p.startsWith('data:video')).slice(0, 4);
        if (photosToShow.length > 0) {
          checkY(45);
          const imgW = (CONTENT_W - (photosToShow.length - 1) * 3) / photosToShow.length;
          const imgH = Math.min(45, imgW * 0.75);

          for (let pi = 0; pi < photosToShow.length; pi++) {
            try {
              const src = photosToShow[pi];
              const ext = src.startsWith('data:image/png') ? 'PNG' : 'JPEG';
              doc.addImage(src, ext, MARGIN + pi * (imgW + 3), y, imgW, imgH, undefined, 'MEDIUM');
            } catch {}
          }
          y += imgH + 4;
        }
      }

      // Follow-up
      if (entry.followUpRequired) {
        checkY(8);
        doc.setTextColor(180, 100, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`⚠ Follow-up required${entry.followUpDate ? ` by ${formatDateShort(entry.followUpDate)}` : ''}`, MARGIN, y);
        y += 6;
      }

      // Tags
      if (entry.tags?.length > 0) {
        checkY(8);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate400);
        doc.text('Tags: ' + entry.tags.join(', '), MARGIN, y);
        y += 5;
      }

      y += 6;

      // Separator
      doc.setDrawColor(...slate100);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
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
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      didDrawPage: () => addPageFooter(),
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
    'compliant':     { bg: '#dcfce7', color: '#16a34a' },
    'non-compliant': { bg: '#fee2e2', color: '#dc2626' },
    'advisory':      { bg: '#fef3c7', color: '#d97706' },
    'observation':   { bg: '#dbeafe', color: '#2563eb' },
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
  body { background: #f1f5f9; color: #0f172a; line-height: 1.5; }
  .cover { background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); color: white; padding: 48px; }
  .cover h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
  .cover .subtitle { font-size: 16px; opacity: 0.8; margin-bottom: 32px; }
  .project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; max-width: 600px; }
  .project-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; display: block; }
  .project-item span { font-size: 14px; font-weight: 600; }
  .stats-row { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
  .stat-pill { background: rgba(255,255,255,0.15); border-radius: 8px; padding: 12px 20px; }
  .stat-pill .num { font-size: 24px; font-weight: 800; display: block; }
  .stat-pill .lbl { font-size: 12px; opacity: 0.8; }
  .content { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
  .date-group { margin-bottom: 40px; }
  .date-header { background: #1d4ed8; color: white; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 700; display: flex; justify-content: space-between; }
  .entry-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .entry-header { display: flex; align-items: flex-start; padding: 16px; gap: 12px; }
  .type-bar { width: 4px; border-radius: 2px; align-self: stretch; flex-shrink: 0; }
  .entry-meta { flex: 1; }
  .type-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .entry-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .meta-row { display: flex; gap: 12px; font-size: 12px; color: #64748b; }
  .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .entry-body { padding: 0 16px 16px; }
  .description { font-size: 14px; color: #374151; line-height: 1.6; margin-bottom: 12px; white-space: pre-wrap; }
  .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-bottom: 12px; }
  .photos img { width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 4/3; }
  .location { font-size: 12px; color: #3b82f6; margin-bottom: 8px; }
  .corrective { background: #fffbeb; border-left: 3px solid #d97706; padding: 10px 12px; border-radius: 4px; font-size: 13px; margin-bottom: 8px; }
  .corrective strong { display: block; color: #d97706; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .tag { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
  .followup { background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-block; }
  .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .summary-table th { background: #1d4ed8; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
  .summary-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  .summary-table tr:last-child td { border-bottom: none; }
  .summary-table tr:nth-child(even) td { background: #f8fafc; }
  h2 { font-size: 20px; font-weight: 800; margin: 32px 0 16px; color: #0f172a; }
  .footer { background: #0f172a; color: #64748b; text-align: center; padding: 24px; font-size: 12px; margin-top: 48px; }
  @media print { body { background: white; } .cover { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="cover">
  ${project.logo ? `<img src="${project.logo}" style="height:60px;margin-bottom:16px;border-radius:4px" alt="Logo">` : ''}
  <h1>Environmental Monitoring Report</h1>
  <div class="subtitle">${sanitizeHtml(project.name || 'Construction Project')}</div>
  <div class="project-grid">
    ${[['Project No.', project.number], ['Site Address', project.address], ['Client', project.client], ['Contractor', project.contractor], ['Inspector', project.inspector], ['Approval Ref', project.approvalRef]].filter(([,v]) => v).map(([l,v]) => `
      <div class="project-item"><label>${l}</label><span>${sanitizeHtml(v)}</span></div>
    `).join('')}
  </div>
  <div class="stats-row">
    <div class="stat-pill"><span class="num">${entries.length}</span><span class="lbl">Total Entries</span></div>
    <div class="stat-pill"><span class="num">${formatDateShort(filters.dateFrom)}</span><span class="lbl">From</span></div>
    <div class="stat-pill"><span class="num">${formatDateShort(filters.dateTo)}</span><span class="lbl">To</span></div>
    <div class="stat-pill"><span class="num">${new Date().toLocaleDateString('en-AU')}</span><span class="lbl">Generated</span></div>
  </div>
</div>

<div class="content">

  <h2>Summary</h2>
  <table class="summary-table">
    <thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Title</th><th>Status</th><th>Inspector</th></tr></thead>
    <tbody>
      ${entries.map(e => {
        const sc = statusColors[e.status] || { bg: '#f1f5f9', color: '#64748b' };
        return `<tr>
          <td>${formatDateShort(e.date)}</td>
          <td>${formatTime(e.time)}</td>
          <td style="color:${getType(e.type).color};font-weight:600">${sanitizeHtml(getType(e.type).label)}</td>
          <td>${sanitizeHtml(e.title || '—')}</td>
          <td><span class="status-badge" style="background:${sc.bg};color:${sc.color}">${sanitizeHtml(getStatus(e.status).label)}</span></td>
          <td>${sanitizeHtml(e.inspector || '—')}</td>
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
          <span>${dayEntries.length} entr${dayEntries.length === 1 ? 'y' : 'ies'}</span>
        </div>
        ${dayEntries.map(e => {
          const type = getType(e.type);
          const status = getStatus(e.status);
          const sc = statusColors[e.status] || { bg: '#f1f5f9', color: '#64748b' };
          const photos = filters.includePhotos ? (e.photos || []).filter(p => !p.startsWith('data:video')).slice(0, 6) : [];
          return `
            <div class="entry-card">
              <div class="entry-header">
                <div class="type-bar" style="background:${type.color}"></div>
                <div class="entry-meta">
                  <div class="type-label" style="color:${type.color}">${sanitizeHtml(type.label)}</div>
                  <div class="entry-title">${sanitizeHtml(e.title || 'Untitled Entry')}</div>
                  <div class="meta-row">
                    ${e.time ? `<span>${formatTime(e.time)}</span>` : ''}
                    ${e.inspector ? `<span>👤 ${sanitizeHtml(e.inspector)}</span>` : ''}
                    ${e.weather ? `<span>🌤 ${sanitizeHtml(e.weather)}</span>` : ''}
                    ${e.temperature != null ? `<span>${e.temperature}°C</span>` : ''}
                  </div>
                </div>
                <span class="status-badge" style="background:${sc.bg};color:${sc.color}">${sanitizeHtml(status.label)}</span>
              </div>
              <div class="entry-body">
                ${e.description ? `<div class="description">${sanitizeHtml(e.description)}</div>` : ''}
                ${photos.length > 0 ? `<div class="photos">${photos.map(src => `<img src="${src}" alt="Photo">`).join('')}</div>` : ''}
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
  if (project.inspector)   md += `| Inspector | ${project.inspector} |\n`;
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
  md += `| Date | Time | Type | Title | Status | Inspector |\n`;
  md += `|------|------|------|-------|--------|-----------|\n`;
  entries.forEach(e => {
    md += `| ${formatDateShort(e.date)} | ${formatTime(e.time)} | ${getType(e.type).label} | ${(e.title || 'Untitled').replace(/\|/g, '\\|')} | ${getStatus(e.status).label} | ${e.inspector || '—'} |\n`;
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
      if (e.inspector) md += `**Inspector:** ${e.inspector}  \n`;
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
