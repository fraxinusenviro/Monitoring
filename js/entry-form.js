// ════════════════════════════════════════════════════════════
//  EnviroLog — Entry Form (New & Edit)
// ════════════════════════════════════════════════════════════

import { OBSERVATION_TYPES, STATUS_TYPES, WEATHER_OPTIONS, WIND_DIRECTIONS, getType, getStatus } from './config.js';
import { getEntry, saveEntry, getNextOrder } from './db.js';
import { uuid, today, nowTime, fileToBase64, formatDate, sanitizeHtml, icon,
         toast, getCurrentPosition, isVideo } from './utils.js';

let _map = null;
let _marker = null;
let _navigate = null;

// ── Entry Form Renderer ───────────────────────────────────

export async function renderEntryForm(entryId, project, navigate) {
  _navigate = navigate;
  const container = document.getElementById('view-container');

  // Load existing entry if editing
  let entry = null;
  if (entryId) {
    entry = await getEntry(entryId);
    if (!entry) { toast('Entry not found', 'error'); navigate('library'); return; }
  }

  const isEdit = !!entry;
  const defaultDate = isEdit ? entry.date : today();
  const defaultTime = isEdit ? entry.time : nowTime();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">${isEdit ? 'Edit Entry' : 'New Entry'}</div>
        <div class="page-subtitle">${isEdit ? `Editing: ${sanitizeHtml(entry.title || 'Untitled')}` : formatDate(today())}</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" id="form-cancel-btn">${icon('x')} Cancel</button>
        <button class="btn btn-primary" id="form-save-btn">${icon('check')} Save Entry</button>
      </div>
    </div>
    <div class="page-body animate-in">
      <form id="entry-form" class="entry-form" novalidate>

        <!-- ── Date / Time / Inspector ── -->
        <div class="form-section">
          <div class="form-section-header">Observation Details</div>
          <div class="form-section-body">
            <div class="form-row">
              <div class="form-group">
                <label class="required">Date</label>
                <input type="date" id="f-date" value="${defaultDate}" required>
              </div>
              <div class="form-group">
                <label>Time</label>
                <input type="time" id="f-time" value="${defaultTime}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Inspector / Author</label>
                <input type="text" id="f-inspector" value="${sanitizeHtml(isEdit ? (entry.inspector || '') : (project.inspector || ''))}" placeholder="Inspector name">
              </div>
              <div class="form-group">
                <label>Weather</label>
                <select id="f-weather">
                  <option value="">— Select —</option>
                  ${WEATHER_OPTIONS.map(w => `<option value="${sanitizeHtml(w)}" ${isEdit && entry.weather === w ? 'selected' : ''}>${sanitizeHtml(w)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Temperature (°C)</label>
                <input type="number" id="f-temp" min="-20" max="60" step="0.5" value="${isEdit && entry.temperature != null ? entry.temperature : ''}">
              </div>
              <div class="form-group">
                <label>Wind Direction</label>
                <select id="f-wind">
                  <option value="">— Select —</option>
                  ${WIND_DIRECTIONS.map(w => `<option value="${w}" ${isEdit && entry.windDirection === w ? 'selected' : ''}>${w}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Observation Type ── -->
        <div class="form-section">
          <div class="form-section-header">Observation Type <span style="color:var(--red-600)">*</span></div>
          <div class="form-section-body">
            <div class="type-grid" id="type-grid"></div>
            <div id="type-prompts" style="margin-top:12px;display:none">
              <div style="font-size:12px;font-weight:600;color:var(--slate-500);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Inspection Checklist</div>
              <div id="type-prompts-list" style="display:flex;flex-direction:column;gap:6px"></div>
            </div>
          </div>
        </div>

        <!-- ── Status ── -->
        <div class="form-section">
          <div class="form-section-header">Compliance Status <span style="color:var(--red-600)">*</span></div>
          <div class="form-section-body">
            <div class="status-grid" id="status-grid"></div>
          </div>
        </div>

        <!-- ── Title & Description ── -->
        <div class="form-section">
          <div class="form-section-header">Title & Description</div>
          <div class="form-section-body">
            <div class="form-group">
              <label class="required">Title / Summary</label>
              <input type="text" id="f-title" value="${sanitizeHtml(isEdit ? (entry.title || '') : '')}" placeholder="Brief summary of the observation…" required maxlength="200">
            </div>
            <div class="form-group">
              <label>Detailed Description / Notes</label>
              <textarea id="f-description" rows="5" placeholder="Detailed observation notes, measurements, conditions, actions observed…">${sanitizeHtml(isEdit ? (entry.description || '') : '')}</textarea>
            </div>
          </div>
        </div>

        <!-- ── Photos ── -->
        <div class="form-section">
          <div class="form-section-header">Photos</div>
          <div class="form-section-body">
            <div class="media-grid" id="photos-grid"></div>
            <div class="media-buttons-row">
              <button type="button" class="btn btn-secondary btn-sm" id="photo-camera-btn">${icon('camera')} Camera</button>
              <button type="button" class="btn btn-secondary btn-sm" id="photo-upload-btn">${icon('layers')} Upload</button>
            </div>
            <input type="file" id="photo-camera-input" accept="image/*" capture="environment" hidden multiple>
            <input type="file" id="photo-file-input" accept="image/*" hidden multiple>
            <p class="help-text" style="margin-top:6px">JPEG, PNG, HEIC. Each file max 10MB.</p>
          </div>
        </div>

        <!-- ── Videos ── -->
        <div class="form-section">
          <div class="form-section-header">Videos</div>
          <div class="form-section-body">
            <div class="media-grid" id="videos-grid"></div>
            <div class="media-buttons-row">
              <button type="button" class="btn btn-secondary btn-sm" id="video-camera-btn">${icon('video')} Record</button>
              <button type="button" class="btn btn-secondary btn-sm" id="video-upload-btn">${icon('layers')} Upload</button>
            </div>
            <input type="file" id="video-camera-input" accept="video/*" capture="environment" hidden>
            <input type="file" id="video-file-input" accept="video/*" hidden multiple>
            <p class="help-text" style="margin-top:6px">MP4, WebM. Each file max 50MB.</p>
          </div>
        </div>

        <!-- ── GPS Location ── -->
        <div class="form-section">
          <div class="form-section-header">GPS Location</div>
          <div class="form-section-body">
            <div class="location-display" id="location-display">
              ${icon('map-pin')}
              <span id="location-text" style="flex:1">No location set</span>
            </div>
            <div id="entry-map-container"></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-secondary btn-sm" id="get-location-btn">${icon('map-pin')} Get Current Location</button>
              <button type="button" class="btn btn-ghost btn-sm" id="clear-location-btn" style="display:none">${icon('x')} Clear</button>
            </div>
            <div class="form-row" style="margin-top:12px">
              <div class="form-group">
                <label>Latitude</label>
                <input type="number" id="f-lat" step="any" placeholder="e.g. -33.8688">
              </div>
              <div class="form-group">
                <label>Longitude</label>
                <input type="number" id="f-lng" step="any" placeholder="e.g. 151.2093">
              </div>
            </div>
            <div class="form-group">
              <label>Location Description</label>
              <input type="text" id="f-location-addr" placeholder="e.g. North boundary fence, near Entry Gate 2">
            </div>
          </div>
        </div>

        <!-- ── Corrective Actions ── -->
        <div class="form-section">
          <div class="form-section-header">Corrective Actions</div>
          <div class="form-section-body">
            <div class="form-group">
              <label>Required Actions</label>
              <textarea id="f-corrective" rows="3" placeholder="Describe any corrective actions required to address this observation…">${sanitizeHtml(isEdit ? (entry.correctiveActions || '') : '')}</textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label style="flex-direction:row;align-items:center;gap:8px;cursor:pointer">
                  <input type="checkbox" id="f-followup" ${isEdit && entry.followUpRequired ? 'checked' : ''} style="width:auto">
                  Follow-up Required
                </label>
              </div>
              <div class="form-group" id="followup-date-group" style="${isEdit && entry.followUpRequired ? '' : 'opacity:0.4;pointer-events:none'}">
                <label>Follow-up By</label>
                <input type="date" id="f-followup-date" value="${isEdit && entry.followUpDate ? entry.followUpDate : ''}">
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tags ── -->
        <div class="form-section">
          <div class="form-section-header">Tags</div>
          <div class="form-section-body">
            <div class="form-group">
              <label>Tags</label>
              <div class="tags-input-wrapper" id="tags-wrapper">
                <input type="text" id="tag-input" placeholder="Type and press Enter to add tag…">
              </div>
              <div class="help-text">Press Enter or comma to add a tag</div>
            </div>
          </div>
        </div>

        <!-- ── Hidden submit (for keyboard) ── -->
        <button type="submit" hidden></button>
      </form>
    </div>
  `;

  // State for media and form
  const formState = {
    photos:   isEdit ? [...(entry.photos || [])] : [],
    videos:   isEdit ? [...(entry.videos || [])] : [],
    tags:     isEdit ? [...(entry.tags || [])] : [],
    type:     isEdit ? entry.type : null,
    status:   isEdit ? entry.status : null,
    location: isEdit ? (entry.location || null) : null,
  };

  // ── Type Grid ──
  const typeGrid = document.getElementById('type-grid');
  OBSERVATION_TYPES.forEach(type => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'type-chip';
    chip.dataset.type = type.id;
    chip.innerHTML = `<span class="type-dot" style="background:${type.color}"></span>${sanitizeHtml(type.label)}`;
    chip.title = type.description;

    chip.addEventListener('click', () => {
      typeGrid.querySelectorAll('.type-chip').forEach(c => {
        c.classList.remove('selected');
        c.style.background = '';
        c.style.borderColor = '';
        c.style.color = '';
      });
      chip.classList.add('selected');
      chip.style.background = type.color;
      chip.style.borderColor = type.color;
      chip.style.color = 'white';
      formState.type = type.id;

      // Show checklist prompts
      const promptsSection = document.getElementById('type-prompts');
      const promptsList = document.getElementById('type-prompts-list');
      if (type.prompts?.length) {
        promptsSection.style.display = 'block';
        promptsList.innerHTML = type.prompts.map(p => `
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:400;color:var(--slate-700);cursor:pointer">
            <input type="checkbox" style="width:auto;flex-shrink:0"> ${sanitizeHtml(p)}
          </label>
        `).join('');
      } else {
        promptsSection.style.display = 'none';
      }
    });

    if (isEdit && entry.type === type.id) {
      chip.click();
    }
    typeGrid.appendChild(chip);
  });

  // ── Status Grid ──
  const statusGrid = document.getElementById('status-grid');
  STATUS_TYPES.forEach(status => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-btn';
    btn.dataset.status = status.id;
    btn.innerHTML = `<div class="status-dot" style="background:${status.color}"></div>${sanitizeHtml(status.label)}`;

    btn.addEventListener('click', () => {
      statusGrid.querySelectorAll('.status-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = '';
        b.style.borderColor = '';
        b.style.color = '';
      });
      btn.classList.add('selected');
      btn.style.background = status.color;
      btn.style.borderColor = status.color;
      btn.style.color = 'white';
      formState.status = status.id;
    });

    if (isEdit && entry.status === status.id) {
      btn.click();
    }
    statusGrid.appendChild(btn);
  });

  // ── Photo handlers ──
  setupMediaHandlers('photo', formState, 'photos');
  setupMediaHandlers('video', formState, 'videos');

  // Render existing media
  renderMediaGrid('photos-grid', formState.photos, 'photo');
  renderMediaGrid('videos-grid', formState.videos, 'video');

  // ── Tags ──
  renderTags(formState.tags);
  setupTagInput(formState);

  // ── Location ──
  if (isEdit && entry.location?.lat) {
    setLocation(entry.location, formState);
  }

  document.getElementById('get-location-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('get-location-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Getting location…`;
    try {
      const pos = await getCurrentPosition();
      const loc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        address: document.getElementById('f-location-addr')?.value || '',
      };
      setLocation(loc, formState);
      toast('Location captured', 'success');
    } catch (err) {
      toast('Could not get location: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icon('map-pin')} Get Current Location`;
    }
  });

  document.getElementById('clear-location-btn')?.addEventListener('click', () => {
    formState.location = null;
    document.getElementById('location-text').textContent = 'No location set';
    document.getElementById('clear-location-btn').style.display = 'none';
    document.getElementById('entry-map-container').style.display = 'none';
    document.getElementById('f-lat').value = '';
    document.getElementById('f-lng').value = '';
    if (_map) { _map.remove(); _map = null; _marker = null; }
  });

  // Manual lat/lng entry
  const latInput = document.getElementById('f-lat');
  const lngInput = document.getElementById('f-lng');
  if (isEdit && entry.location?.lat) {
    latInput.value = entry.location.lat;
    lngInput.value = entry.location.lng;
  }

  const updateManualLocation = () => {
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setLocation({ lat, lng, accuracy: null, address: document.getElementById('f-location-addr')?.value || '' }, formState);
    }
  };

  latInput?.addEventListener('change', updateManualLocation);
  lngInput?.addEventListener('change', updateManualLocation);

  // ── Follow-up checkbox ──
  const followupCheck = document.getElementById('f-followup');
  const followupDateGroup = document.getElementById('followup-date-group');
  followupCheck?.addEventListener('change', () => {
    followupDateGroup.style.opacity = followupCheck.checked ? '1' : '0.4';
    followupDateGroup.style.pointerEvents = followupCheck.checked ? 'auto' : 'none';
  });

  // ── Save / Cancel ──
  document.getElementById('form-cancel-btn')?.addEventListener('click', () => {
    navigate(isEdit ? 'library' : 'dashboard');
  });

  const saveHandler = async (e) => {
    e?.preventDefault();
    await saveEntryForm(entry, formState, isEdit, project, navigate);
  };

  document.getElementById('form-save-btn')?.addEventListener('click', saveHandler);
  document.getElementById('entry-form')?.addEventListener('submit', saveHandler);
}

// ── Media Handlers ────────────────────────────────────────

function setupMediaHandlers(mediaType, formState, stateKey) {
  const cameraInput = document.getElementById(`${mediaType}-camera-input`);
  const fileInput = document.getElementById(`${mediaType}-file-input`);
  const cameraBtn = document.getElementById(`${mediaType}-camera-btn`);
  const uploadBtn = document.getElementById(`${mediaType}-upload-btn`);
  const maxSize = mediaType === 'photo' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
  const sizeLabel = mediaType === 'photo' ? '10MB' : '50MB';

  cameraBtn?.addEventListener('click', () => cameraInput?.click());
  uploadBtn?.addEventListener('click', () => fileInput?.click());

  const handleFiles = async (files) => {
    const gridId = `${stateKey}-grid`;
    for (const file of files) {
      if (file.size > maxSize) { toast(`${file.name} exceeds ${sizeLabel} limit`, 'error'); continue; }
      try {
        const b64 = await fileToBase64(file);
        formState[stateKey].push(b64);
        renderMediaGrid(gridId, formState[stateKey], mediaType);
      } catch { toast(`Failed to load ${file.name}`, 'error'); }
    }
  };

  cameraInput?.addEventListener('change', async (e) => {
    await handleFiles(Array.from(e.target.files || []));
    e.target.value = '';
  });

  fileInput?.addEventListener('change', async (e) => {
    await handleFiles(Array.from(e.target.files || []));
    e.target.value = '';
  });
}

function renderMediaGrid(gridId, items, type) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';

  items.forEach((src, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'media-thumb-wrapper';

    if (type === 'video' || isVideo(src)) {
      wrapper.innerHTML = `
        <video src="${src}" preload="metadata" muted style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius)"></video>
        <div class="video-play-icon">${icon('video')}</div>
        <button class="media-remove-btn" data-idx="${idx}" type="button">${icon('x')}</button>
      `;
    } else {
      wrapper.innerHTML = `
        <img src="${src}" alt="Photo ${idx+1}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius)">
        <button class="media-remove-btn" data-idx="${idx}" type="button">${icon('x')}</button>
      `;
    }

    // Click to preview
    wrapper.addEventListener('click', e => {
      if (e.target.closest('.media-remove-btn')) return;
      import('./utils.js').then(m => m.openLightbox(src, `${type} ${idx + 1}`));
    });

    // Remove button
    wrapper.querySelector('.media-remove-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      items.splice(idx, 1);
      renderMediaGrid(gridId, items, type);
    });

    grid.appendChild(wrapper);
  });

  // Add button
  const addBtn = document.createElement('div');
  addBtn.className = 'media-add-btn';
  addBtn.innerHTML = `${icon('plus')}<span>Add</span>`;
  addBtn.addEventListener('click', () => {
    const inputId = type === 'photo' ? 'photo-file-input' : 'video-file-input';
    document.getElementById(inputId)?.click();
  });
  grid.appendChild(addBtn);
}

// ── Tags ──────────────────────────────────────────────────

function renderTags(tags) {
  const wrapper = document.getElementById('tags-wrapper');
  if (!wrapper) return;

  // Remove existing tag chips (not the input)
  wrapper.querySelectorAll('.tag').forEach(t => t.remove());

  const input = wrapper.querySelector('#tag-input');
  tags.forEach((tag, idx) => {
    const chip = document.createElement('span');
    chip.className = 'tag';
    chip.innerHTML = `${sanitizeHtml(tag)}<button type="button" data-idx="${idx}">×</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      tags.splice(idx, 1);
      renderTags(tags);
    });
    wrapper.insertBefore(chip, input);
  });
}

function setupTagInput(formState) {
  const input = document.getElementById('tag-input');
  if (!input) return;

  const addTag = (value) => {
    const tag = value.trim().replace(/,/g, '');
    if (tag && !formState.tags.includes(tag)) {
      formState.tags.push(tag);
      renderTags(formState.tags);
    }
    input.value = '';
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input.value);
    } else if (e.key === 'Backspace' && !input.value && formState.tags.length > 0) {
      formState.tags.pop();
      renderTags(formState.tags);
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) addTag(input.value);
  });
}

// ── Location / Map ────────────────────────────────────────

function setLocation(loc, formState) {
  formState.location = loc;

  const text = document.getElementById('location-text');
  const clearBtn = document.getElementById('clear-location-btn');
  const mapContainer = document.getElementById('entry-map-container');
  const latInput = document.getElementById('f-lat');
  const lngInput = document.getElementById('f-lng');

  if (text) {
    text.innerHTML = `
      <span class="location-coords">${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</span>
      ${loc.accuracy ? `<span class="location-accuracy">±${Math.round(loc.accuracy)}m</span>` : ''}
    `;
  }
  if (clearBtn) clearBtn.style.display = 'inline-flex';
  if (latInput) latInput.value = loc.lat;
  if (lngInput) lngInput.value = loc.lng;

  // Show map
  if (mapContainer && window.L) {
    mapContainer.style.display = 'block';
    mapContainer.style.height = '200px';

    if (_map) {
      _map.setView([loc.lat, loc.lng], 16);
      if (_marker) _marker.setLatLng([loc.lat, loc.lng]);
      else {
        _marker = L.marker([loc.lat, loc.lng], { draggable: true }).addTo(_map);
        _marker.on('dragend', () => {
          const ll = _marker.getLatLng();
          setLocation({ ...formState.location, lat: ll.lat, lng: ll.lng }, formState);
        });
      }
    } else {
      _map = L.map(mapContainer, { zoomControl: true }).setView([loc.lat, loc.lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(_map);
      _marker = L.marker([loc.lat, loc.lng], { draggable: true }).addTo(_map);
      _marker.on('dragend', () => {
        const ll = _marker.getLatLng();
        setLocation({ ...formState.location, lat: ll.lat, lng: ll.lng }, formState);
      });
      // Click on map to move marker
      _map.on('click', e => {
        setLocation({ ...formState.location, lat: e.latlng.lat, lng: e.latlng.lng }, formState);
      });
    }
  }
}

// ── Save Entry ────────────────────────────────────────────

async function saveEntryForm(existingEntry, formState, isEdit, project, navigate) {
  // Validation
  const date = document.getElementById('f-date')?.value;
  const title = document.getElementById('f-title')?.value?.trim();

  if (!date) { toast('Please select a date', 'error'); return; }
  if (!formState.type) { toast('Please select an observation type', 'error'); return; }
  if (!formState.status) { toast('Please select a compliance status', 'error'); return; }
  if (!title) { toast('Please enter a title', 'error'); return; }

  const locationAddr = document.getElementById('f-location-addr')?.value?.trim();
  if (formState.location && locationAddr) {
    formState.location.address = locationAddr;
  }

  const order = isEdit ? (existingEntry.order ?? 1) : await getNextOrder(date);

  const entry = {
    id:               isEdit ? existingEntry.id : uuid(),
    date,
    time:             document.getElementById('f-time')?.value || nowTime(),
    order,
    type:             formState.type,
    status:           formState.status,
    title,
    description:      document.getElementById('f-description')?.value?.trim() || '',
    inspector:        document.getElementById('f-inspector')?.value?.trim() || '',
    weather:          document.getElementById('f-weather')?.value || '',
    temperature:      parseFloat(document.getElementById('f-temp')?.value) || null,
    windDirection:    document.getElementById('f-wind')?.value || '',
    photos:           formState.photos,
    videos:           formState.videos,
    location:         formState.location,
    correctiveActions: document.getElementById('f-corrective')?.value?.trim() || '',
    followUpRequired: document.getElementById('f-followup')?.checked || false,
    followUpDate:     document.getElementById('f-followup-date')?.value || '',
    tags:             formState.tags,
    createdAt:        isEdit ? existingEntry.createdAt : new Date().toISOString(),
    updatedAt:        new Date().toISOString(),
  };

  try {
    await saveEntry(entry);
    // Clean up map
    if (_map) { _map.remove(); _map = null; _marker = null; }
    toast(isEdit ? 'Entry updated' : 'Entry saved', 'success');
    navigate('library');
  } catch (err) {
    toast('Failed to save: ' + err.message, 'error');
  }
}
