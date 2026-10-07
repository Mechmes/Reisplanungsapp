// Zentrale Datenschicht. Nutzt Supabase (Postgres über REST) als
// gemeinsam geteilten Speicher. Alle Anfragen laufen mit dem Token des
// angemeldeten Benutzers (siehe auth.js); ohne Anmeldung gibt die
// Datenbank nichts heraus.

const SUPABASE_URL = 'https://gnjpwehxwhngqybazytc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fNPMfNKMepaI0t-PwAqGDA_wPolt1rm';
// Dev-Umgebung: eigene Tabelle, damit Testdaten nie mit den echten
// Reisedaten (Tabelle "trips" in der Produktion) vermischt werden.
const TABLE = 'trips_dev';

function uid() {
  return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

async function rest(path, options = {}) {
  const token = await Auth.getAccessToken();
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    Auth.expire();
    throw new Error('Sitzung abgelaufen');
  }
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
  }
};
