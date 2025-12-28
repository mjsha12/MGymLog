const PARTS = ["가슴","등","어깨","이두","삼두","코어","하체"];
const STORAGE_KEY = "mgymlog:v1:records";

function pad2(n){ return String(n).padStart(2, "0"); }
function ymd(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function mmdd(d){ return `${pad2(d.getMonth()+1)}.${pad2(d.getDate())}`; }

function loadAll(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function saveAll(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

function getSundayOfWeek(date){
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date, n){
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + n);
  return d;
}
function getStart28(date){
  const thisSun = getSundayOfWeek(date);
  return addDays(thisSun, -21);
}

// ===== 전역 상태 =====
const realToday = new Date(); realToday.setHours(0,0,0,0);
const realTodayKey = ymd(realToday);
let viewDate = new Date(realToday);

// ===== DOM =====
const todayLabel = document.getElementById("todayLabel");
const workoutToggle = document.getElementById("workoutToggle");
const partsWrap = document.getElementById("parts");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const lastTrainedEl = document.getElementById("lastTrained");

const calendarEl = document.getElementById("calendar");
const exportPreview = document.getElementById("exportPreview");
const copyBtn = document.getElementById("copyBtn");
const copyStatus = document.getElementById("copyStatus");

// ===== 탭 전환 =====
function activateTab(key){
  document.querySelectorAll(".tabbtn").forEach(b => b.classList.remove("is-active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("is-active"));

  document.querySelector(`.tabbtn[data-tab="${key}"]`).classList.add("is-active");
  document.getElementById(`tab-${key}`).classList.add("is-active");

  if (key === "records") renderCalendar();
  if (key === "export") renderExportPreview();
}
document.querySelectorAll(".tabbtn").forEach(btn => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

// ===== 데이터 =====
function ensureRecordExists(key){
  const all = loadAll();
  if (!all[key]) {
    all[key] = { done: false, parts: {} };
    saveAll(all);
  }
}
function getViewKey(){ return ymd(viewDate); }

// ===== 홈 날짜 이동 =====
function setViewDate(newDate){
  viewDate = new Date(newDate);
  viewDate.setHours(0,0,0,0);

  const key = getViewKey();
  ensureRecordExists(key);

  todayLabel.textContent = mmdd(viewDate);

  // 오늘이면 미래 이동 불가
  nextDayBtn.disabled = (key === realTodayKey);

  syncHomePartsFromData();
  setWorkoutUI();
  renderLastTrained();

  renderCalendar();
  renderExportPreview();
}

prevDayBtn.addEventListener("click", () => setViewDate(addDays(viewDate, -1)));
nextDayBtn.addEventListener("click", () => {
  if (getViewKey() === realTodayKey) return;
  setViewDate(addDays(viewDate, +1));
});

// ===== 부위 버튼 생성 =====
PARTS.forEach(p => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "partBtn";
  b.textContent = p;

  b.addEventListener("click", () => {
    const key = getViewKey();
    const all = loadAll();
    const rec = all[key] || { done:false, parts:{} };

    // 운동 완료 전에는 선택 불가
    if (!rec.done) return;

    rec.parts[p] = !rec.parts[p];
    all[key] = rec;
    saveAll(all);

    b.classList.toggle("is-selected", !!rec.parts[p]);

    renderCalendar();
    renderExportPreview();
    renderLastTrained();
  });

  partsWrap.appendChild(b);
});

function setWorkoutUI(){
  const key = getViewKey();
  const all = loadAll();
  const rec = all[key] || { done:false, parts:{} };

  workoutToggle.classList.toggle("is-on", rec.done);

  document.querySelectorAll(".partBtn").forEach(btn => {
    btn.classList.toggle("is-disabled", !rec.done);
  });
}

function syncHomePartsFromData(){
  const key = getViewKey();
  const all = loadAll();
  const rec = all[key] || { done:false, parts:{} };

  document.querySelectorAll(".partBtn").forEach(btn => {
    const p = btn.textContent;
    btn.classList.toggle("is-selected", !!rec.parts[p]);
  });
}

// 운동 완료 토글
function toggleDone(){
  const key = getViewKey();
  const all = loadAll();
  const rec = all[key] || { done:false, parts:{} };

  rec.done = !rec.done;

  // 취소하면 부위 초기화
  if (!rec.done) rec.parts = {};

  all[key] = rec;
  saveAll(all);

  syncHomePartsFromData();
  setWorkoutUI();
  renderCalendar();
  renderExportPreview();
  renderLastTrained();
}
workoutToggle.addEventListener("click", toggleDone);

// ===== 부위별 마지막 운동 =====
function daysDiff(a, b){
  return Math.floor((a - b) / (1000*60*60*24));
}

function findLastDateForPart(part){
  const all = loadAll();
  let last = null;

  for (const key of Object.keys(all)){
    const rec = all[key];
    if (rec?.parts?.[part]){
      const d = new Date(key);
      d.setHours(0,0,0,0);
      if (!last || d > last) last = d;
    }
  }
  return last;
}

function renderLastTrained(){
  if (!lastTrainedEl) return;

  const items = PARTS.map(part => {
    const last = findLastDateForPart(part);
    if (!last) return { part, text: "기록 없음" };

    const diff = daysDiff(realToday, last);
    if (diff === 0) return { part, text: "오늘" };
    return { part, text: `${diff}일 전` };
  });

  lastTrainedEl.innerHTML = items
    .map(x => `<span class="item">${x.part} · ${x.text}</span>`)
    .join("");
}

// ===== 기록: 28일 =====
function renderCalendar(){
  const all = loadAll();
  const start = getStart28(realToday);
  const viewKey = getViewKey();

  calendarEl.innerHTML = "";

  for (let i=0; i<28; i++){
    const d = addDays(start, i);
    const key = ymd(d);
    const rec = all[key] || { done:false, parts:{} };

    const cell = document.createElement("div");
    cell.className = "cell";
    if (key === realTodayKey) cell.classList.add("today");
    if (key === viewKey) cell.classList.add("selected");

    const header = document.createElement("div");
    header.className = "cellHeader";
    header.textContent = mmdd(d);
    cell.appendChild(header);

    const slots = document.createElement("div");
    slots.className = "slots";

    PARTS.forEach(p => {
      const s = document.createElement("div");
      const did = !!rec.parts[p];
      s.className = "slot" + (did ? "" : " empty");
      s.textContent = did ? p : " ";
      slots.appendChild(s);
    });

    cell.appendChild(slots);
    calendarEl.appendChild(cell);
  }
}

// ===== 내보내기 =====
function buildExportText(){
  const all = loadAll();
  const keys = Object.keys(all).sort();
  const lines = [];

  for (const k of keys){
    const rec = all[k];
    if (!rec || !rec.done) continue;

    const parts = PARTS.filter(p => !!rec.parts[p]);
    lines.push(`${k}: ${parts.join(", ")}`);
  }
  return lines.join("\n");
}

function renderExportPreview(){
  exportPreview.value = buildExportText();
}

copyBtn.addEventListener("click", async () => {
  const text = buildExportText();

  if (!text.trim()){
    copyStatus.textContent = "복사할 기록이 아직 없어요.";
    setTimeout(()=>copyStatus.textContent="", 1500);
    return;
  }

  try{
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "복사됨 ✅";
    setTimeout(()=>copyStatus.textContent="", 1500);
  }catch{
    exportPreview.value = text;
    exportPreview.focus();
    exportPreview.select();
    document.execCommand("copy");
    copyStatus.textContent = "복사됨 ✅";
    setTimeout(()=>copyStatus.textContent="", 1500);
  }
});

// ===== 초기 =====
ensureRecordExists(realTodayKey);
setViewDate(realToday);
renderCalendar();
renderExportPreview();
renderLastTrained();
activateTab("home");
