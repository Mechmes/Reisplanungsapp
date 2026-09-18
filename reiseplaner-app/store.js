// Zentrale Datenschicht. Nutzt Supabase (Postgres über REST) als
// gemeinsam geteilten Speicher, damit alle mit dem Link denselben
// Stand sehen und bearbeiten können (kein Login nötig).

const SUPABASE_URL = 'https://gnjpwehxwhngqybazytc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fNPMfNKMepaI0t-PwAqGDA_wPolt1rm';
const TABLE = 'trips';
const SETTINGS_TABLE = 'app_settings';

function uid() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

async function rest(path, options = {}) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('Supabase-Fehler ' + res.status + ': ' + text);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const Store = {
  // Liste aller Reisen (Metadaten für die Übersicht)
  async listTrips() {
    const rows = await rest(
      TABLE + '?select=id,title,start,"end",creator,updated_at,created_at&order=updated_at.desc.nullslast'
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      start: r.start || '',
      creator: r.creator || '',
      updatedAt: r.updated_at,
      createdAt: r.created_at
    }));
  },

  async createTrip({ title, start, creator }) {
    const id = uid();
    const row = {
      id,
      title: title || 'Neue Reise',
      start: start || null,
      end: null,
      creator: creator || '',
      days: {}
    };
    const [created] = await rest(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(row)
    });
    return {
      id: created.id,
      title: created.title,
      start: created.start || '',
      creator: created.creator || '',
      updatedAt: created.updated_at
    };
  },

  async deleteTrip(id) {
    await rest(TABLE + '?id=eq.' + encodeURIComponent(id), { method: 'DELETE' });
  },

  async getTripState(id) {
    const rows = await rest(TABLE + '?id=eq.' + encodeURIComponent(id) + '&select=*');
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      title: r.title || '',
      start: r.start || '',
      end: r.end || '',
      creator: r.creator || '',
      days: r.days || {}
    };
  },

  async saveTripState(id, state) {
    await rest(TABLE + '?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: JSON.stringify({
        title: state.title || '',
        start: state.start || null,
        end: state.end || null,
        creator: state.creator || '',
        days: state.days || {},
        updated_at: new Date().toISOString()
      })
    });
  },

  // App-Passwort (Zugangsschutz, siehe auth.js) — liegt in Supabase statt
  // fest im Code, damit es über die Einstellungen änderbar ist.
  async getPassword() {
    const rows = await rest(SETTINGS_TABLE + '?key=eq.password&select=value');
    return rows.length ? rows[0].value : null;
  },

  async setPassword(newPassword) {
    await rest(SETTINGS_TABLE + '?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: 'password', value: newPassword, updated_at: new Date().toISOString() })
    });
  }
};
