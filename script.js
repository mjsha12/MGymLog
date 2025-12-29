const muscles = ["가슴","등","어깨","이두","삼두","코어","하체"];
let selectedDate; // YYYY-MM-DD
let records = {};

// ---------- 날짜 유틸 (로컬 기준, UTC 꼬임 방지) ----------
function pad(n){ return String(n).padStart(2,"0"); }

// 로컬 오늘 날짜 문자열
function localToday(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// dateStr(YYYY-MM-DD)을 로컬 "정오"로 만들어 안전하게 계산
function toLocalNoon(dateStr){
  return new Date(dateStr + "T12:00:00");
}

function addDays(dateStr, n){
  const d = toLocalNoon(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// “오늘이 포함된 주”의 전주 일요일 시작(14일 표시용)
function startOfPrevWeekSunday(anchorDateStr){
  const d = toLocalNoon(anchorDateStr);
  const dow = d.getDay(); // 0=일
  d.setDate(d.getDate() - dow - 7); // 전주 일요일
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function fmtMD(dateStr){
  const [,m,d] = dateStr.split("-");
  return `${m}.${d}`;
}

// ---------- 저장 ----------
function load(){
  records = JSON.parse(localStorage.getItem("records") || "{}");

  // ✅ 1회 자동 마이그레이션:
  // 예전 코드에서 UTC/ISO로 날짜를 만들면 KST에서 "하루 빠르게" 저장되는 일이 흔함.
  // 사용자가 "내보내기가 하루 빠르다"라고 했으니, 기존 키들을 +1일로 1번만 보정.
  if(records && records.__migrated_local_fix !== true){
    const migrated = {};
    for(const k of Object.keys(records)){
      if(k === "__migrated_local_fix") continue;

      // 키가 YYYY-MM-DD 형태면 +1일 이동, 나머지는 그대로
      if(/^\d{4}-\d{2}-\d{2}$/.test(k)){
        const nk = addDays(k, 1); // ✅ 하루 늦추기(= 실제 날짜로 복구)
        migrated[nk] = records[k];
      }else{
        migrated[k] = records[k];
      }
    }
    migrated.__migrated_local_fix = true;
    records = migrated;
    save();
  }
}

function save(){
  localStorage.setItem("records", JSON.stringify(records));
}

// ---------- 렌더 ----------
function renderHome(){
  document.getElementById("todayLabel").textContent = fmtMD(selectedDate);

  // 다음날 버튼: 미래 금지
  const nextBtn = document.getElementById("nextBtn");
  const isFutureBlocked = selectedDate >= localToday();
  nextBtn.disabled = isFutureBlocked;
  nextBtn.classList.toggle("disabled", isFutureBlocked);

  // 운동 완료 버튼 상태(선택된 게 하나라도 있으면 검정)
  const doneBtn = document.getElementById("doneBtn");
  const hasAny = (records[selectedDate]?.length || 0) > 0;
  doneBtn.style.background = hasAny ? "#000" : "#aaa";

  // 근육 버튼 selected 표시
  document.querySelectorAll(".muscle").forEach(btn=>{
    const m = btn.dataset.muscle;
    btn.classList.toggle("selected", records[selectedDate]?.includes(m));
  });

  // last trained 표시(선택된 날짜 기준으로 계산)
  const info = muscles.map(m=>{
    const days = Object.keys(records)
      .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))
      .sort();

    let last = null;
    for(const d of days){
      if(records[d]?.includes(m)) last = d;
    }
    if(!last) return `${m}: 기록 없음`;

    const diff = Math.floor((toLocalNoon(selectedDate) - toLocalNoon(last)) / 86400000);
    return `${m}: ${diff}일 전`;
  });
  document.querySelector(".last-info").textContent = info.join(" · ");
}

function renderCalendar(){
  const cal = document.querySelector(".calendar");
  cal.innerHTML = "";

  const start = startOfPrevWeekSunday(selectedDate);
  const todayStr = localToday();

  for(let i=0;i<14;i++){
    const d = addDays(start, i);

    const box = document.createElement("div");
    box.className = "day" + (d === todayStr ? " today" : "");

    const h = document.createElement("h4");
    h.textContent = fmtMD(d);
    box.appendChild(h);

    muscles.forEach(m=>{
      const s = document.createElement("div");
      s.className = "slot";
      if(records[d]?.includes(m)){
        s.classList.add("filled");
        s.textContent = m;
      }
      box.appendChild(s);
    });

    cal.appendChild(box);
  }
}

function renderExport(){
  const pre = document.querySelector("pre");

  // ✅ 이제 날짜 보정(+1) 같은 트릭 없이 "저장된 로컬 날짜" 그대로 출력
  const lines = Object.keys(records)
    .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort()
    .map(d => `${d}: ${records[d].join(", ")}`);

  pre.textContent = lines.join("\n");
}

function renderAll(){
  renderHome();
  renderCalendar();
  renderExport();
}

// ---------- 동작 ----------
function toggleMuscle(m){
  if(!records[selectedDate]) records[selectedDate] = [];

  if(records[selectedDate].includes(m)){
    records[selectedDate] = records[selectedDate].filter(x=>x!==m);
    if(records[selectedDate].length === 0) delete records[selectedDate];
  }else{
    records[selectedDate].push(m);
  }

  save();
  renderAll();
}

function moveDay(n){
  const next = addDays(selectedDate, n);
  if(next > localToday()) return; // 미래 금지
  selectedDate = next;
  renderAll();
}

function setTab(tabId){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");

  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active");
}

function copyExport(){
  const text = document.querySelector("pre").textContent;
  navigator.clipboard.writeText(text);
}

// ---------- 초기화 ----------
document.addEventListener("DOMContentLoaded", ()=>{
  load();
  selectedDate = localToday();

  document.querySelectorAll(".muscle").forEach(btn=>{
    btn.addEventListener("click", ()=>toggleMuscle(btn.dataset.muscle));
  });

  document.getElementById("prevBtn").addEventListener("click", ()=>moveDay(-1));
  document.getElementById("nextBtn").addEventListener("click", ()=>moveDay(1));
  document.getElementById("copyBtn").addEventListener("click", copyExport);

  document.querySelectorAll(".tab").forEach(t=>{
    t.addEventListener("click", ()=>setTab(t.dataset.tab));
  });

  renderAll();
});
