const $tripList = document.getElementById('tripList');
const $emptyState = document.getElementById('emptyState');
const $newTripBtn = document.getElementById('newTripBtn');
const $newTripModal = document.getElementById('newTripModal');
const $tripTitle = document.getElementById('tripTitle');
const $tripStart = document.getElementById('tripStart');
const $tripCreator = document.getElementById('tripCreator');
const $cancelNewTrip = document.getElementById('cancelNewTrip');
const $confirmNewTrip = document.getElementById('confirmNewTrip');
const $deleteModal = document.getElementById('deleteModal');
const $deleteTripName = document.getElementById('deleteTripName');
const $cancelDelete = document.getElementById('cancelDelete');
const $confirmDelete = document.getElementById('confirmDelete');

let tripPendingDelete = null;

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function render() {
  const trips = Store.listTrips();
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

    if (trip.creator) {
      const creator = document.createElement('div');
      creator.className = 'meta';
      creator.textContent = 'Erstellt von: ' + trip.creator;
      info.appendChild(creator);
    }

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
  $tripCreator.value = '';
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

$confirmNewTrip.addEventListener('click', () => {
  const title = $tripTitle.value.trim();
  const start = $tripStart.value;
  const creator = $tripCreator.value.trim();
  const trip = Store.createTrip({ title, start, creator });
  closeNewTripModal();
  window.location.href = 'trip.html?id=' + encodeURIComponent(trip.id);
});

$cancelDelete.addEventListener('click', closeDeleteModal);
$deleteModal.addEventListener('click', (e) => {
  if (e.target === $deleteModal) closeDeleteModal();
});

$confirmDelete.addEventListener('click', () => {
  if (tripPendingDelete) {
    Store.deleteTrip(tripPendingDelete.id);
  }
  closeDeleteModal();
  render();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

render();
