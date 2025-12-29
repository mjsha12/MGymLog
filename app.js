/* =========================
   설정
========================= */
const MUSCLES = ["가슴","등","어깨","이두","삼두","코어","하체"];
const WEEKDAYS = ["일","월","화","수","목","금","토"];

// 로컬 날짜(YYYY-MM-DD)로 고정: UTC 때문에 하루 밀리는 버그 근본 해결
function toLocalISODate(d){
  const dt = new Date(d);
  dt.setHours(0,0,0,0);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,10); // local 기준 YYYY-MM-DD
}

function fromLocalISODate(s){
  // s: YYYY-MM-DD 를 로컬 자정으로 복원
  const [y,m,dd] = s.split("-").map(Number);
  const dt = new Date(y, m-1, dd);
  dt.setHours(0,0,0,0);
  return dt;
}

function mmddLabel(d){
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${m}.${day}`;
}

function clampToToday(date){
  const today = new Date();
  today.setHours(0,0,0,0);
  const d = new Date(date);
  d.setHours(0,0,0,0);
  if(d.getTime() > today.getTime()) return today;
  return d;
}

/* =========================
   저장 구조
   localStorage["mgymlog:data"] = {
     "YYYY-MM-DD": { muscles: ["가슴","등"...] }
   }
========================= */
const STORAGE_KEY = "mgymlog:data";

function loadData(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  }catch(e){
    return {};
  }
}

function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* =========================
   DOM
========================= */
const pages = {
  home: document.querySelector("#page-home"),
  log: document.querySelector("#page-log"),
  export: document.querySelector("#page-export"),
};

const tabs = Array.from(document.querySelectorAll(".bottom-tabs .tab"));

const todayLabelEl = document.querySelector("#todayLabel");
const btnPrev = document.querySelector("#btnPrev");
const btnNext = document.querySelector("#btnNext");
const doneBtn = document.querySelector("#doneBtn");
const muscleGrid = document.querySelector("#muscleGrid");
const lastInfo = document.querySelector("#lastInfo");

const weekdaysEl = document.querySelector("#weekdays");
const calendarEl = document.querySelector("#calendar");

const copyBtn = document.querySelector("#copyBtn");
const exportText = document.querySelector("#exportText");

/* =========================
   상태
========================= */
let data = loadData();

// 홈에서 편집 중인 날짜(로컬 자정)
let activeDate = new Date();
activeDate.setHours(0,0,0,0);

/* =========================
   UI 생성
========================= */
function buildWeekdays(){
  weekdaysEl.innerHTML = "";
  WEEKDAYS.forEach(w=>{
    const div = document.createElement("div");
    div.textContent = w;
    weekdaysEl.appendChild(div);
  });
}

function buildMuscleButtons(){
  muscleGrid.innerHTML = "";
  MUSCLES.forEach(name=>{
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "muscle";
    btn.textContent = name;
    btn.dataset.muscle = name;

    btn.addEventListener("click", ()=>{
      toggleMuscleForActiveDate(name);
    });

    muscleGrid.appendChild(btn);
  });
}

/* =========================
   기록 토글/반영
========================= */
function getEntry(dateObj){
  const key = toLocalISODate(dateObj);
  return data[key] || { muscles: [] };
}

function setEntry(dateObj, entry){
  const key = toLocalISODate(dateObj);
  // muscles가 비면 기록 삭제(깔끔)
  if(!entry.muscles || entry.muscles.length === 0){
    delete data[key];
  }else{
    data[key] = { muscles: entry.muscles.slice() };
  }
  saveData(data);
}

function toggleMuscleForActiveDate(muscle){
  const d = clampToToday(activeDate);
  activeDate = d;

  const entry = getEntry(activeDate);
  const set = new Set(entry.muscles);

  if(set.has(muscle)) set.delete(muscle);
  else set.add(muscle);

  setEntry(activeDate, { muscles: Array.from(set) });
  renderHome();
  renderLog();
  renderExport();
}

/* =========================
   홈 렌더
========================= */
function renderHome(){
  // 날짜 라벨
  todayLabelEl.textContent = mmddLabel(activeDate);

  // 미래 이동 금지
  const t = new Date(); t.setHours(0,0,0,0);
  const isToday = activeDate.getTime() === t.getTime();
  btnNext.classList.toggle("disabled", isToday);

  // 버튼 선택 표시
  const entry = getEntry(activeDate);
  const selected = new Set(entry.muscles);

  // 운동 완료(부위 하나라도 있으면 active)
  doneBtn.classList.toggle("active", selected.size > 0);

  // 부위 버튼들 색 반영
  Array.from(muscleGrid.querySelectorAll(".muscle")).forEach(btn=>{
    const m = btn.dataset.muscle;
    btn.classList.toggle("selected", selected.has(m));
  });

  // 마지막 운동 몇일 전
  lastInfo.textContent = buildLastInfoText();
}

function buildLastInfoText(){
  const today = new Date(); today.setHours(0,0,0,0);

  const lines = MUSCLES.map(m=>{
    const last = findLastDateForMuscle(m, today);
    if(!last) return `${m}: 기록 없음`;
    const diff = Math.round((today.getTime() - last.getTime()) / (1000*60*60*24));
    if(diff === 0) return `${m}: 오늘`;
    return `${m}: ${diff}일 전`;
  });

  return lines.join(" · ");
}

function findLastDateForMuscle(muscle, upToDate){
  // upToDate 포함해서 과거로 검색
  const upToKey = toLocalISODate(upToDate);
  const keys = Object.keys(data).sort(); // YYYY-MM-DD 정렬됨
  let best = null;

  for(const k of keys){
    if(k > upToKey) continue;
    const entry = data[k];
    if(entry?.muscles?.includes(muscle)){
      best = fromLocalISODate(k);
    }
  }
  return best;
}

/* =========================
   기록(2주) 렌더
   - "오늘이 포함된 주의 전주 일요일" ~ "오늘이 포함된 주의 토요일"
========================= */
function startOfWeekSunday(d){
  const x = new Date(d); x.setHours(0,0,0,0);
  const day = x.getDay(); // 0=일
  x.setDate(x.getDate() - day);
  return x;
}

function renderLog(){
  calendarEl.innerHTML = "";

  const today = new Date(); today.setHours(0,0,0,0);
  const thisWeekSun = startOfWeekSunday(today);
  const start = new Date(thisWeekSun);
  start.setDate(start.getDate() - 7); // 전주 일요일

  // 14일
  for(let i=0;i<14;i++){
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const entry = getEntry(d);
    const selected = new Set(entry.muscles);

    const dayBox = document.createElement("div");
    dayBox.className = "day";

    // 오늘 테두리 표시
    if(d.getTime() === today.getTime()){
      dayBox.classList.add("today");
    }

    const h4 = document.createElement("h4");
    h4.textContent = mmddLabel(d);
    dayBox.appendChild(h4);

    // 슬롯은 항상 고정 순서(7개)
    MUSCLES.forEach(m=>{
      const slot = document.createElement("div");
      slot.className = "slot";
      if(selected.has(m)){
        slot.classList.add("filled");
        slot.textContent = m;
      }else{
        slot.textContent = ""; // 빈칸 유지
      }
      dayBox.appendChild(slot);
    });

    calendarEl.appendChild(dayBox);
  }
}

/* =========================
   내보내기 렌더 + 복사
========================= */
function renderExport(){
  // 날짜 오름차순 출력
  const keys = Object.keys(data).sort();
  const lines = keys.map(k=>{
    const entry = data[k];
    const muscles = (entry?.muscles || []).slice().sort((a,b)=>MUSCLES.indexOf(a)-MUSCLES.indexOf(b));
    return `${k}: ${muscles.join(", ")}`;
  });

  exportText.textContent = lines.join("\n");
}

copyBtn.addEventListener("click", async ()=>{
  const text = exportText.textContent || "";
  try{
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "복사됨!";
    setTimeout(()=>copyBtn.textContent="복사하기", 900);
  }catch(e){
    // iOS 일부 환경 fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    copyBtn.textContent = "복사됨!";
    setTimeout(()=>copyBtn.textContent="복사하기", 900);
  }
});

/* =========================
   탭 전환
========================= */
function showPage(name){
  Object.keys(pages).forEach(k=>{
    pages[k].classList.toggle("active", k === name);
  });
  tabs.forEach(t=>{
    t.classList.toggle("active", t.dataset.target === name);
  });

  // 탭 이동 시 갱신
  if(name === "home") renderHome();
  if(name === "log") renderLog();
  if(name === "export") renderExport();
}

tabs.forEach(tab=>{
  tab.addEventListener("click", ()=>{
    showPage(tab.dataset.target);
  });
});

/* =========================
   날짜 이동(홈)
========================= */
btnPrev.addEventListener("click", ()=>{
  const d = new Date(activeDate);
  d.setDate(d.getDate() - 1);
  activeDate = d;
  renderHome();
});

btnNext.addEventListener("click", ()=>{
  const d = new Date(activeDate);
  d.setDate(d.getDate() + 1);
  activeDate = clampToToday(d);
  renderHome();
});

/* =========================
   초기화
========================= */
function init(){
  buildWeekdays();
  buildMuscleButtons();

  // 활성 날짜는 "오늘"
  const t = new Date();
  t.setHours(0,0,0,0);
  activeDate = t;

  renderHome();
  renderLog();
  renderExport();
}

init();
