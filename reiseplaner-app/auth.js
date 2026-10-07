// Login über Supabase Auth (E-Mail + Passwort). Ohne gültige Sitzung zeigt
// die App nur den Anmeldeschirm; die Datenbank (RLS, siehe
// supabase_setup_auth_dev.sql) liefert ohne Anmeldung und ohne Eintrag in
// app_users ohnehin keine Daten. Benutzer werden in Supabase angelegt, es
// gibt keine Selbst-Registrierung in der App.
//
// Spricht die Auth-REST-API direkt an (kein supabase-js), analog zu store.js.
// Die Sitzung (Access- + Refresh-Token) liegt in localStorage, damit man auf
// einem Gerät angemeldet bleibt; der Access-Token wird bei Bedarf erneuert.
const Auth = (function () {
  const SESSION_KEY = 'reiseplaner_session';

  // Überbleibsel des alten Passwortschirms entfernen.
  localStorage.removeItem('reiseplaner_unlocked');

  let session = loadSession();
  let refreshing = null;

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  function setSession(data) {
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + data.expires_in,
      email: data.user ? data.user.email : session && session.email
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    session = null;
    localStorage.removeItem(SESSION_KEY);
  }

  async function authFetch(path, { method = 'POST', body, token } = {}) {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(SUPABASE_URL + '/auth/v1/' + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text().catch(() => '');
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && (data.msg || data.error_description || data.message)) || 'Auth-Fehler ' + res.status);
      err.status = res.status;
      err.code = data && (data.error_code || data.error);
      throw err;
    }
    return data;
  }

  function signInRequest(email, password) {
    return authFetch('token?grant_type=password', { body: { email, password } });
  }

  async function refresh() {
    if (!refreshing) {
      refreshing = authFetch('token?grant_type=refresh_token', {
        body: { refresh_token: session.refresh_token }
      })
        .then(setSession)
        .finally(() => {
          refreshing = null;
        });
    }
    return refreshing;
  }

  // Sitzung ungültig (abgelaufen, widerrufen, Benutzer gelöscht): zurück
  // zum Anmeldeschirm.
  function expire() {
    clearSession();
    window.location.reload();
  }

  async function getAccessToken() {
    if (!session) {
      expire();
      throw new Error('Nicht angemeldet');
    }
    if (session.expires_at - 60 < Date.now() / 1000) {
      try {
        await refresh();
      } catch (e) {
        if (e.status) expire();
        throw e;
      }
    }
    return session.access_token;
  }

  // Ist der angemeldete Benutzer in app_users freigeschaltet?
  async function isMember(token) {
    const res = await fetch(SUPABASE_URL + '/rest/v1/app_users?select=user_id', {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Supabase-Fehler ' + res.status);
    const rows = await res.json();
    return rows.length > 0;
  }

  async function signOut() {
    const token = session && session.access_token;
    clearSession();
    if (token) {
      await authFetch('logout', { token }).catch(() => {});
    }
    window.location.href = 'index.html';
  }

  async function changePassword(currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: 'too_short' };
    }
    // Aktuelles Passwort durch erneutes Anmelden prüfen; die frische Sitzung
    // erfüllt zugleich Supabases Anforderung einer kürzlichen Anmeldung.
    try {
      setSession(await signInRequest(session.email, currentPassword));
    } catch (e) {
      if (e.status === 400) return { ok: false, error: 'wrong_password' };
      throw e;
    }
    try {
      await authFetch('user', { method: 'PUT', token: session.access_token, body: { password: newPassword } });
    } catch (e) {
      if (e.code === 'same_password') return { ok: false, error: 'same_password' };
      if (e.code === 'weak_password') return { ok: false, error: 'weak_password' };
      throw e;
    }
    return { ok: true };
  }

  function showGate(onSuccess) {
    const overlay = document.createElement('div');
    overlay.id = 'authGate';
    overlay.innerHTML =
      '<form class="auth-box" novalidate>' +
        '<h1>Reiseplaner</h1>' +
        '<p>Bitte anmelden</p>' +
        '<input type="email" id="authEmail" placeholder="E-Mail" autocomplete="username" required>' +
        '<input type="password" id="authInput" placeholder="Passwort" autocomplete="current-password" required>' +
        '<p id="authError" class="auth-error" hidden></p>' +
        '<button type="submit" id="authSubmit" class="primary">Anmelden</button>' +
      '</form>';
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = '';

    const form = overlay.querySelector('form');
    const emailInput = document.getElementById('authEmail');
    const pwInput = document.getElementById('authInput');
    const error = document.getElementById('authError');
    const submit = document.getElementById('authSubmit');

    function showError(msg) {
      error.textContent = msg;
      error.hidden = false;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      error.hidden = true;
      submit.disabled = true;
      try {
        const data = await signInRequest(emailInput.value.trim(), pwInput.value);
        if (!(await isMember(data.access_token))) {
          await authFetch('logout', { token: data.access_token }).catch(() => {});
          showError('Dieses Konto ist für den Reiseplaner nicht freigeschaltet.');
          return;
        }
        setSession(data);
        overlay.remove();
        onSuccess();
      } catch (err) {
        pwInput.value = '';
        showError(err.status === 400 ? 'E-Mail oder Passwort falsch.' : 'Anmeldung fehlgeschlagen: ' + err.message);
        pwInput.focus();
      } finally {
        submit.disabled = false;
      }
    });
    emailInput.focus();
  }

  // Wird erfüllt, sobald eine Sitzung besteht. app.js/trip.js laden ihre
  // Daten erst danach.
  const ready = new Promise((resolve) => {
    if (session) {
      resolve();
      return;
    }
    document.documentElement.style.visibility = 'hidden';
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => showGate(resolve));
    } else {
      showGate(resolve);
    }
  });

  return {
    ready,
    getAccessToken,
    expire,
    signOut,
    changePassword,
    email: () => (session ? session.email : '')
  };
})();
