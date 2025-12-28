const muscles = ["가슴","등","어깨","이두","삼두","코어","하체"];
let viewDate = new Date();

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function key(d){ return d.toISOString().slice(0,10); }
function load(){ return JSON.parse(localStorage.getItem("mgym") || "{}"); }
function save(d){ localStorage.setItem("mgym", JSON.stringify(d)); }
function fmt(d){ return `${d.getMonth()+1}.${d.getDate()}`; }

function renderHome(){
  $("#todayLabel").textContent = fmt(viewDate);
  const data = load();
  const rec = data[key(viewDate)] || [];

  $(".done-btn").style.opacity = rec.length ? "1" : "0.7";

  $$(".muscle").forEach(b=>{
    b.classList.toggle("selected", rec.includes(b.textContent));
  });

  $("#nextDay").classList.toggle(
    "disabled",
    key(viewDate) === key(new Date())
  );

  const info = muscles.map(m=>{
    let txt = "기록 없음";
    for(let i=0;i<365;i++){
      const d = new Date();
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

function renderCalendar(){
  const cal = $("#calendar");
  cal.innerHTML = "";

  const start = new Date(viewDate);
  start.setDate(start.getDate()-6);

  for(let i=0;i<14;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `<h4>${fmt(d)}</h4>`;

    const rec = load()[key(d)] || [];
    muscles.forEach(m=>{
      const s = document.createElement("div");
      s.className = "slot";
      if(rec.includes(m)) s.style.background = "#000";
      cell.appendChild(s);
    });

    cal.appendChild(cell);
  }
}

function renderExport(){
  const d = load();
  $("#exportText").textContent =
    Object.entries(d)
      .map(([k,v])=>`${k}: ${v.join(", ")}`)
      .join("\n");
}

/* 이벤트 */
$("#doneBtn").onclick = ()=>{
  const d = load();
  const k = key(viewDate);
  d[k] ? delete d[k] : d[k] = [];
  save(d);
  renderHome();
  renderCalendar();
};

$$(".muscle").forEach(b=>{
  b.onclick = ()=>{
    const d = load();
    const k = key(viewDate);
    if(!d[k]) return;
    const m = b.textContent;
    d[k].includes(m) ? d[k]=d[k].filter(x=>x!==m) : d[k].push(m);
    save(d);
    renderHome();
    renderCalendar();
  };
});

$("#prevDay").onclick = ()=>{
  viewDate.setDate(viewDate.getDate()-1);
  renderHome();
};

$("#nextDay").onclick = ()=>{
  if($("#nextDay").classList.contains("disabled")) return;
  viewDate.setDate(viewDate.getDate()+1);
  renderHome();
};

$("#copyBtn").onclick = ()=>{
  navigator.clipboard.writeText($("#exportText").textContent);
};

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

renderHome();
renderCalendar();
