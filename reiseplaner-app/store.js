// Zentrale Datenschicht. Aktuell localStorage-basiert; kann später durch
// einen Supabase-Backend-Adapter mit identischer Schnittstelle ersetzt
// werden, ohne dass index.html/trip.html geändert werden müssen.

const TRIPS_INDEX_KEY = 'reiseplaner.trips';
const TRIP_DATA_PREFIX = 'reiseplaner.trip.';

function uid() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function readIndex() {
  try {
    const raw = localStorage.getItem(TRIPS_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeIndex(list) {
  localStorage.setItem(TRIPS_INDEX_KEY, JSON.stringify(list));
}

const Store = {
  // Liste aller Reisen (Metadaten für die Übersicht)
  listTrips() {
    return readIndex().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  createTrip({ title, start }) {
    const id = uid();
    const now = new Date().toISOString();
    const meta = { id, title: title || 'Neue Reise', start: start || '', updatedAt: now, createdAt: now };
    const list = readIndex();
    list.push(meta);
    writeIndex(list);
    const initialState = { id, title: meta.title, start: meta.start, days: {} };
    localStorage.setItem(TRIP_DATA_PREFIX + id, JSON.stringify(initialState));
    return meta;
  },

  deleteTrip(id) {
    const list = readIndex().filter((t) => t.id !== id);
    writeIndex(list);
    localStorage.removeItem(TRIP_DATA_PREFIX + id);
  },

  getTripState(id) {
    try {
      const raw = localStorage.getItem(TRIP_DATA_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  saveTripState(id, state) {
    localStorage.setItem(TRIP_DATA_PREFIX + id, JSON.stringify(state));
    const list = readIndex();
    const meta = list.find((t) => t.id === id);
    if (meta) {
      meta.title = state.title || meta.title;
      meta.start = state.start || meta.start;
      meta.updatedAt = new Date().toISOString();
      writeIndex(list);
    }
  }
};
