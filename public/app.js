const weekdays=["MON","TUE","WED","THU","FRI","SAT","SUN"];let data={contents:[]},viewDate=new Date;const $=t=>document.querySelector(t),$$=t=>[...document.querySelectorAll(t)],isoDate=t=>`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`,escapeHtml=t=>{const e=document.createElement("div");return e.textContent=t??"",e.innerHTML};function notice(t,e="info"){const o=$("#notice");o.textContent=t,o.dataset.type=e,o.hidden=!1,setTimeout(()=>{o.hidden=!0},5e3)}function calendarCells(t,e){const o=(new Date(t,e,1).getDay()+6)%7,n=new Date(t,e,1-o);return Array.from({length:42},(t,o)=>{const a=new Date(n);return a.setDate(n.getDate()+o),{date:a,key:isoDate(a),muted:a.getMonth()!==e}})}function friendlyDate(t){return t?new Intl.DateTimeFormat("en-SG",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${t}T12:00:00`)):"Not scheduled"}function scheduledMilestones(t){return[t.shootDate?{type:"shoot",status:t.shootStatus,done:"Completed"===t.shootStatus}:null,t.postDate?{type:"post",status:t.postStatus,done:"Published"===t.postStatus}:null].filter(Boolean)}function isComplete(t){const e=scheduledMilestones(t);return e.length>0&&e.every(t=>t.done)}function progressLabel(t){return isComplete(t)?{text:"Completed",className:"complete"}:"Scheduled"===t.postStatus?{text:"Post scheduled",className:"scheduled"}:"Completed"===t.shootStatus?{text:"Ready to post",className:"review"}:"Approved"===t.scriptStatus?{text:"Ready to shoot",className:"review"}:{text:"In progress",className:"draft"}}function activeFilters(){return{search:$("#searchInput").value.trim().toLowerCase(),platform:$("#platformFilter").value,type:$("#typeFilter").value,status:$("#statusFilter").value}}function filteredContents(){const t=activeFilters();return data.contents.filter(e=>{const r=`${e.title} ${e.script} ${e.owner}`.toLowerCase();return!(t.search&&!r.includes(t.search))&&(!(t.platform&&!e.platforms.includes(t.platform))&&(!("shoot"===t.type&&!e.shootDate)&&(!("post"===t.type&&!e.postDate)&&(!("completed"===t.status&&!isComplete(e))&&("open"!==t.status||!isComplete(e))))))})}function render(){const t=viewDate.getFullYear(),e=viewDate.getMonth(),o=activeFilters(),n=filteredContents();$("#monthLabel").textContent=new Intl.DateTimeFormat("en-SG",{month:"long",year:"numeric"}).format(viewDate),$("#weekdays").innerHTML=weekdays.map(t=>`<div>${t}</div>`).join(""),$("#days").innerHTML=calendarCells(t,e).map(t=>{const e=n.flatMap(e=>{const n=[];return o.type&&"shoot"!==o.type||e.shootDate===t.key&&n.push({content:e,type:"shoot",time:e.shootTime,done:"Completed"===e.shootStatus}),o.type&&"post"!==o.type||e.postDate===t.key&&n.push({content:e,type:"post",time:e.postTime,done:"Published"===e.postStatus}),n}).map(t=>`<button class="event ${t.type} ${t.done?"done":""} ${"post"===t.type&&!t.done&&"Scheduled"===t.content.postStatus?"post-scheduled":""}" data-content-id="${t.content.id}" title="Click to edit"><span>${t.done?"&#10003; ":""}${escapeHtml(t.content.title)}</span><small>${"shoot"===t.type?"Shoot":"Post"} &middot; ${escapeHtml(t.time||"")}</small></button>`).join("");return`<div class="day ${t.muted?"muted":""}" data-date="${t.key}" title="Click to add content"><span class="num">${t.date.getDate()}</span>${e}</div>`}).join("");const a=`${t}-${String(e+1).padStart(2,"0")}`,s=data.contents.flatMap(t=>[t.shootDate?.startsWith(a)?{done:"Completed"===t.shootStatus}:null,t.postDate?.startsWith(a)?{done:"Published"===t.postStatus}:null].filter(Boolean)),l=s.filter(t=>t.done).length;$("#plannedCount").textContent=s.length,$("#completedCount").textContent=l,$("#progressBar").style.width=`${s.length?Math.round(l/s.length*100):0}%`,$("#contentList").innerHTML=n.length?n.map(t=>{const e=progressLabel(t),o=t.platforms.length?t.platforms.join(", "):"No platform",n=t.script?t.script.slice(0,100):"No script yet";return`<button class="row content-row" data-content-id="${t.id}" title="Click to edit"><strong>${escapeHtml(t.title)}<small>${escapeHtml(n)}</small></strong><span>${escapeHtml(o)}</span><span>${friendlyDate(t.shootDate)}<small>${escapeHtml(t.shootStatus)}</small></span><span>${friendlyDate(t.postDate)}<small>${escapeHtml(t.postStatus)}</small></span><i class="status ${e.className}">${e.text}</i></button>`}).join(""):'<div class="empty">No content matches these filters.</div>'}async function load(){try{const t=await fetch("/api/data",{cache:"no-store"});if(!t.ok)throw new Error("Load failed");const e=await t.json();data.contents=e.contents||[],render()}catch{notice("Could not load shared data.","error")}}const dialog=$("#contentDialog"),form=$("#contentForm");function setPlatforms(t=[]){$$('input[name="platforms"]').forEach(e=>{e.checked=t.includes(e.value)})}function openCreate(t=""){form.reset(),form.elements.id.value="",form.elements.shootTime.value="10:00",form.elements.postTime.value="10:00",form.elements.scriptStatus.value="Not Started",form.elements.shootStatus.value=t?"Planned":"Not Scheduled",form.elements.postStatus.value="Not Scheduled",t&&(form.elements.shootDate.value=t),setPlatforms([]),$("#contentDialogTitle").textContent="New Content",$("#contentSubmit").textContent="Save Content",$("#deleteContent").hidden=!0,dialog.showModal()}function openEdit(t){const e=data.contents.find(e=>String(e.id)===String(t));e&&(form.elements.id.value=e.id,form.elements.title.value=e.title,form.elements.script.value=e.script||"",form.elements.owner.value="Unassigned"===e.owner?"":e.owner,form.elements.shootDate.value=e.shootDate||"",form.elements.shootTime.value=e.shootTime||"10:00",form.elements.shootStatus.value=e.shootStatus,form.elements.postDate.value=e.postDate||"",form.elements.postTime.value=e.postTime||"10:00",form.elements.postStatus.value=e.postStatus,form.elements.scriptStatus.value=e.scriptStatus,setPlatforms(e.platforms||[]),$("#contentDialogTitle").textContent="Edit Content",$("#contentSubmit").textContent="Save Changes",$("#deleteContent").hidden=!1,dialog.showModal())}function formBody(){return{...Object.fromEntries(new FormData(form)),resource:"content",platforms:new FormData(form).getAll("platforms")}}$("#addBtn").onclick=()=>openCreate(),$("#addListBtn").onclick=()=>openCreate(),$("#prevMonth").onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1),render()},$("#nextMonth").onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1),render()},$("#todayBtn").onclick=()=>{viewDate=new Date,render()},$("#days").onclick=t=>{const e=t.target.closest("[data-content-id]");if(e)return openEdit(e.dataset.contentId);const o=t.target.closest("[data-date]");o&&openCreate(o.dataset.date)},$("#contentList").onclick=t=>{const e=t.target.closest("[data-content-id]");e&&openEdit(e.dataset.contentId)},["searchInput","platformFilter","typeFilter","statusFilter"].forEach(t=>{$(`#${t}`).addEventListener("searchInput"===t?"input":"change",render)}),$("#clearFilters").onclick=()=>{$("#searchInput").value="",$("#platformFilter").value="",$("#typeFilter").value="",$("#statusFilter").value="",render()},form.elements.shootDate.addEventListener("change",()=>{form.elements.shootStatus.value=form.elements.shootDate.value?"Completed"===form.elements.shootStatus.value?"Completed":"Planned":"Not Scheduled"}),form.elements.postDate.addEventListener("change",()=>{form.elements.postStatus.value=form.elements.postDate.value?"Published"===form.elements.postStatus.value?"Published":"Scheduled":"Not Scheduled"}),form.elements.script.addEventListener("input",()=>{form.elements.script.value.trim()&&"Not Started"===form.elements.scriptStatus.value&&(form.elements.scriptStatus.value="Draft")}),$$(".close,.cancel").forEach(t=>{t.onclick=()=>dialog.close()});
// Saves run in the background, one at a time, so the page never waits on the server.
let saveQueue = Promise.resolve();
let pendingSaves = 0;
function queueSave(task) {
  pendingSaves++;
  saveQueue = saveQueue.then(task).catch(() => {}).finally(() => { pendingSaves--; });
  return saveQueue;
}
window.addEventListener("beforeunload", event => {
  if (pendingSaves > 0) { event.preventDefault(); event.returnValue = ""; }
});
async function send(method, body) {
  const response = await fetch("/api/data", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || "Server error");
  return json;
}
function restoreForm(body, isEdit) {
  isEdit ? openEdit(body.id) : openCreate();
  for (const [key, value] of Object.entries(body)) {
    if (key === "platforms" || key === "resource" || (key === "id" && !isEdit)) continue;
    if (form.elements[key] && typeof value === "string") form.elements[key].value = value;
  }
  setPlatforms(body.platforms || []);
}
$("#deleteContent").onclick = () => {
  const id = form.elements.id.value;
  if (!confirm("Delete this content plan? This cannot be undone.")) return;
  const backup = data.contents.slice();
  data.contents = data.contents.filter(item => String(item.id) !== String(id));
  dialog.close(), render(), notice("Deleting…");
  queueSave(async () => {
    try {
      await send("DELETE", { resource: "content", id });
      notice("Content deleted and shared.");
    } catch (error) {
      data.contents = backup, render(), notice(`Could not delete: ${error.message}`, "error");
    }
  });
};
form.onsubmit = event => {
  event.preventDefault();
  const body = formBody(), isEdit = Boolean(body.id);
  if (!body.title?.trim()) return notice("Add a content title.", "error");
  if (!body.script?.trim() && !body.shootDate && !body.postDate) return notice("Add a script, shoot date or post date.", "error");
  if (!isEdit) body.id = String(Date.now());
  const index = data.contents.findIndex(item => String(item.id) === String(body.id));
  const backup = index >= 0 ? data.contents[index] : null;
  const local = { ...(backup || {}), ...body, id: backup ? backup.id : Number(body.id) };
  index >= 0 ? (data.contents[index] = local) : data.contents.push(local);
  const date = local.shootDate || local.postDate;
  date && (viewDate = new Date(`${date}T12:00:00`));
  dialog.close(), render(), notice("Saving…");
  queueSave(async () => {
    try {
      const saved = await send(isEdit ? "PUT" : "POST", body);
      const i = data.contents.findIndex(item => String(item.id) === String(saved.id));
      i >= 0 ? (data.contents[i] = saved) : data.contents.push(saved);
      render(), notice(isEdit ? "Content updated and shared." : "Content saved and shared.");
    } catch (error) {
      const i = data.contents.findIndex(item => String(item.id) === String(local.id));
      if (backup) { if (i >= 0) data.contents[i] = backup; } else if (i >= 0) data.contents.splice(i, 1);
      render(), notice(`Could not save: ${error.message}`, "error");
      if (!dialog.open) restoreForm({ ...body, id: isEdit ? body.id : "" }, isEdit);
    }
  });
};
load();
