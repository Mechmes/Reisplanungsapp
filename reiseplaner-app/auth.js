// Einfacher Passwortschutz (Variante 1: Frontend-Gate, keine echte Sicherheit,
// nur um Zufallsbesucher fernzuhalten — Supabase-Daten sind weiterhin per
// API-Key erreichbar, siehe MEMORY.md).
(function () {
  var APP_PASSWORD = 'reise2027';
  var STORAGE_KEY = 'reiseplaner_unlocked';

  if (localStorage.getItem(STORAGE_KEY) === 'yes') return;

  document.documentElement.style.visibility = 'hidden';

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

    function tryUnlock() {
      if (input.value === APP_PASSWORD) {
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
