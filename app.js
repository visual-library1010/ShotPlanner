// Shot Designer (Vanilla) — single-file app logic.
// No build step. Works on GitHub Pages.

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const hudZoom = document.getElementById('hud-zoom');

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnSave = document.getElementById('btn-save');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnClear = document.getElementById('btn-clear');
const btnDelete = document.getElementById('btn-delete');
const fileLoad = document.getElementById('file-load');

const propsEmpty = document.getElementById('props-empty');
const propsForm = document.getElementById('props-form');
const cameraFields = document.getElementById('camera-fields');

const rowCameraColor = document.getElementById('row-camera-color');
const rowColorPicker = document.getElementById('row-color-picker');
const cameraPalette = document.getElementById('camera-palette');


const P = {
  id: document.getElementById('p-id'),
  type: document.getElementById('p-type'),
  label: document.getElementById('p-label'),
  x: document.getElementById('p-x'),
  y: document.getElementById('p-y'),
  rot: document.getElementById('p-rot'),
  rotLabel: document.getElementById('p-rot-label'),
  sx: document.getElementById('p-sx'),
  sy: document.getElementById('p-sy'),
  color: document.getElementById('p-color'),
  w: document.getElementById('p-w'),
  h: document.getElementById('p-h'),  shotNumber: document.getElementById('p-shotNumber'),
  shotType: document.getElementById('p-shotType'),
  lens: document.getElementById('p-lens'),
  nickname: document.getElementById('p-nickname'),
  techNotes: document.getElementById('p-techNotes'),
  productionNotes: document.getElementById('p-productionNotes'),
  sceneNumber: document.getElementById('p-sceneNumber'),
  setupNumber: document.getElementById('p-setupNumber'),
  cameraSupport: document.getElementById('p-cameraSupport'),
};

const STORAGE_KEY = 'shot-designer-vanilla-scene-v1';

// ---------- State ----------
let state = {
  elements: [],
  selectedId: null,
};

// history stacks of serialized snapshots
let history = [];
let redo = [];
let isInternal = false;

// view transform
let view = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const INITIAL_ELEMENTS = [
  {
    id: 'char-1',
    type: 'character',
    x: 200,
    y: 200,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: '#3b82f6',
    label: 'Protagonist',
    width: 40,
    height: 40,
  },
  {
    id: 'cam-1',
    type: 'camera',
    x: 420,
    y: 420,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: '#1c1917',
    label: 'Cam A',
    width: 52,
    height: 52,    shotNumber: '',
    shotType: '',
    lens: '',
    nickname: '',
    techNotes: '',
    productionNotes: '',
    sceneNumber: '',
    setupNumber: '',
    cameraSupport: '',
  },
];

// ---------- Utilities ----------
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function rad(deg){ return (deg * Math.PI) / 180; }
function deg(r){ return (r * 180) / Math.PI; }
function uid(prefix){
  const r = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${r}`;
}

function deepClone(obj){
  return JSON.parse(JSON.stringify(obj));
}

function snapshot(){
  return JSON.stringify({ elements: state.elements, selectedId: state.selectedId });
}

function restoreFromSnapshot(snap){
  const parsed = JSON.parse(snap);
  state.elements = parsed.elements || [];
  state.selectedId = parsed.selectedId ?? null;
  syncPropsUI();
  syncButtons();
  saveToStorage();
  draw();
}

function pushHistory(){
  if (isInternal) return;
  history.push(snapshot());
  if (history.length > 200) history.shift();
  redo = [];
  syncButtons();
}

function undo(){
  if (!history.length) return;
  const current = snapshot();
  const prev = history.pop();
  redo.push(current);
  isInternal = true;
  restoreFromSnapshot(prev);
  isInternal = false;
  syncButtons();
}

function redoDo(){
  if (!redo.length) return;
  const current = snapshot();
  const next = redo.pop();
  history.push(current);
  isInternal = true;
  restoreFromSnapshot(next);
  isInternal = false;
  syncButtons();
}

function saveToStorage(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements: state.elements }));
  }catch(e){}
}

function loadFromStorage(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed.elements)) return parsed.elements;
  }catch(e){}
  return null;
}

function getSelected(){
  return state.elements.find(e => e.id === state.selectedId) || null;
}

function setSelected(id){
  state.selectedId = id;
  syncPropsUI();
  syncButtons();
  draw();
}

function updateElement(id, patch){
  const idx = state.elements.findIndex(e => e.id === id);
  if (idx < 0) return;
  pushHistory();
  state.elements[idx] = { ...state.elements[idx], ...patch };
  saveToStorage();
  syncPropsUI();
  draw();
}

function addElement(type){
  pushHistory();
  const center = screenToWorld(canvas.clientWidth/2, canvas.clientHeight/2);
  let el = {
    id: uid(type),
    type,
    x: center.x + (Math.random()*20-10),
    y: center.y + (Math.random()*20-10),
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: '#78716c',
    label: '',
    width: 60,
    height: 60,
  };

  if (type === 'character'){
    el.color = '#3b82f6';
    el.label = 'Character';
    el.width = 40; el.height = 40;
  } else if (type === 'camera'){
    el.color = '#1c1917';
    el.label = 'Camera';
    el.width = 52; el.height = 52;
    el.fov = 60;
    el.shotNumber = '';
    el.shotType = '';
    el.lens = '';
    el.nickname = '';
    el.techNotes = '';
    el.productionNotes = '';
    el.sceneNumber = '';
    el.setupNumber = '';
    el.cameraSupport = '';
  } else if (type === 'wall'){
    el.color = '#f59e0b';
    el.label = 'Wall';
    el.width = 180; el.height = 10;
  } else if (type === 'furniture'){
    el.color = '#10b981';
    el.label = 'Furniture';
    el.width = 120; el.height = 70;
  } else if (type === 'label'){
    el.color = '#e5e7eb';
    el.label = 'Label';
    el.width = 140; el.height = 30;
  }

  state.elements.push(el);
  setSelected(el.id);
  saveToStorage();
}

function deleteSelected(){
  if (!state.selectedId) return;
  pushHistory();
  state.elements = state.elements.filter(e => e.id !== state.selectedId);
  state.selectedId = null;
  syncPropsUI();
  syncButtons();
  saveToStorage();
  draw();
}

// ---------- Coordinate transforms ----------
function resizeCanvasToDisplaySize(){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h){
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(1,0,0,1,0,0);
  }
}

function worldToScreen(x,y){
  return {
    x: (x * view.scale + view.offsetX),
    y: (y * view.scale + view.offsetY),
  };
}
function screenToWorld(x,y){
  return {
    x: (x - view.offsetX) / view.scale,
    y: (y - view.offsetY) / view.scale,
  };
}

// ---------- Drawing ----------
function drawGrid(){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width * dpr;
  const h = rect.height * dpr;

  const spacing = 40 * view.scale * dpr;
  const ox = (view.offsetX * dpr) % spacing;
  const oy = (view.offsetY * dpr) % spacing;

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1 * dpr;
  for (let x = ox; x < w; x += spacing){
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = oy; y < h; y += spacing){
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function draw(){
  resizeCanvasToDisplaySize();
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width * dpr;
  const h = rect.height * dpr;

  ctx.clearRect(0,0,w,h);
  drawGrid();

  // world->screen handled manually per element for easier hit tests
  for (const el of state.elements){
    drawElement(el);
  }

  const sel = getSelected();
  if (sel) drawSelection(sel);

  hudZoom.textContent = `${Math.round(view.scale*100)}%`;
}

function drawElement(el){
  const dpr = window.devicePixelRatio || 1;
  const p = worldToScreen(el.x, el.y);
  const w = (el.width || 60) * el.scaleX * view.scale;
  const h = (el.height || 60) * el.scaleY * view.scale;

  ctx.save();
  ctx.translate(p.x * dpr, p.y * dpr);
  ctx.rotate(rad(el.rotation));
  ctx.fillStyle = el.color || '#999';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2 * dpr;

  if (el.type === 'character'){
    const r = (Math.max(el.width||40, el.height||40) / 2) * el.scaleX * view.scale * dpr;
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // facing line
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(r,0);
    ctx.stroke();
  }
  else if (el.type === 'camera'){
    const size = (Math.max(el.width||52, el.height||52)) * el.scaleX * view.scale * dpr;
    const r = size/2;

    // circular background
    ctx.beginPath();
    ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // camera body
    const bodyW = r * 1.2;
    const bodyH = r * 0.7;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.roundRect(-bodyW/2, -bodyH/2, bodyW, bodyH, r*0.15);
    ctx.fill();

    // lens
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.arc(0, 0, r*0.22, 0, Math.PI*2);
    ctx.fill();

    // top viewfinder block
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.roundRect(-bodyW*0.35, -bodyH/2 - r*0.22, bodyW*0.4, r*0.25, r*0.08);
    ctx.fill();
  }
  else if (el.type === 'wall'){
    const ww = w * dpr;
    const hh = h * dpr;
    ctx.fillStyle = el.color || '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-ww/2, -hh/2, ww, hh, 8*dpr);
    ctx.fill();
    ctx.stroke();
  }
  else if (el.type === 'furniture'){
    const ww = w * dpr;
    const hh = h * dpr;
    ctx.fillStyle = el.color || '#10b981';
    ctx.beginPath();
    ctx.roundRect(-ww/2, -hh/2, ww, hh, 12*dpr);
    ctx.fill();
    ctx.stroke();

    // inner detail
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(-ww*0.35, -hh*0.25, ww*0.7, hh*0.5);
  }
  else if (el.type === 'label'){
    // text label (draw rounded rect + text)
    const ww = w * dpr;
    const hh = h * dpr;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.roundRect(-ww/2, -hh/2, ww, hh, 10*dpr);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = el.color || '#e5e7eb';
    ctx.font = `${Math.max(12, hh*0.45)}px ui-sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((el.label || 'Label').slice(0, 50), 0, 0, ww*0.95);
  }

  // default label for others
  if (el.type !== 'label'){
    const label = (el.label || '').trim();
    if (label){
      ctx.save();
      ctx.rotate(-rad(el.rotation));
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.max(12, 12*view.scale*dpr)}px ui-sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, 0, (h*0.55)*dpr, 220*dpr);
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawSelection(el){
  const dpr = window.devicePixelRatio || 1;
  const p = worldToScreen(el.x, el.y);
  const w = (el.width || 60) * el.scaleX * view.scale;
  const h = (el.height || 60) * el.scaleY * view.scale;

  ctx.save();
  ctx.translate(p.x * dpr, p.y * dpr);
  ctx.rotate(rad(el.rotation));
  ctx.strokeStyle = 'rgba(59,130,246,0.95)';
  ctx.lineWidth = 2 * dpr;
  ctx.setLineDash([6*dpr, 6*dpr]);

  // selection bounds (approx)
  const ww = w * dpr;
  const hh = h * dpr;
  ctx.strokeRect(-ww/2, -hh/2, ww, hh);

  // center dot
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(59,130,246,0.95)';
  ctx.beginPath();
  ctx.arc(0,0,3*dpr,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

// ---------- Hit testing ----------
function hitTest(worldX, worldY){
  // topmost wins
  for (let i = state.elements.length - 1; i >= 0; i--){
    const el = state.elements[i];
    if (pointInElement(worldX, worldY, el)) return el;
  }
  return null;
}

function pointInElement(px, py, el){
  // transform point into element local space
  const dx = px - el.x;
  const dy = py - el.y;
  const a = -rad(el.rotation);
  const lx = dx*Math.cos(a) - dy*Math.sin(a);
  const ly = dx*Math.sin(a) + dy*Math.cos(a);

  const w = (el.width || 60) * el.scaleX;
  const h = (el.height || 60) * el.scaleY;

  if (el.type === 'character'){
    const r = Math.max(w,h)/2;
    return (lx*lx + ly*ly) <= r*r;
  }

  // simple AABB in local
  return Math.abs(lx) <= w/2 && Math.abs(ly) <= h/2;
}

// ---------- Interaction ----------
let drag = {
  active: false,
  mode: 'move', // move|pan
  startWorld: {x:0,y:0},
  startEl: null,
  startOffset: {x:0,y:0},
};

canvas.addEventListener('mousedown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const w = screenToWorld(sx, sy);

  if (e.button !== 0) return;

  // space + drag => pan
  if (e.code === 'Space' || e.key === ' ' || e.buttons === 1 && keys.Space){
    drag.active = true;
    drag.mode = 'pan';
    drag.startOffset = {x: view.offsetX, y: view.offsetY};
    drag.startWorld = {x: sx, y: sy}; // screen coords for pan
    canvas.style.cursor = 'grabbing';
    return;
  }

  const hit = hitTest(w.x, w.y);
  if (!hit){
    setSelected(null);
    return;
  }

  setSelected(hit.id);
  drag.active = true;
  drag.mode = 'move';
  drag.startWorld = w;
  drag.startEl = deepClone(hit);
  pushHistory();
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e)=>{
  if (!drag.active) return;

  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (drag.mode === 'pan'){
    const dx = sx - drag.startWorld.x;
    const dy = sy - drag.startWorld.y;
    view.offsetX = drag.startOffset.x + dx;
    view.offsetY = drag.startOffset.y + dy;
    draw();
    return;
  }

  const w = screenToWorld(sx, sy);
  const sel = getSelected();
  if (!sel || !drag.startEl) return;

  const dx = w.x - drag.startWorld.x;
  const dy = w.y - drag.startWorld.y;
  sel.x = drag.startEl.x + dx;
  sel.y = drag.startEl.y + dy;

  // reflect
  const idx = state.elements.findIndex(x => x.id === sel.id);
  if (idx >= 0) state.elements[idx] = sel;

  saveToStorage();
  syncPropsUI(true); // keep typing smooth
  draw();
});

window.addEventListener('mouseup', ()=>{
  if (!drag.active) return;
  drag.active = false;
  drag.startEl = null;
  canvas.style.cursor = 'default';
});

canvas.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  const before = screenToWorld(sx, sy);
  const speed = 1.1;
  const nextScale = e.deltaY < 0 ? view.scale * speed : view.scale / speed;
  view.scale = clamp(nextScale, 0.1, 6);

  const after = screenToWorld(sx, sy);
  // keep point under cursor stable
  view.offsetX += (after.x - before.x) * view.scale;
  view.offsetY += (after.y - before.y) * view.scale;

  draw();
}, {passive:false});

const keys = { Space:false };
window.addEventListener('keydown', (e)=>{
  if (e.code === 'Space') keys.Space = true;

  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod && !e.shiftKey && e.key.toLowerCase() === 'z'){
    e.preventDefault();
    undo();
  } else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))){
    e.preventDefault();
    redoDo();
  } else if (e.key === 'Delete' || e.key === 'Backspace'){
    if (state.selectedId) deleteSelected();
  }
});
window.addEventListener('keyup', (e)=>{
  if (e.code === 'Space') keys.Space = false;
});

// ---------- UI wiring ----------
document.querySelectorAll('[data-add]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    addElement(btn.getAttribute('data-add'));
  });
});

btnDelete.addEventListener('click', deleteSelected);

btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redoDo);

btnClear.addEventListener('click', ()=>{
  pushHistory();
  state.elements = [];
  state.selectedId = null;
  saveToStorage();
  syncPropsUI();
  syncButtons();
  draw();
});

btnSave.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify({ elements: state.elements }, null, 2)], {type:'application/json'});
  downloadBlob(blob, `shot-designer-scene-${new Date().toISOString().slice(0,10)}.json`);
});

fileLoad.addEventListener('change', async ()=>{
  const f = fileLoad.files?.[0];
  if (!f) return;
  const txt = await f.text();
  try{
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed.elements)) throw new Error('Missing elements[]');
    pushHistory();
    state.elements = parsed.elements;
    state.selectedId = null;
    saveToStorage();
    syncPropsUI();
    syncButtons();
    draw();
  }catch(err){
    alert('Could not load JSON: ' + err.message);
  }finally{
    fileLoad.value = '';
  }
});

btnExportCsv.addEventListener('click', ()=>{
  const cams = state.elements.filter(e => e.type === 'camera');
  const cols = [
    'id','label','x','y','rotation','shotNumber','shotType','lens','nickname',
    'sceneNumber','setupNumber','cameraSupport','techNotes','productionNotes'
  ];
  const rows = [cols.join(',')];
  for (const c of cams){
    rows.push(cols.map(k => csvEscape(c[k] ?? '')).join(','));
  }
  const blob = new Blob([rows.join('\n')], {type:'text/csv'});
  downloadBlob(blob, `shot-designer-shots-${new Date().toISOString().slice(0,10)}.csv`);
});

function csvEscape(v){
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
  return s;
}

function downloadBlob(blob, filename){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

// ---------- Properties panel ----------
function syncButtons(){
  btnUndo.disabled = history.length === 0;
  btnRedo.disabled = redo.length === 0;
  btnDelete.disabled = !state.selectedId;
}

function syncPropsUI(skipFocusPreserve=false){
  const el = getSelected();
  if (!el){
    propsEmpty.classList.remove('hidden');
    propsForm.classList.add('hidden');
    cameraFields.classList.add('hidden');
    return;
  }

  propsEmpty.classList.add('hidden');
  propsForm.classList.remove('hidden');

  const isCamera = el.type === 'camera';
  const isCharacter = el.type === 'character';

  P.id.value = el.id;
  P.type.value = el.type;
  P.label.value = el.label ?? '';
  P.x.value = Math.round(el.x);
  P.y.value = Math.round(el.y);
  P.rot.value = Math.round(el.rotation);
  P.rotLabel.textContent = `${Math.round(el.rotation)}°`;
  P.sx.value = Number(el.scaleX ?? 1).toFixed(2);
  P.sy.value = Number(el.scaleY ?? 1).toFixed(2);
  P.color.value = el.color ?? '#78716c';

  if (cameraPalette){
    const current = (el.color || '').toLowerCase();
    cameraPalette.querySelectorAll('.swatch').forEach(btn=>{
      const c = (btn.getAttribute('data-color') || '').toLowerCase();
      if ((isCamera || isCharacter) && c === current) btn.classList.add('selected');
      else btn.classList.remove('selected');
    });
  }
  P.w.value = Math.round(el.width ?? 60);
  P.h.value = Math.round(el.height ?? 60);



  if (rowCameraColor && rowColorPicker){
    if (isCamera || isCharacter){
      rowCameraColor.classList.remove('hidden');
      rowColorPicker.classList.add('hidden');
    } else {
      rowCameraColor.classList.add('hidden');
      rowColorPicker.classList.remove('hidden');
    }
  }

  const rowShot = document.getElementById('row-shotNumber');
  if (rowShot){
    if (isCamera) rowShot.classList.remove('hidden');
    else rowShot.classList.add('hidden');
  }


  // Hide specific fields for camera
  [P.id, P.type, P.x, P.y, P.sx, P.sy].forEach(input=>{
    const row = input.closest('.row') || input.closest('.grid2');
    if(row){
      if(isCamera || isCharacter) row.classList.add('hidden');
      else row.classList.remove('hidden');
    }
  });

  if (isCamera){

    cameraFields.classList.remove('hidden');
        P.shotNumber.value = el.shotNumber ?? '';
    P.shotType.value = el.shotType ?? '';
    P.lens.value = el.lens ?? '';
    P.nickname.value = el.nickname ?? '';
    P.techNotes.value = el.techNotes ?? '';
    P.productionNotes.value = el.productionNotes ?? '';
    P.sceneNumber.value = el.sceneNumber ?? '';
    P.setupNumber.value = el.setupNumber ?? '';
    P.cameraSupport.value = el.cameraSupport ?? '';
  } else {
    cameraFields.classList.add('hidden');
  }
}

function bindPropInput(elm, getter){
  elm.addEventListener('input', ()=>{
    const sel = getSelected();
    if (!sel) return;
    const patch = getter(sel);
    updateElement(sel.id, patch);
  });
}

bindPropInput(P.label, ()=>({label: P.label.value}));
bindPropInput(P.x, ()=>({x: Number(P.x.value)}));
bindPropInput(P.y, ()=>({y: Number(P.y.value)}));
bindPropInput(P.rot, ()=>({rotation: Number(P.rot.value), }));
P.rot.addEventListener('input', ()=>{ P.rotLabel.textContent = `${Math.round(Number(P.rot.value))}°`; });
bindPropInput(P.sx, ()=>({scaleX: clamp(Number(P.sx.value), 0.1, 10)}));
bindPropInput(P.sy, ()=>({scaleY: clamp(Number(P.sy.value), 0.1, 10)}));
bindPropInput(P.color, ()=>({color: P.color.value}));
bindPropInput(P.w, ()=>({width: clamp(Number(P.w.value), 1, 2000)}));
bindPropInput(P.h, ()=>({height: clamp(Number(P.h.value), 1, 2000)}));

bindPropInput(P.shotNumber, ()=>({shotNumber: P.shotNumber.value}));
bindPropInput(P.shotType, ()=>({shotType: P.shotType.value}));
bindPropInput(P.lens, ()=>({lens: P.lens.value}));
bindPropInput(P.nickname, ()=>({nickname: P.nickname.value}));
bindPropInput(P.techNotes, ()=>({techNotes: P.techNotes.value}));
bindPropInput(P.productionNotes, ()=>({productionNotes: P.productionNotes.value}));
bindPropInput(P.sceneNumber, ()=>({sceneNumber: P.sceneNumber.value}));
bindPropInput(P.setupNumber, ()=>({setupNumber: P.setupNumber.value}));
bindPropInput(P.cameraSupport, ()=>({cameraSupport: P.cameraSupport.value}));


if (cameraPalette){
  cameraPalette.querySelectorAll('.swatch').forEach(btn=>{
    const color = btn.getAttribute('data-color');
    btn.style.background = color;
    btn.addEventListener('click', ()=>{
      const sel = getSelected();
      if (!sel || (sel.type !== 'camera' && sel.type !== 'character')) return;
      updateElement(sel.id, {color});
      cameraPalette.querySelectorAll('.swatch').forEach(s=>s.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

// ---------- Init ----------
function init(){
  const saved = loadFromStorage();
  state.elements = saved ?? deepClone(INITIAL_ELEMENTS);
  state.selectedId = null;
  history = [];
  redo = [];
  view.scale = 1;
  view.offsetX = 0;
  view.offsetY = 0;

  syncPropsUI();
  syncButtons();
  draw();
}

window.addEventListener('resize', draw);
init();
