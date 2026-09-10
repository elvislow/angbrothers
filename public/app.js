const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
let data = { entries: [], scripts: [] };
let viewDate = new Date();
const $ = selector => document.querySelector(selector);
const isoDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const escapeHtml = value => { const element = document.createElement('div'); element.textContent = value ?? ''; return element.innerHTML; };
const notice = message => { const element = $('#notice'); element.textContent = message; element.hidden = false; setTimeout(() => { element.hidden = true; }, 5000); };

function calendarCells(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date, key: isoDate(date), muted: date.getMonth() !== month };
  });
}

function statusClass(status) {
  if (status === 'In Review') return 'review';
  if (status === 'Scheduled' || status === 'Approved' || status === 'Completed') return 'scheduled';
  return 'draft';
}

function friendlyDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function render() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  $('#monthLabel').textContent = new Intl.DateTimeFormat('en-SG', { month: 'long', year: 'numeric' }).format(viewDate);
  $('#weekdays').innerHTML = weekdays.map(day => `<div>${day}</div>`).join('');
  $('#days').innerHTML = calendarCells(year, month).map(cell => {
    const events = data.entries.filter(entry => entry.date === cell.key);
    return `<div class="day ${cell.muted ? 'muted' : ''}"><span class="num">${cell.date.getDate()}</span>${events.map(entry => `<button class="event ${entry.type}" data-entry-id="${entry.id}" title="Click to edit">${escapeHtml(entry.title)}<small>${entry.time}${entry.channel ? ` · ${escapeHtml(entry.channel)}` : ''}</small></button>`).join('')}</div>`;
  }).join('');

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEntries = data.entries.filter(entry => entry.date?.startsWith(monthPrefix));
  const today = isoDate(new Date());
  const completed = monthEntries.filter(entry => entry.date < today).length;
  $('#plannedCount').textContent = monthEntries.length;
  $('#completedCount').textContent = completed;
  $('#progressBar').style.width = `${monthEntries.length ? Math.round(completed / monthEntries.length * 100) : 0}%`;

  $('#scriptList').innerHTML = data.scripts.length ? data.scripts.map(script => `<button class="row script-row" data-script-id="${script.id}" title="Click to edit"><strong>▤　${escapeHtml(script.title)}<small>${script.fileName ? escapeHtml(script.fileName) : 'Script details'}</small></strong><span>${escapeHtml(script.owner || 'Unassigned')}</span><span>${friendlyDate(script.date)}</span><i class="status ${statusClass(script.status)}">${escapeHtml(script.status)}</i></button>`).join('') : '<div class="empty">No scripts yet. Upload your first script to get started.</div>';
}

async function load() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Load failed');
    data = await response.json();
    data.entries = (data.entries || []).map(entry => ({ ...entry, date: entry.date || `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}` }));
    data.scripts = data.scripts || [];
    render();
  } catch { notice('Could not load shared data.'); }
}

const schedule = $('#scheduleDialog');
const upload = $('#uploadDialog');
const scriptDialog = $('#scriptDialog');
const scheduleForm = $('#scheduleForm');
const uploadForm = $('#uploadForm');
const scriptForm = $('#scriptForm');

function openScheduleCreate() {
  scheduleForm.reset();
  scheduleForm.elements.id.value = '';
  scheduleForm.elements.date.value = isoDate(new Date());
  scheduleForm.elements.time.value = '10:00';
  $('#scheduleTitle').textContent = 'Add Content Schedule';
  $('#scheduleDescription').textContent = 'Schedule a shoot or social media post.';
  $('#scheduleSubmit').textContent = 'Add to Calendar';
  schedule.showModal();
}

function openScheduleEdit(id) {
  const entry = data.entries.find(item => String(item.id) === String(id));
  if (!entry) return;
  scheduleForm.elements.id.value = entry.id;
  scheduleForm.elements.title.value = entry.title;
  scheduleForm.elements.type.value = entry.type;
  scheduleForm.elements.date.value = entry.date;
  scheduleForm.elements.time.value = entry.time;
  scheduleForm.elements.channel.value = entry.channel || '';
  $('#scheduleTitle').textContent = 'Edit Schedule';
  $('#scheduleDescription').textContent = 'Update this shoot or social media post.';
  $('#scheduleSubmit').textContent = 'Save Changes';
  schedule.showModal();
}

function openScriptEdit(id) {
  const script = data.scripts.find(item => String(item.id) === String(id));
  if (!script) return;
  scriptForm.elements.id.value = script.id;
  scriptForm.elements.title.value = script.title;
  scriptForm.elements.owner.value = script.owner || '';
  scriptForm.elements.date.value = script.date || '';
  scriptForm.elements.status.value = script.status;
  const link = $('#scriptFileLink');
  link.hidden = !script.fileUrl;
  link.href = script.fileUrl || '#';
  scriptDialog.showModal();
}

function openUpload() {
  uploadForm.reset();
  uploadForm.elements.date.value = isoDate(new Date());
  upload.showModal();
}

$('#addBtn').onclick = openScheduleCreate;
$('#uploadBtn').onclick = openUpload;
$('#uploadListBtn').onclick = openUpload;
$('#prevMonth').onclick = () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); render(); };
$('#nextMonth').onclick = () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); render(); };
$('#todayBtn').onclick = () => { viewDate = new Date(); render(); };
$('#days').onclick = event => { const card = event.target.closest('[data-entry-id]'); if (card) openScheduleEdit(card.dataset.entryId); };
$('#scriptList').onclick = event => { const row = event.target.closest('[data-script-id]'); if (row) openScriptEdit(row.dataset.scriptId); };
document.querySelectorAll('.close,.cancel').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
uploadForm.elements.file.onchange = event => { if (!uploadForm.elements.title.value && event.target.files[0]) uploadForm.elements.title.value = event.target.files[0].name.replace(/\.[^.]+$/, ''); };

scheduleForm.onsubmit = async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  const isEditing = Boolean(body.id);
  const response = await fetch('/api/data', { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) return notice(result.error);
  if (isEditing) data.entries[data.entries.findIndex(item => String(item.id) === String(result.id))] = result;
  else data.entries.push(result);
  viewDate = new Date(`${result.date}T12:00:00`);
  render();
  schedule.close();
  notice(isEditing ? 'Schedule updated and shared.' : 'Schedule saved and shared.');
};

scriptForm.onsubmit = async event => {
  event.preventDefault();
  const body = { ...Object.fromEntries(new FormData(event.target)), resource: 'script' };
  const response = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) return notice(result.error);
  data.scripts[data.scripts.findIndex(item => String(item.id) === String(result.id))] = result;
  render();
  scriptDialog.close();
  notice('Script details updated and shared.');
};

uploadForm.onsubmit = async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const file = form.get('file');
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) return notice('File must be under 10MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  const uploadResponse = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, type: file.type, data: btoa(binary) }) });
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok) return notice(uploaded.error);
  const body = { resource: 'script', title: form.get('title'), owner: form.get('owner'), date: form.get('date'), status: form.get('status'), fileName: file.name, fileUrl: uploaded.url };
  const response = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) return notice(result.error);
  data.scripts.push(result);
  render();
  upload.close();
  notice('Script uploaded and added to the editable list.');
};

load();
