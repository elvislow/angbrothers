const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
let data = { entries: [], scripts: [] };
const $ = selector => document.querySelector(selector);
const notice = message => {
  const element = $('#notice');
  element.textContent = message;
  element.hidden = false;
  setTimeout(() => { element.hidden = true; }, 5000);
};

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value ?? '';
  return element.innerHTML;
}

function render() {
  $('#weekdays').innerHTML = weekdays.map(day => `<div>${day}</div>`).join('');
  const cells = [{ day: 31, muted: true }, ...Array.from({ length: 30 }, (_, index) => ({ day: index + 1 })), ...[1, 2, 3, 4].map(day => ({ day, muted: true }))];
  $('#days').innerHTML = cells.map(cell => `<div class="day ${cell.muted ? 'muted' : ''}"><span class="num">${cell.day}</span>${cell.muted ? '' : data.entries.filter(entry => entry.day === cell.day).map(entry => `<button class="event ${entry.type}" data-entry-id="${entry.id}">${escapeHtml(entry.title)}<small>${entry.time}${entry.channel ? ` · ${escapeHtml(entry.channel)}` : ''}</small></button>`).join('')}</div>`).join('');
  $('#scriptList').innerHTML = data.scripts.map(script => `<div class="row"><strong>▤　${escapeHtml(script.title)}<small>Short-form video script · v1</small></strong><span>${escapeHtml(script.owner)}</span><span>${escapeHtml(script.date)}</span><i class="status ${script.status.toLowerCase().replace('in review', 'review')}">${escapeHtml(script.status)}</i></div>`).join('');
}

async function load() {
  try {
    const response = await fetch('/api/data');
    data = await response.json();
    render();
  } catch { notice('Could not load shared data.'); }
}

const schedule = $('#scheduleDialog');
const upload = $('#uploadDialog');
const scheduleForm = $('#scheduleForm');

function openCreate() {
  scheduleForm.reset();
  scheduleForm.elements.id.value = '';
  scheduleForm.elements.date.value = '2026-09-18';
  scheduleForm.elements.time.value = '10:00';
  $('#scheduleTitle').textContent = 'Add Content Schedule';
  $('#scheduleDescription').textContent = 'Schedule a shoot or social media post.';
  $('#scheduleSubmit').textContent = 'Add to Calendar';
  schedule.showModal();
}

function openEdit(id) {
  const entry = data.entries.find(item => String(item.id) === String(id));
  if (!entry) return;
  scheduleForm.elements.id.value = entry.id;
  scheduleForm.elements.title.value = entry.title;
  scheduleForm.elements.type.value = entry.type;
  scheduleForm.elements.date.value = `2026-09-${String(entry.day).padStart(2, '0')}`;
  scheduleForm.elements.time.value = entry.time;
  scheduleForm.elements.channel.value = entry.channel || '';
  $('#scheduleTitle').textContent = 'Edit Schedule';
  $('#scheduleDescription').textContent = 'Update this shoot or social media post.';
  $('#scheduleSubmit').textContent = 'Save Changes';
  schedule.showModal();
}

$('#addBtn').onclick = openCreate;
$('#uploadBtn').onclick = () => upload.showModal();
$('#days').onclick = event => {
  const card = event.target.closest('[data-entry-id]');
  if (card) openEdit(card.dataset.entryId);
};
document.querySelectorAll('.close,.cancel').forEach(button => { button.onclick = () => button.closest('dialog').close(); });

scheduleForm.onsubmit = async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  const isEditing = Boolean(body.id);
  const response = await fetch('/api/data', { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) return notice(result.error);
  if (isEditing) {
    const index = data.entries.findIndex(item => String(item.id) === String(result.id));
    data.entries[index] = result;
  } else data.entries.push(result);
  render();
  schedule.close();
  event.target.reset();
  notice(isEditing ? 'Schedule updated and shared.' : 'Schedule saved and shared.');
};

$('#uploadForm').onsubmit = async event => {
  event.preventDefault();
  const file = new FormData(event.target).get('file');
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  const response = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, type: file.type, data: btoa(binary) }) });
  const result = await response.json();
  if (!response.ok) return notice(result.error);
  upload.close();
  notice('Script uploaded successfully.');
};

load();
