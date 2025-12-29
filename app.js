const muscles = ["가슴","등","어깨","이두","삼두","코어","하체"];
let selectedDate;
let records = {};

/* 날짜 유틸 */
function pad(n){return n.toString().padStart(2,"0");}
function today(){
  const d=new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function addDays(date,n){
  const d=new Date(date+"T12:00:00");
  d.setDate(d.getDate()+n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function weekStart(date){
  const d=new Date(date+"T12:00:00");
  d.setDate(d.getDate()-d.getDay()-7);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function fmt(date){
  const [,m,d]=date.split("-");
  return `${m}.${d}`;
}

/* 저장 */
function load(){
  records=JSON.parse(localStorage.getItem("records")||"{}");
}
function save(){
  localStorage.setItem("records",JSON.stringify(records));
}

/* 홈 */
function toggleMuscle(m){
  if(!records[selectedDate]) records[selectedDate]=[];
  if(records[selectedDate].includes(m)){
    records[selectedDate]=records[selectedDate].filter(x=>x!==m);
    if(records[selectedDate].length===0) delete records[selectedDate];
  }else{
    records[selectedDate].push(m);
  }
  save(); renderAll();
}

function renderHome(){
  document.getElementById("todayLabel").textContent=fmt(selectedDate);

  document.querySelectorAll(".muscle").forEach(b=>{
    b.classList.toggle("selected",records[selectedDate]?.includes(b.dataset.muscle));
  });

  const done=document.querySelector(".done-btn");
  if(records[selectedDate]?.length){
    done.style.background="#000";
  }else{
    done.style.background="#aaa";
  }

  const info=muscles.map(m=>{
    let last=null;
    Object.keys(records).forEach(d=>{
      if(records[d]?.includes(m)) last=d;
    });
    if(!last) return `${m}: 기록 없음`;
    const diff=(new Date(selectedDate)-new Date(last+"T12:00:00"))/86400000|0;
    return `${m}: ${diff}일 전`;
  });
  document.querySelector(".last-info").textContent=info.join(" · ");

  const next=document.getElementById("nextBtn");
  next.disabled=selectedDate>=today();
  next.classList.toggle("disabled",selectedDate>=today());
}

/* 기록 */
function renderCalendar(){
  const cal=document.querySelector(".calendar");
  cal.innerHTML="";
  const start=weekStart(selectedDate);

  for(let i=0;i<14;i++){
    const d=addDays(start,i);
    const box=document.createElement("div");
    box.className="day"+(d===today()?" today":"");

    const h=document.createElement("h4");
    h.textContent=fmt(d);
    box.appendChild(h);

    muscles.forEach(m=>{
      const s=document.createElement("div");
      s.className="slot";
      if(records[d]?.includes(m)){
        s.classList.add("filled");
        s.textContent=m;
      }
      box.appendChild(s);
    });
    cal.appendChild(box);
  }
}

/* 내보내기 */
function renderExport(){
  const pre=document.querySelector("pre");
  const lines=Object.keys(records).sort().map(d=>`${d}: ${records[d].join(", ")}`);
  pre.textContent=lines.join("\n");
}

function copyExport(){
  navigator.clipboard.writeText(document.querySelector("pre").textContent);
}

/* 탭 */
function setTab(t){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(t).classList.add("active");
  document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${t}"]`).classList.add("active");
}

/* 날짜 이동 */
function move(n){
  const next=addDays(selectedDate,n);
  if(next>today()) return;
  selectedDate=next;
  renderAll();
}

function renderAll(){
  renderHome();
  renderCalendar();
  renderExport();
}

/* 초기화 */
document.addEventListener("DOMContentLoaded",()=>{
  load();
  selectedDate=today();

  document.querySelectorAll(".muscle").forEach(b=>{
    b.onclick=()=>toggleMuscle(b.dataset.muscle);
  });

  document.getElementById("prevBtn").onclick=()=>move(-1);
  document.getElementById("nextBtn").onclick=()=>move(1);
  document.getElementById("copyBtn").onclick=copyExport;

  document.querySelectorAll(".tab").forEach(b=>{
    b.onclick=()=>setTab(b.dataset.tab);
  });

  renderAll();
});

