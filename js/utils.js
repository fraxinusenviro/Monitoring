// ════════════════════════════════════════════════════════════
//  EnviroLog — Utility Functions
// ════════════════════════════════════════════════════════════

// ── IDs ───────────────────────────────────────────────────

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── Dates ─────────────────────────────────────────────────

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateMedium(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatDateTime(dateStr, timeStr) {
  return [formatDateShort(dateStr), timeStr ? formatTime(timeStr) : ''].filter(Boolean).join(' · ');
}

export function isToday(dateStr) {
  return dateStr === today();
}

export function isYesterday(dateStr) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr === d.toISOString().split('T')[0];
}

export function friendlyDate(dateStr) {
  if (isToday(dateStr)) return 'Today';
  if (isYesterday(dateStr)) return 'Yesterday';
  return formatDateMedium(dateStr);
}

// ── Files / Media ─────────────────────────────────────────

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isVideo(src) {
  if (!src) return false;
  return src.startsWith('data:video') || /\.(mp4|webm|mov|avi|mkv)$/i.test(src);
}

// ── String ────────────────────────────────────────────────

export function sanitizeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

export function truncate(str, len = 120) {
  if (!str || str.length <= len) return str ?? '';
  return str.slice(0, len).trimEnd() + '…';
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── DOM ───────────────────────────────────────────────────

export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') element.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(element.style, v);
    else if (k.startsWith('on')) element.addEventListener(k.slice(2).toLowerCase(), v);
    else element.setAttribute(k, v);
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}

export function icon(id, cls = '') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#icon-${id}"/></svg>`;
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Toast Notifications ───────────────────────────────────

export function toast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: 'check',
    error: 'alert',
    warning: 'alert',
    info: 'layers',
  };

  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.innerHTML = `${icon(icons[type] || 'check')}<span>${sanitizeHtml(message)}</span>`;
  container.appendChild(div);

  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transform = 'translateY(8px)';
    div.style.transition = '200ms ease';
    setTimeout(() => div.remove(), 200);
  }, duration);
}

// ── Modal ─────────────────────────────────────────────────

export function showModal(title, message, actions = []) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');

  body.innerHTML = `
    <h2 class="modal-title">${sanitizeHtml(title)}</h2>
    <p class="modal-message">${sanitizeHtml(message)}</p>
    <div class="modal-actions" id="modal-action-btns"></div>
  `;

  const actionContainer = document.getElementById('modal-action-btns');
  for (const action of actions) {
    const btn = document.createElement('button');
    btn.className = `btn ${action.class || 'btn-secondary'}`;
    btn.textContent = action.label;
    btn.onclick = () => {
      closeModal();
      action.onClick?.();
    };
    actionContainer.appendChild(btn);
  }

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

export function confirmDialog(title, message, onConfirm, confirmLabel = 'Delete', confirmClass = 'btn-danger') {
  showModal(title, message, [
    { label: 'Cancel', class: 'btn-secondary', onClick: () => {} },
    { label: confirmLabel, class: confirmClass, onClick: onConfirm },
  ]);
}

// ── Lightbox ──────────────────────────────────────────────

export function openLightbox(src, caption = '') {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const vid = document.getElementById('lightbox-video');
  const cap = document.getElementById('lightbox-caption');

  if (isVideo(src)) {
    img.style.display = 'none';
    vid.style.display = 'block';
    vid.src = src;
    vid.play().catch(() => {});
  } else {
    vid.style.display = 'none';
    vid.pause();
    img.style.display = 'block';
    img.src = src;
  }

  cap.textContent = caption;
  lb.classList.remove('hidden');
}

export function closeLightbox() {
  const lb = document.getElementById('lightbox');
  const vid = document.getElementById('lightbox-video');
  vid.pause();
  vid.src = '';
  lb.classList.add('hidden');
}

// ── Geolocation ───────────────────────────────────────────

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    });
  });
}

// ── Misc ──────────────────────────────────────────────────

export function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const group = typeof key === 'function' ? key(item) : item[key];
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {});
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function downloadText(content, filename, type = 'text/plain') {
  downloadBlob(new Blob([content], { type }), filename);
}
