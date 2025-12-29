/* =========================
   MGymLog (Local date safe)
   - 날짜 하루 빨라짐(UTC) 문제: toISOString() 사용 금지
   - 로컬 YYYY-MM-DD 키로 저장/표시
========================= */

const MUSCLES = ["가슴","등","어깨","이두","삼두","코어","하체"];
const STORAGE_KEY = "mgymlog_records_v2"; // 새 키(깨진 데이터 피하려고)
const WEEKDAYS = ["일","월","화","수","목","금","토"];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const pageHome = $("#pageHome");
const pageLog = $("#pageLog");
const pageExport = $("#pageExport");

const btnPrevDay = $("#btnPrevDay");
const btnNextDay = $("#btnNextDay");
const todayLabel = $("#todayLabel");
const doneBtn = $("#doneBtn");
const muscleGrid = $("#muscleGrid");
const lastInfo = $("#lastInfo");

const weekdaysRow = $("#weekdaysRow");
const calendarGrid = $("#calendarGrid");

const copyBtn = $("#copyBtn");
const exportText = $("#exportText");

// ---------- 날짜 유틸 (로컬) ----------
function startOfDay(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function pad2(n){ return String(n).padStart(2,"0"); }

// ✅ 로컬 날짜키(YYYY-MM-DD)
function toDateKeyLocal(d){
  const x = startOfDay(d);
  return `${x.getFullYear()}-${pad2(x.getMonth()+1)}-${pad2(x.getDate())}`;
}

// ✅ 로컬 표시(MM.DD)
function toLabelMMDD(d){
  const x = startOfDay(d);
  return `${pad2(x.getMonth()+1)}.${pad2(x.getDate())}`;
}

// 일요일(그 주 시작) 구하기
function getSunday(d){
  const x = startOfDay(d);
  const day = x.getDay(); // 0=일
  return addDays(x, -day);
}

// ---------- 데이터 ----------
function loadRecords(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch{
    return {};
  }
}

function saveRecords(records){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getMusclesForDate(records, dateKey){
  const arr = records[dateKey];
  return Array.isArray(arr) ? arr : [];
}

function setMusclesForDate(records, dateKey, muscles){
  records[dateKey] = muscles;
  saveRecords(records);
}

// ---------- 상태 ----------
const today = startOfDay(new Date());
let focusedDate = startOfDay(new Date()); // 홈에서 수정할 날짜

// ---------- UI: 탭 ----------
function setActiveTab(tabName){
  $$(".tab").forEach(btn => btn.classList.remove("active"));
  const btn = $(`.tab[data-target="${tabName}"]`);
  if(btn) btn.classList.add("active");

  pageHome.classList.remove("active");
  pageLog.classList.remove("active");
  pageExport.classList.remove("active");

  if(tabName === "home") pageHome.classList.add("active");
  if(tabName === "log") pageLog.classList.add("active");
  if(tabName === "export") pageExport.classList.add("active");

  // 렌더 갱신
  if(tabName === "home") renderHome();
  if(tabName === "log") renderLog();
  if(tabName === "export") renderExport();
}

$$(".tab").forEach(btn => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.target));
});

// ---------- 홈 렌더 ----------
function renderMuscleButtons(selected){
  muscleGrid.innerHTML = "";
  MUSCLES.forEach(name => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "muscle" + (selected.includes(name) ? " selected" : "");
    b.textContent = name;

    b.addEventListener("click", () => {
      const records = loadRecords();
      const key = toDateKeyLocal(focusedDate);
      const cur = getMusclesForDate(records, key);

      let next;
      if(cur.includes(name)){
        next = cur.filter(x => x !== name);
      }else{
        next = [...cur, name];
      }
      // 정렬은 MUSCLES 순서 유지
      next = MUSCLES.filter(m => next.includes(m));

      setMusclesForDate(records, key, next);
      renderHome();  // 홈 갱신
    });

    muscleGrid.appendChild(b);
  });
}

function renderDoneButton(selected){
  // 운동 완료: "부위가 하나라도 있으면 active(검정)" / 없으면 회색
  doneBtn.classList.toggle("active", selected.length > 0);

  // 클릭하면 "해당 날짜 기록 전체 삭제" 토글로 동작(원하면 유지)
  doneBtn.onclick = () => {
    const records = loadRecords();
    const key = toDateKeyLocal(focusedDate);
    const cur = getMusclesForDate(records, key);

    if(cur.length === 0){
      // 아무것도 없으면: 기본으로 "가슴" 같은 자동 선택은 안 함 (사용자 의도대로 직접 선택)
      // 대신 안내용: 아무것도 하지 않음
      return;
    }else{
      // 있으면 전체 삭제
      setMusclesForDate(records, key, []);
      renderHome();
    }
  };
}

function renderNavButtons(){
  // 미래로는 이동 금지: focusedDate < today 일 때만 다음 버튼 활성
  const canGoNext = startOfDay(focusedDate).getTime() < today.getTime();
  btnNextDay.classList.toggle("disabled", !canGoNext);

  btnPrevDay.onclick = () => {
    focusedDate = addDays(focusedDate, -1);
    renderHome();
  };

  btnNextDay.onclick = () => {
    if(!canGoNext) return;
    focusedDate = addDays(focusedDate, +1);
    renderHome();
  };
}

function renderLastInfo(){
  const records = loadRecords();
  const base = startOfDay(focusedDate);

  const parts = MUSCLES.map(m => {
    // base 기준으로 "마지막 운동한 날짜" 찾아서 n일 전 계산
    // records의 모든 키 탐색
    let lastDate = null;

    for(const [k, arr] of Object.entries(records)){
      if(!Array.isArray(arr)) continue;
      if(!arr.includes(m)) continue;

      // k(YYYY-MM-DD)를 로컬 Date로 파싱(UTC 오프셋 없이)
      const [yy, mm, dd] = k.split("-").map(Number);
      const d = new Date(yy, mm-1, dd);
      d.setHours(0,0,0,0);

      // base보다 미래 기록은 무시
      if(d.getTime() > base.getTime()) continue;

      if(!lastDate || d.getTime() > lastDate.getTime()){
        lastDate = d;
      }
    }

    if(!lastDate) return `${m}: 기록 없음`;

    const diffMs = base.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffMs / (24*60*60*1000));

    if(diffDays === 0) return `${m}: 오늘`;
    return `${m}: ${diffDays}일 전`;
  });

  lastInfo.textContent = parts.join(" · ");
}

function renderHome(){
  const records = loadRecords();
  const key = toDateKeyLocal(focusedDate);
  const selected = getMusclesForDate(records, key);

  todayLabel.textContent = toLabelMMDD(focusedDate);

  renderNavButtons();
  renderDoneButton(selected);
  renderMuscleButtons(selected);
  renderLastInfo();
}

// ---------- 기록 렌더 (14일: 전주 일요일 ~ 이번주 토요일) ----------
function renderWeekdays(){
  weekdaysRow.innerHTML = "";
  WEEKDAYS.forEach(w => {
    const d = document.createElement("div");
    d.textContent = w;
    weekdaysRow.appendChild(d);
  });
}

function renderLog(){
  renderWeekdays();

  const records = loadRecords();
  calendarGrid.innerHTML = "";

  const thisSunday = getSunday(today);           // 이번주 일요일
  const start = addDays(thisSunday, -7);         // 전주 일요일
  const end = addDays(thisSunday, 6);            // 이번주 토요일 (총 14일)

  for(let i=0; i<14; i++){
    const d = addDays(start, i);
    const key = toDateKeyLocal(d);
    const selected = getMusclesForDate(records, key);

    const dayCard = document.createElement("div");
    dayCard.className = "day" + (key === toDateKeyLocal(today) ? " today" : "");

    const h4 = document.createElement("h4");
    h4.textContent = toLabelMMDD(d);
    dayCard.appendChild(h4);

    // 슬롯 7개 (고정 순서)
    MUSCLES.forEach(m => {
      const slot = document.createElement("div");
      slot.className = "slot" + (selected.includes(m) ? " filled" : "");
      slot.textContent = selected.includes(m) ? m : "";
      dayCard.appendChild(slot);
    });

    calendarGrid.appendChild(dayCard);
  }
}

// ---------- 내보내기 ----------
function buildExportText(records){
  // 날짜 오름차순 정렬
  const keys = Object.keys(records)
    .filter(k => Array.isArray(records[k]) && records[k].length > 0)
    .sort((a,b) => a.localeCompare(b));

  if(keys.length === 0) return "";

  return keys.map(k => {
    const arr = MUSCLES.filter(m => records[k].includes(m));
    return `${k}: ${arr.join(", ")}`;
  }).join("\n");
}

function renderExport(){
  const records = loadRecords();
  exportText.textContent = buildExportText(records);

  copyBtn.onclick = async () => {
    const text = exportText.textContent || "";
    try{
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "복사됨!";
      setTimeout(() => copyBtn.textContent = "복사하기", 900);
    }catch{
      // iOS 일부 환경 fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      copyBtn.textContent = "복사됨!";
      setTimeout(() => copyBtn.textContent = "복사하기", 900);
    }
  };
}

// ---------- 초기 실행 ----------
(function init(){
  // 홈 부위 버튼 렌더 먼저(초기 깜빡임 방지)
  renderHome();
  renderLog();
  renderExport();
})();
