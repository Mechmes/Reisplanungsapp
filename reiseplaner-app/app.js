const $tripList = document.getElementById('tripList');
const $emptyState = document.getElementById('emptyState');
const $newTripBtn = document.getElementById('newTripBtn');
const $newTripModal = document.getElementById('newTripModal');
const $tripTitle = document.getElementById('tripTitle');
const $tripStart = document.getElementById('tripStart');
const $cancelNewTrip = document.getElementById('cancelNewTrip');
const $confirmNewTrip = document.getElementById('confirmNewTrip');
const $deleteModal = document.getElementById('deleteModal');
const $deleteTripName = document.getElementById('deleteTripName');
const $cancelDelete = document.getElementById('cancelDelete');
const $confirmDelete = document.getElementById('confirmDelete');
const $settingsBtn = document.getElementById('settingsBtn');
const $passwordModal = document.getElementById('passwordModal');
const $oldPassword = document.getElementById('oldPassword');
const $newPassword = document.getElementById('newPassword');
const $newPasswordRepeat = document.getElementById('newPasswordRepeat');
const $passwordError = document.getElementById('passwordError');
const $passwordSuccess = document.getElementById('passwordSuccess');
const $cancelPassword = document.getElementById('cancelPassword');
const $confirmPassword = document.getElementById('confirmPassword');

let tripPendingDelete = null;

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function render() {
  const trips = await Store.listTrips();
  $tripList.innerHTML = '';
  $emptyState.hidden = trips.length > 0;

  trips.forEach((trip) => {
    const card = document.createElement('div');
    card.className = 'trip-card';

    const info = document.createElement('div');
    info.className = 'info';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = trip.title;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = trip.start ? 'Start: ' + formatDate(trip.start) : 'Kein Startdatum';
    info.appendChild(title);
    info.appendChild(meta);

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.textContent = '🗑';
    delBtn.setAttribute('aria-label', 'Reise löschen');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(trip);
    });

    card.appendChild(info);
    card.appendChild(delBtn);
    card.addEventListener('click', () => {
      window.location.href = 'trip.html?id=' + encodeURIComponent(trip.id);
    });

    $tripList.appendChild(card);
  });
}

function openNewTripModal() {
  $tripTitle.value = '';
  $tripStart.value = '';
  $newTripModal.hidden = false;
  setTimeout(() => $tripTitle.focus(), 50);
}

function closeNewTripModal() {
  $newTripModal.hidden = true;
}

function openDeleteModal(trip) {
  tripPendingDelete = trip;
  $deleteTripName.textContent = trip.title;
  $deleteModal.hidden = false;
}

function closeDeleteModal() {
  tripPendingDelete = null;
  $deleteModal.hidden = true;
}

$newTripBtn.addEventListener('click', openNewTripModal);
$cancelNewTrip.addEventListener('click', closeNewTripModal);
$newTripModal.addEventListener('click', (e) => {
  if (e.target === $newTripModal) closeNewTripModal();
});

$confirmNewTrip.addEventListener('click', async () => {
  const title = $tripTitle.value.trim();
  const start = $tripStart.value;
  $confirmNewTrip.disabled = true;
  try {
    const trip = await Store.createTrip({ title, start });
    closeNewTripModal();
    window.location.href = 'trip.html?id=' + encodeURIComponent(trip.id);
  } catch (e) {
    alert('Reise konnte nicht angelegt werden: ' + e.message);
  } finally {
    $confirmNewTrip.disabled = false;
  }
});

$cancelDelete.addEventListener('click', closeDeleteModal);
$deleteModal.addEventListener('click', (e) => {
  if (e.target === $deleteModal) closeDeleteModal();
});

$confirmDelete.addEventListener('click', async () => {
  if (tripPendingDelete) {
    try {
      await Store.deleteTrip(tripPendingDelete.id);
    } catch (e) {
      alert('Reise konnte nicht gelöscht werden: ' + e.message);
    }
  }
  closeDeleteModal();
  render();
});

function openPasswordModal() {
  $oldPassword.value = '';
  $newPassword.value = '';
  $newPasswordRepeat.value = '';
  $passwordError.hidden = true;
  $passwordSuccess.hidden = true;
  $passwordModal.hidden = false;
  setTimeout(() => $oldPassword.focus(), 50);
}

function closePasswordModal() {
  $passwordModal.hidden = true;
}

$settingsBtn.addEventListener('click', openPasswordModal);
$cancelPassword.addEventListener('click', closePasswordModal);
$passwordModal.addEventListener('click', (e) => {
  if (e.target === $passwordModal) closePasswordModal();
});

$confirmPassword.addEventListener('click', async () => {
  $passwordError.hidden = true;
  $passwordSuccess.hidden = true;

  if ($newPassword.value !== $newPasswordRepeat.value) {
    $passwordError.textContent = 'Die beiden neuen Passwörter stimmen nicht überein.';
    $passwordError.hidden = false;
    return;
  }

  $confirmPassword.disabled = true;
  try {
    const result = await changeAppPassword($oldPassword.value, $newPassword.value);
    if (result.ok) {
      $passwordSuccess.hidden = false;
      $oldPassword.value = '';
      $newPassword.value = '';
      $newPasswordRepeat.value = '';
    } else {
      $passwordError.textContent =
        result.error === 'too_short'
          ? 'Neues Passwort muss mindestens 4 Zeichen haben.'
          : 'Aktuelles Passwort ist falsch.';
      $passwordError.hidden = false;
    }
  } catch (e) {
    $passwordError.textContent = 'Fehler: ' + e.message;
    $passwordError.hidden = false;
  } finally {
    $confirmPassword.disabled = false;
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

render();
