// ════════════════════════════════════════════════════════════
//  EnviroLog — IndexedDB Data Layer
// ════════════════════════════════════════════════════════════

const DB_NAME = 'EnviroLog';
const DB_VERSION = 1;

let _db = null;

export async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => { _db = req.result; resolve(_db); };

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Entries store
      if (!db.objectStoreNames.contains('entries')) {
        const store = db.createObjectStore('entries', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('dateOrder', ['date', 'order'], { unique: false });
      }

      // Settings store (project info, preferences)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// ── Generic CRUD ──────────────────────────────────────────

export async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut(store, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Settings ──────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  const item = await dbGet('settings', key);
  return item !== undefined ? item.value : defaultValue;
}

export async function setSetting(key, value) {
  await dbPut('settings', { key, value });
}

// ── Entries ───────────────────────────────────────────────

export async function getAllEntries() {
  const entries = await dbGetAll('entries');
  return entries.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    return dateComp !== 0 ? dateComp : (a.order ?? 0) - (b.order ?? 0);
  });
}

export async function getEntry(id) {
  return dbGet('entries', id);
}

export async function saveEntry(entry) {
  entry.updatedAt = new Date().toISOString();
  if (!entry.createdAt) entry.createdAt = entry.updatedAt;
  await dbPut('entries', entry);
}

export async function deleteEntry(id) {
  await dbDelete('entries', id);
}

export async function getEntriesByDate(date) {
  const all = await dbGetAll('entries');
  return all
    .filter(e => e.date === date)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getEntriesByDateRange(startDate, endDate) {
  const all = await dbGetAll('entries');
  return all
    .filter(e => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : (a.order ?? 0) - (b.order ?? 0);
    });
}

export async function getNextOrder(date) {
  const entries = await getEntriesByDate(date);
  if (entries.length === 0) return 1;
  return Math.max(...entries.map(e => e.order ?? 0)) + 1;
}

export async function getEntryDates() {
  const all = await dbGetAll('entries');
  const dates = [...new Set(all.map(e => e.date))];
  return dates.sort();
}
