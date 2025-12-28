const muscles = ["가슴","등","어깨","이두","삼두","코어","하체"];
let viewDate = new Date();

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function key(d){
  return d.toISOString().slice(0,10);
}

function load(){
  return JSON.parse(localStorage.getItem("mgym") || "{}");
}

function save(data){
  localStorage.setItem("mgym", JSON.stringify(data));
}

function format(d){
  return `${d.getMonth()+1}.${d.getDate()}`;
}

function renderHome(){
  $("#todayLabel").textContent = format(viewDate);
  const data = load();
  const k = key(viewDate);
  const record = data[k] || [];

  $(".done-btn").style.opacity = record.length ? "1" : "0.7";

  $$(".muscle").forEach(btn=>{
    btn.classList.toggle("selected", record.includes(btn.textContent));
  });

  $("#nextDay").classList.toggle(
    "disabled",
    key(viewDate) === key(new Date())
  );

  let info = muscles.map(m=>{
    let days = "기록 없음";
    for(let i=0;i<365;i++){
      let d = new Date();
      d.setDate(d.getDate()-i);
      let r = load()[key(d)];
      if(r && r.includes(m)){
        days = i===0 ? "오늘" : `${i}일 전`;
        break;
      }
    }
    return `${m}: ${days}`;
  }).join("  ");
  $("#lastInfo").textContent = info;
}

function renderCalendar(){
  const cal = $("#calendar");
  cal.innerHTML = "";
  const today = new Date();
  const start = new Date(viewDate);
  start.setDate(start.getDate()-6);

  for(let i=0;i<14;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `<h4>${format(d)}</h4>`;
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
  const data = load();
  $("#exportText").textContent =
    Object.entries(data)
      .map(([d,m])=>`${d}: ${m.join(", ")}`)
      .join("\n");
}

/* 이벤트 */
$(".done-btn").onclick = ()=>{
  const data = load();
  const k = key(viewDate);
  if(data[k]) delete data[k];
  else data[k] = [];
  save(data);
  renderHome();
  renderCalendar();
};

$$(".muscle").forEach(btn=>{
  btn.onclick = ()=>{
    const data = load();
    const k = key(viewDate);
    if(!data[k]) return;
    const m = btn.textContent;
    data[k].includes(m)
      ? data[k]=data[k].filter(x=>x!==m)
      : data[k].push(m);
    save(data);
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

