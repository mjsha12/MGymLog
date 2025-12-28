const muscles = ["가슴","등","어깨","이두","삼두","코어","하체"];
let viewDate = new Date(); // 홈에서 편집하는 날짜 (기본: 오늘)

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function key(d){ return d.toISOString().slice(0,10); }
function load(){ return JSON.parse(localStorage.getItem("mgym") || "{}"); }
function save(d){ localStorage.setItem("mgym", JSON.stringify(d)); }
function fmt(d){ return `${d.getMonth()+1}.${d.getDate()}`; }

function sundayOfWeek(date){
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

function todayKey(){
  const t = new Date();
  t.setHours(0,0,0,0);
  return key(t);
}

function isToday(d){
  return key(d) === todayKey();
}

function renderHome(){
  $("#todayLabel").textContent = fmt(viewDate);

  const data = load();
  const rec = data[key(viewDate)] || [];

  // ✅ 부위 1개라도 있으면 "운동 완료" 상태(버튼 진하게)
  $("#doneBtn").style.opacity = rec.length ? "1" : "0.35";

  // ✅ 선택 표시
  $$(".muscle").forEach(b=>{
    b.classList.toggle("selected", rec.includes(b.textContent));
  });

  // ✅ 미래 이동 금지: viewDate가 오늘이면 next 비활성
  const next = $("#nextDay");
  if(isToday(viewDate)) next.classList.add("disabled");
  else next.classList.remove("disabled");

  // 마지막 운동 정보(오늘 기준)
  const info = muscles.map(m=>{
    let txt = "기록 없음";
    for(let i=0;i<365;i++){
      const d = new Date();
      d.setHours(0,0,0,0);
      d.setDate(d.getDate()-i);
      if((load()[key(d)]||[]).includes(m)){
        txt = i===0 ? "오늘" : `${i}일 전`;
        break;
      }
    }
    return `${m}: ${txt}`;
  }).join(" · ");
  $("#lastInfo").textContent = info;
}

/**
 * 기록(14일): 전주 일요일 ~ 이번주 토요일
 */
function renderCalendar(){
  const cal = $("#calendar");
  cal.innerHTML = "";

  const today = new Date();
  today.setHours(0,0,0,0);

  const thisSun = sundayOfWeek(today);
  const start = addDays(thisSun, -7);

  for(let i=0;i<14;i++){
    const d = addDays(start, i);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `<h4>${fmt(d)}</h4>`;

    const rec = load()[key(d)] || [];

    muscles.forEach(m=>{
      const s = document.createElement("div");
      s.className = "slot";

      if(rec.includes(m)){
        s.classList.add("filled");
        s.textContent = m;
      } else {
        s.textContent = "";
      }

      cell.appendChild(s);
    });

    cal.appendChild(cell);
  }
}

function renderExport(){
  const d = load();
  $("#exportText").textContent =
    Object.entries(d)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k,v])=>`${k}: ${v.join(", ")}`)
      .join("\n");
}

/* ===== 이벤트 ===== */

// ✅ 운동 완료 버튼은 "누를 필요 없음" → 눌러도 아무 일 안 하게
$("#doneBtn").onclick = ()=>{};

/**
 * ✅ 부위 버튼:
 * - 누르면 그날 기록이 자동 생성됨
 * - 모두 해제되면 그날 기록 자체가 삭제됨
 */
$$(".muscle").forEach(b=>{
  b.onclick = ()=>{
    const d = load();
    const k = key(viewDate);

    if(!d[k]) d[k] = []; // ✅ 자동 생성(운동 완료)

    const m = b.textContent;

    if(d[k].includes(m)){
      d[k] = d[k].filter(x=>x!==m);
    } else {
      d[k].push(m);
    }

    // ✅ 아무 부위도 없으면 기록 삭제(=운동 안 함)
    if(d[k].length === 0) delete d[k];

    save(d);
    renderHome();
    renderCalendar();
  };
});

// 날짜 이동(과거/현재만)
$("#prevDay").onclick = ()=>{
  viewDate = addDays(viewDate, -1);
  renderHome();
};

$("#nextDay").onclick = ()=>{
  if($("#nextDay").classList.contains("disabled")) return;
  viewDate = addDays(viewDate, +1);
  renderHome();
};

// 복사
$("#copyBtn").onclick = ()=>{
  navigator.clipboard.writeText($("#exportText").textContent);
};

// 탭 이동
$$(".tab").forEach(t=>{
  t.onclick = ()=>{
    $$(".tab").forEach(x=>x.classList.remove("active"));
    $$(".page").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    $("#"+t.dataset.tab).classList.add("active");

    if(t.dataset.tab==="record") renderCalendar();
    if(t.dataset.tab==="export") renderExport();
  };
});

// 초기 렌더
renderHome();
renderCalendar();
