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

function isToday(d){
  const t = new Date(); t.setHours(0,0,0,0);
  const x = new Date(d); x.setHours(0,0,0,0);
  return key(t) === key(x);
}

function renderHome(){
  $("#todayLabel").textContent = fmt(viewDate);

  const data = load();
  const rec = data[key(viewDate)] || [];

  // 기록이 있으면 버튼 좀 더 진하게 느껴지게
  $("#doneBtn").style.opacity = rec.length ? "1" : "0.7";

  // 부위 선택 표시
  $$(".muscle").forEach(b=>{
    b.classList.toggle("selected", rec.includes(b.textContent));
  });

  // 미래 이동 금지: viewDate가 오늘이면 next 비활성
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
 * ✅ 기록(14일) 규칙:
 * "오늘이 포함된 주의 전주 일요일" ~ "오늘이 포함된 주의 토요일"
 * => 전주(일~토) + 이번주(일~토) = 14일
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

    // ✅ 7개 슬롯을 항상 같은 순서로 유지 + 텍스트 표시
    muscles.forEach(m=>{
      const s = document.createElement("div");
      s.className = "slot";

      if(rec.includes(m)){
        s.classList.add("filled");
        s.textContent = m;   // ✅ 여기에 "등/가슴..." 표시
      } else {
        s.textContent = "";  // 빈칸 유지
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

// 운동 완료: 해당 날짜(viewDate)의 기록 토글
$("#doneBtn").onclick = ()=>{
  const d = load();
  const k = key(viewDate);

  // 있으면 삭제(취소), 없으면 생성(운동 완료)
  d[k] ? delete d[k] : d[k] = [];

  save(d);
  renderHome();
  renderCalendar();
};

// 부위 선택: 운동 완료(=해당 날짜 key 존재)된 날만 선택 가능
$$(".muscle").forEach(b=>{
  b.onclick = ()=>{
    const d = load();
    const k = key(viewDate);
    if(!d[k]) return; // 운동 완료를 먼저 누르기 전이면 무시

    const m = b.textContent;
    d[k].includes(m)
      ? d[k] = d[k].filter(x=>x!==m)
      : d[k].push(m);

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
