const params = new URLSearchParams(window.location.search);
const tripId = params.get('id');

const $titleInput = document.getElementById('titleInput');
const $startInput = document.getElementById('startInput');
const $endInput = document.getElementById('endInput');
const $daysContainer = document.getElementById('daysContainer');
const $addDayBtn = document.getElementById('addDayBtn');
const $saveBtn = document.getElementById('saveBtn');
const $statusText = document.getElementById('statusText');

if (!tripId) {
  window.location.href = 'index.html';
}

let state = null;
let dirty = false;
let saving = false;

function setStatus() {
  if (saving) {
    $statusText.textContent = 'Wird gespeichert …';
  } else if (dirty) {
    $statusText.textContent = 'Ungespeicherte Änderungen';
  } else {
    $statusText.textContent = 'Gespeichert';
  }
  $saveBtn.disabled = saving || !dirty;
}

function markDirty() {
  dirty = true;
  setStatus();
}

function dayKeys() {
  return Object.keys(state.days || {}).sort((a, b) => Number(a) - Number(b));
}

function dateForDay(key) {
  if (!state.start) return '';
  const d = new Date(state.start + 'T00:00:00');
  d.setDate(d.getDate() + (Number(key) - 1));
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diffDaysInclusive(start, end) {
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  const days = Math.round((b - a) / 86400000) + 1;
  return days > 0 ? days : 0;
}

function syncDaysFromDates() {
  if (!state.start || !state.end) return;
  const count = diffDaysInclusive(state.start, state.end);
  if (!count) return;
  state.days = state.days || {};
  for (let i = 1; i <= count; i++) {
    if (!(i in state.days)) state.days[i] = emptyDay();
  }
  Object.keys(state.days).forEach((key) => {
    if (Number(key) > count) delete state.days[key];
  });
}

function emptyDay() {
  return { title: '', hotel: '', description: '' };
}

// Migriert alte Tage, die noch als reiner Text (statt Objekt) gespeichert sind.
function normalizeDay(value) {
  if (value && typeof value === 'object') {
    return { title: value.title || '', hotel: value.hotel || '', description: value.description || '' };
  }
  return { title: '', hotel: '', description: value || '' };
}

function renderDays() {
  $daysContainer.innerHTML = '';
  dayKeys().forEach((key) => {
    state.days[key] = normalizeDay(state.days[key]);
    const day = state.days[key];

    const block = document.createElement('div');
    block.className = 'day-block';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const h3 = document.createElement('h3');
    const dateLabel = dateForDay(key);
    h3.textContent = 'Tag ' + key + (dateLabel ? ' · ' + dateLabel : '');

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      delete state.days[key];
      markDirty();
      renderDays();
    });

    header.appendChild(h3);
    header.appendChild(delBtn);
    block.appendChild(header);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'day-field-title';
    titleInput.placeholder = 'Titel';
    titleInput.value = day.title;
    titleInput.addEventListener('input', () => {
      day.title = titleInput.value;
      markDirty();
    });
    block.appendChild(titleInput);

    const hotelInput = document.createElement('input');
    hotelInput.type = 'text';
    hotelInput.className = 'day-field-hotel';
    hotelInput.placeholder = 'Hotel';
    hotelInput.value = day.hotel;
    hotelInput.addEventListener('input', () => {
      day.hotel = hotelInput.value;
      markDirty();
    });
    block.appendChild(hotelInput);

    const descTextarea = document.createElement('textarea');
    descTextarea.className = 'day-field-description';
    descTextarea.placeholder = 'Beschreibung, Programm, Notizen …';
    descTextarea.value = day.description;
    descTextarea.addEventListener('input', () => {
      day.description = descTextarea.value;
      markDirty();
    });
    block.appendChild(descTextarea);

    $daysContainer.appendChild(block);
  });
}

function render() {
  $titleInput.value = state.title || '';
  $startInput.value = state.start || '';
  $endInput.value = state.end || '';
  renderDays();
  setStatus();
}

$titleInput.addEventListener('input', () => {
  state.title = $titleInput.value;
  markDirty();
});

$startInput.addEventListener('input', () => {
  state.start = $startInput.value;
  syncDaysFromDates();
  markDirty();
  renderDays();
});

$endInput.addEventListener('input', () => {
  state.end = $endInput.value;
  syncDaysFromDates();
  markDirty();
  renderDays();
});

$addDayBtn.addEventListener('click', () => {
  const keys = dayKeys().map(Number);
  const next = keys.length ? Math.max(...keys) + 1 : 1;
  state.days[next] = emptyDay();
  markDirty();
  renderDays();
});

async function persist() {
  if (saving || !dirty) return;
  saving = true;
  setStatus();
  try {
    await Store.saveTripState(tripId, state);
    dirty = false;
  } catch (e) {
    alert('Speichern fehlgeschlagen: ' + e.message);
  }
  saving = false;
  setStatus();
}

$saveBtn.addEventListener('click', persist);

window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

async function init() {
  try {
    state = await Store.getTripState(tripId);
  } catch (e) {
    alert('Reise konnte nicht geladen werden: ' + e.message);
  }
  if (!state) {
    window.location.href = 'index.html';
    return;
  }
  render();
}

init();
