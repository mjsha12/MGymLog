const muscles = ["가슴","등","어깨","이두","삼두","코어","하체"];

let selectedDate = getToday();
let records = JSON.parse(localStorage.getItem("records") || "{}");

/* ------------------ 날짜 유틸 ------------------ */
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function pad(n){ return n.toString().padStart(2,"0"); }

/* ------------------ 홈 ------------------ */
function renderHome() {
  document.getElementById("todayLabel").textContent = formatDate(selectedDate);

  document.querySelectorAll(".muscle").forEach(btn=>{
    const m = btn.dataset.muscle;
    btn.classList.toggle(
      "selected",
      records[selectedDate]?.includes(m)
    );
  });

  updateDoneBtn();
  updateLastInfo();
}

function toggleMuscle(muscle){
  if(!records[selectedDate]) records[selectedDate]=[];

  if(records[selectedDate].includes(muscle)){
    records[selectedDate] = records[selectedDate].filter(m=>m!==muscle);
    if(records[selectedDate].length===0) delete records[selectedDate];
  }else{
    records[selectedDate].push(muscle);
  }

  save();
  renderHome();
  renderCalendar();
  renderExport();
}

function updateDoneBtn(){
  const btn = document.querySelector(".done-btn");
  if(records[selectedDate]?.length){
    btn.style.background="#000";
    btn.style.color="#fff";
  }else{
    btn.style.background="#aaa";
    btn.style.color="#fff";
  }
}

/* ------------------ 기록 ------------------ */
function renderCalendar(){
  const cal = document.querySelector(".calendar");
  cal.innerHTML="";

  const start = getWeekStart(selectedDate);
  for(let i=0;i<14;i++){
    const date = addDays(start,i);
    const day = document.createElement("div");
    day.className="day";
    if(date===selectedDate) day.classList.add("today");

    const h4 = document.createElement("h4");
    h4.textContent = formatDate(date);
    day.appendChild(h4);

    muscles.forEach(m=>{
      const s = document.createElement("div");
      s.className="slot";
      if(records[date]?.includes(m)){
        s.classList.add("filled");
        s.textContent=m;
      }
      day.appendChild(s);
    });

    cal.appendChild(day);
  }
}

/* ------------------ 내보내기 ------------------ */
function renderExport(){
  const box = document.querySelector("pre");
  const lines = Object.keys(records)
    .sort()
    .map(d => `${d}: ${records[d].join(", ")}`);
  box.textContent = lines.join("\n");
}

function copyExport(){
  navigator.clipboard.writeText(document.querySelector("pre").textContent);
}

/* ------------------ 날짜 이동 ------------------ */
function moveDate(diff){
  const today = getToday();
  const next = addDays(selectedDate,diff);
  if(next>today) return;
  selectedDate=next;
  renderAll();
}

/* ------------------ 헬퍼 ------------------ */
function addDays(date,n){
  const d = new Date(date+"T12:00:00");
  d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function getWeekStart(date){
  const d = new Date(date+"T12:00:00");
  d.setDate(d.getDate()-d.getDay()-7);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function formatDate(d){
  const [y,m,dd]=d.split("-");
  return `${m}.${dd}`;
}

function updateLastInfo(){
  const info = muscles.map(m=>{
    let last=null;
    Object.keys(records).forEach(d=>{
      if(records[d].includes(m)) last=d;
    });
    if(!last) return `${m}: 기록 없음`;
    const diff = Math.floor((new Date(selectedDate)-new Date(last+"T12:00:00"))/86400000);
    return `${m}: ${diff}일 전`;
  });
  document.querySelector(".last-info").textContent=info.join(" · ");
}

function save(){
  localStorage.setItem("records",JSON.stringify(records));
}

function renderAll(){
  renderHome();
  renderCalendar();
  renderExport();
}

renderAll();
