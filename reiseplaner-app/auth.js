// Einfacher Passwortschutz (Variante 1: Frontend-Gate, keine echte Sicherheit,
// nur um Zufallsbesucher fernzuhalten — Supabase-Daten sind weiterhin per
// API-Key erreichbar, siehe MEMORY.md).
//
// Das aktuelle Passwort liegt in Supabase (Tabelle app_settings/app_settings_dev,
// siehe store.js: Store.getPassword/setPassword), damit es über
// "Passwort ändern" in der App geändert werden kann, ohne Code anzufassen.
// FALLBACK_PASSWORD greift nur, wenn Supabase gerade nicht erreichbar ist.
(function () {
  var STORAGE_KEY = 'reiseplaner_unlocked';
  var FALLBACK_PASSWORD = 'reise2027';

  if (localStorage.getItem(STORAGE_KEY) === 'yes') return;

  document.documentElement.style.visibility = 'hidden';

  async function currentPassword() {
    try {
      const p = await Store.getPassword();
      return p || FALLBACK_PASSWORD;
    } catch (e) {
      return FALLBACK_PASSWORD;
    }
  }

  function showGate() {
    document.documentElement.style.visibility = '';

    var overlay = document.createElement('div');
    overlay.id = 'authGate';
    overlay.innerHTML =
      '<div class="auth-box">' +
        '<h1>Reiseplaner</h1>' +
        '<p>Bitte Passwort eingeben</p>' +
        '<input type="password" id="authInput" placeholder="Passwort" autocomplete="current-password">' +
        '<p id="authError" class="auth-error" hidden>Falsches Passwort</p>' +
        '<button id="authSubmit" class="primary">Weiter</button>' +
      '</div>';
    document.body.appendChild(overlay);

    var input = document.getElementById('authInput');
    var error = document.getElementById('authError');

    async function tryUnlock() {
      var pw = await currentPassword();
      if (input.value === pw) {
        localStorage.setItem(STORAGE_KEY, 'yes');
        overlay.remove();
      } else {
        error.hidden = false;
        input.value = '';
        input.focus();
      }
    }

    document.getElementById('authSubmit').addEventListener('click', tryUnlock);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') tryUnlock();
    });
    input.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showGate);
  } else {
    showGate();
  }
})();

// Wird von der Passwort-ändern-UI (app.js) aufgerufen.
async function changeAppPassword(oldPassword, newPassword) {
  const current = await Store.getPassword();
  const effectiveCurrent = current || 'reise2027';
  if (oldPassword !== effectiveCurrent) {
    return { ok: false, error: 'wrong_password' };
  }
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, error: 'too_short' };
  }
  await Store.setPassword(newPassword);
  return { ok: true };
}
