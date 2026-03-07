
function getNextSetupNumber(){
  const cams = state.elements.filter(e=>e.type==='camera' && !e.isTrackTarget);
  if(cams.length===0) return 1;
  const nums = cams.map(c=>parseInt(c.setupNumber)||0);
  return Math.max(...nums)+1;
}

const APP_VERSION = "v148";

function getCanvasCenterWorld(){
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width/2;
  const sy = rect.height/2;
  return screenToWorld(sx, sy);
}




function createTrackTargetFor(sourceEl, overrides = null){
  const hasOverridePos = !!(overrides && typeof overrides.x === 'number' && typeof overrides.y === 'number');
  const targetX = hasOverridePos ? overrides.x : (sourceEl.x + (sourceEl.type === 'character' ? 120 : 80));
  const targetY = hasOverridePos ? overrides.y : sourceEl.y;
  // Creates a linked track target for cameras or characters.
  // Cameras keep the existing trackTarget element type; characters get a real 'character' element
  // so dragging/rotating behaves exactly like a normal character.
  pushHistory();

  // Remove existing target if present
  if (sourceEl.trackToId){
    state.elements = state.elements.filter(e => e.id !== sourceEl.trackToId);
    sourceEl.trackToId = null;
  }

  let target;
  if (sourceEl.type === 'character'){
    target = {
      id: uid(),
      type: 'character',
      isTrackTarget: true,
      parentId: sourceEl.id,
      noExport: true,
      color: sourceEl.color || '#999',
      x: targetX,
      y: targetY,
      rotation: sourceEl.rotation || 0,
      scaleX: sourceEl.scaleX ?? 1,
      scaleY: sourceEl.scaleY ?? 1,
      label: '',         // no label on targets
      width: sourceEl.width ?? 40,
      height: sourceEl.height ?? 40,
    };
  } else {
    // camera (original behavior)
    target = {
      id: uid(),
      type: 'trackTarget',
      trackFor: sourceEl.type, // camera
      parentId: sourceEl.id,
      parentId: sourceEl.id,
      color: sourceEl.color || '#111',
      x: targetX,
      y: targetY,
      rotation: sourceEl.rotation || 0,
      scaleX: sourceEl.scaleX ?? 1,
      scaleY: sourceEl.scaleY ?? 1,
      width: sourceEl.width,
      height: sourceEl.height,
      noExport: true
    };
  }

  state.elements.push(target);
  sourceEl.trackToId = target.id;
  sourceEl.trackMode = sourceEl.trackMode || 'to'; // 'to' | 'from' | 'between' | 'circle'

  saveToStorage();
  state.selectedId = target.id;
  syncPropsUI();
  syncButtons();
  draw();
}
// Shot Planner (Vanilla) — single-file app logic.
// No build step. Works on GitHub Pages.

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const hudZoom = document.getElementById('hud-zoom');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomIn = document.getElementById('btn-zoom-in');

const btnScene = document.getElementById('btn-scene');
const sceneMenu = document.getElementById('scene-menu');
const addSceneWrap = document.getElementById('add-scene-wrap');

const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnSave = document.getElementById('btn-save');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnDelete = document.getElementById('btn-delete');
const modalClear = document.getElementById('modal-clear');
const modalDeleteScene = document.getElementById('modal-delete-scene');
const btnDeleteScene = document.getElementById('btn-delete-scene');
const btnConfirmDeleteScene = document.getElementById('btn-confirm-delete-scene');
const modalClearYes = document.getElementById('modal-clear-yes');
const modalClearNo = document.getElementById('modal-clear-no');
const fileLoad = document.getElementById('file-load');
function openModal(modal){
  if (!modal) return;
  modal.setAttribute('aria-hidden','false');
  modal.classList.add('open');
}
function closeModal(modal){
  if (!modal) return;
  modal.setAttribute('aria-hidden','true');
  modal.classList.remove('open');
}


const propsEmpty = document.getElementById('props-empty');
const propsForm = document.getElementById('props-form');
const sceneForm = document.getElementById('scene-form');
const pScene = document.getElementById('p-scene');
const scenePalette = document.getElementById('scene-palette');
const cameraFields = document.getElementById('camera-fields');
const rowTrackTo = document.getElementById('row-trackto');
const btnTrackTo = document.getElementById('btn-trackto');
const rowTrackMode = document.getElementById('row-trackmode');
const pTrackMode = document.getElementById('p-trackmode');

const rowCameraColor = document.getElementById('row-camera-color');
const cameraPalette = document.getElementById('camera-palette');


const P = {
  id: document.getElementById('p-id'),
  type: document.getElementById('p-type'),
  label: document.getElementById('p-label'),
  characterName: document.getElementById('p-characterName'),
  x: document.getElementById('p-x'),
  y: document.getElementById('p-y'),  sx: document.getElementById('p-sx'),
  sy: document.getElementById('p-sy'),
  shotNumber: document.getElementById('p-shotNumber'),
  shotType: document.getElementById('p-shotType'),
  lens: document.getElementById('p-lens'),
  nickname: document.getElementById('p-nickname'),
  techNotes: document.getElementById('p-techNotes'),
  productionNotes: document.getElementById('p-productionNotes'),
  sceneNumber: document.getElementById('p-sceneNumber'),
  setupNumber: document.getElementById('p-setupNumber'),
  cameraSupport: document.getElementById('p-cameraSupport'),
};


const STORAGE_KEY_V1 = 'shot-designer-vanilla-scene-v1';
const STORAGE_KEY = 'shot-planner-scenes-v1';


function getElementLabelText(el){
  if (!el || el.type === 'label') return '';
  if (el.type === 'camera'){
    const shotNum = (el.shotNumber || '').toString().trim();
    const shotType = (el.shotType || '').toString().trim();
    let text = '';
    if (shotNum) text = 'Shot ' + shotNum;
    if (shotNum && shotType) text += ' - ' + shotType;
    else if (!shotNum && shotType) text = shotType;
    return text.trim();
  }
  return ((el.label || '').toString()).trim();
}

function getDefaultLabelOffset(el){
  const h = (el && el.height) ? el.height : 60;
  return { dx: 0, dy: h * 0.60 };
}

function ensureLabelOffsets(){
  for (const el of state.elements){
    if (el.type === 'trackTarget') continue;
    if (typeof el.labelDx !== 'number') el.labelDx = 0;
    if (typeof el.labelDy !== 'number'){
      const d = getDefaultLabelOffset(el);
      el.labelDy = d.dy;
    }
  }
}
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

let lastCanvasPointer = {
  active: false,
  sx: 0,
  sy: 0,
};

function getSpawnOverridesFromCursor(){
  if (!lastCanvasPointer.active) return null;
  const w = screenToWorld(lastCanvasPointer.sx, lastCanvasPointer.sy);
  return { x: w.x, y: w.y };
}

function getTrackTargetOverridesFromCursor(){
  if (lastCanvasPointer.sx === undefined) return null;
  const w = screenToWorld(lastCanvasPointer.sx, lastCanvasPointer.sy);
  return { x: w.x, y: w.y };
}

// scenes (one scene per board)
let scenes = []; // {id, name, color, elements, view}
let activeSceneId = null;

const SCENE_COLORS = ['#ef4444','#3b82f6','#f59e0b','#22c55e','#a855f7','#06b6d4','#f97316','#6366f1','#ec4899','#6b7280'];
function nextSceneColor(){
  const used = new Set(scenes.map(s => s.color).filter(Boolean));
  for (const c of SCENE_COLORS){
    if (!used.has(c)) return c;
  }
  return SCENE_COLORS[scenes.length % SCENE_COLORS.length];
}

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
    label: 'A',
    width: 52,
    height: 52,
    shotNumber: '1',
    shotType: '',
    lens: '',
    nickname: '',
      cameraSupport: 'Tripod',
      cameraSupport: 'Tripod',
    techNotes: '',
    productionNotes: '',
    sceneNumber: '',
    setupNumber: getNextSetupNumber(),
    cameraSupport: 'Tripod',
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

function getNextShotNumber(){
  // Auto-incrementing shot numbers for cameras (ignores tracked/track-target cameras).
  const nums = state.elements
    .filter(e => e.type === 'camera' && !e.isTrackTarget)
    .map(e => parseInt(e.shotNumber, 10))
    .filter(n => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return max + 1;
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
    saveActiveSceneSnapshot();
    const payload = {
      activeSceneId,
      scenes
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }catch(e){}
}

function loadFromStorage(){
  // v2 scenes
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved){
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.scenes)){
        scenes = parsed.scenes;
        activeSceneId = parsed.activeSceneId || (scenes[0] && scenes[0].id) || null;
        return { scenes, activeSceneId };
      }
    }
  }catch(e){}

  // v1 migrate (single scene)
  try{
    const savedV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (savedV1){
      const parsedV1 = JSON.parse(savedV1);
      if (parsedV1 && Array.isArray(parsedV1.elements)){
        const s = {
          id: uid('scene'),
          name: sceneNameForIndex(0),
    sceneNumber: '',
          color: nextSceneColor(),
          elements: parsedV1.elements,
          view: { scale: 1, offsetX: 0, offsetY: 0 }
        };
        scenes = [s];
        activeSceneId = s.id;
        return { scenes, activeSceneId };
      }
    }
  }catch(e){}

  return null;
}


// ---------- Color + Track Linking Normalization ----------
function resolveTrackParent(targetEl, elements){
  if (!targetEl) return null;

  // 1) direct pointer
  if (targetEl.parentId){
    const p = elements.find(e => e.id === targetEl.parentId);
    if (p) return p;
  }

  // 2) reverse lookup from parents
  const p2 = elements.find(e => (e.type === 'camera' || e.type === 'character') && (e.trackToId === targetEl.id || e.trackTo === targetEl.id));
  if (p2){
    targetEl.parentId = p2.id;
    return p2;
  }

  return null;
}

function isTrackTargetEl(el){
  return el && (el.type === 'trackTarget' || el.isTrackTarget === true);
}

function getColorOwner(el){
  if (!el) return null;
  if (isTrackTargetEl(el)){
    const parent = resolveTrackParent(el, state.elements);
    return parent || el;
  }
  return el;
}

function normalizeElements(elements){
  if (!Array.isArray(elements)) return elements;

  // migrate old field names + ensure linkage pointers exist
  for (const el of elements){
    if (!el || typeof el !== 'object') continue;

    // migrate trackTo -> trackToId (older saves)
    if (el.trackTo && !el.trackToId) el.trackToId = el.trackTo;

    // some historical saves used parent instead of parentId
    if (el.parent && !el.parentId) el.parentId = el.parent;

    // normalize booleans
    if (el.isTrackTarget === 'true') el.isTrackTarget = true;
    if (el.isTrackTarget === 'false') el.isTrackTarget = false;
  }

  // ensure targets have parentId and color follows parent
  for (const parent of elements){
    if (!parent || typeof parent !== 'object') continue;
    if ((parent.type === 'camera' || parent.type === 'character') && (parent.trackToId || parent.trackTo)){
      const targetId = parent.trackToId || parent.trackTo;
      const tgt = elements.find(e => e.id === targetId);
      if (tgt){
        if (!tgt.parentId) tgt.parentId = parent.id;
        // mark character targets (if applicable)
        if (parent.type === 'character') tgt.isTrackTarget = true;

        // keep target color matched to parent (source of truth is parent)
        if (parent.color) tgt.color = parent.color;
      }
    }
  }

  // ensure any target without parentId tries to resolve parent
  for (const el of elements){
    if (isTrackTargetEl(el) && !el.parentId){
      const p = resolveTrackParent(el, elements);
      if (p && p.color) el.color = p.color;
    }
  }

  return elements;
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

  // Centralized color sync:
  // - Parent (camera/character) owns color
  // - Track targets inherit; editing a target edits the parent
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'color')){
    const el = state.elements[idx];

    // If a target was edited, forward color to its parent
    if (isTrackTargetEl(el)){
      const parent = resolveTrackParent(el, state.elements);
      if (parent && (parent.type === 'camera' || parent.type === 'character')){
        parent.color = el.color;
        // keep the linked target color matched too
        if (parent.trackToId){
          const tgt = state.elements.find(e => e.id === parent.trackToId);
          if (tgt) tgt.color = parent.color;
        }
      }
    }

    // If a parent was edited, push color to its linked target
    if (el.type === 'camera' || el.type === 'character'){
      if (el.trackToId){
        const tgt = state.elements.find(e => e.id === el.trackToId);
        if (tgt){
          tgt.color = el.color;
          if (!tgt.parentId) tgt.parentId = el.id;
        }
      }
    }
  }

  saveToStorage();
  syncPropsUI(true);
  draw();
}

function addElement(type, overrides = null){
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
    el.color = '#6b7280';
    el.label = '';
    el.width = 40; el.height = 40;
  } else if (type === 'camera'){
    el.color = '#1c1917';
    // Camera ID defaults to "A" but remains editable in the field.
    el.label = 'A';
    el.width = 52; el.height = 52;
    el.fov = 60;

    // Shot # auto-increments per camera added (track targets are not cameras, so they don't affect this).
    el.shotNumber = String(getNextShotNumber());
    el.shotType = '';
    el.lens = '35mm';
    el.nickname = '';
    el.techNotes = '';
    el.productionNotes = '';
    el.sceneNumber = '';
    // Setup defaults to 1
    el.setupNumber = String(getNextSetupNumber());
    el.cameraSupport = 'Tripod';
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

  if (overrides && typeof overrides === 'object'){
    Object.assign(el, overrides);
  }

  // Default label anchor offsets (draggable label)
  if (type !== 'trackTarget' && !el.isTrackTarget){
    if (typeof el.labelDx !== 'number') el.labelDx = 0;
    if (typeof el.labelDy !== 'number'){
      const d = getDefaultLabelOffset(el);
      el.labelDy = d.dy;
    }
  }

  state.elements.push(el);
  setSelected(el.id);
  saveToStorage();
}

function deleteSelected(){
  if (!state.selectedId) return;
  pushHistory();

  const sel = getSelected();

  // If deleting a character, also delete its track target (if any)
  if (sel && sel.type === 'character' && sel.trackToId){
    const tid = sel.trackToId;
    state.elements = state.elements.filter(e => e.id !== tid);
  }

  // If deleting a character track target, unlink its parent character (keep parent)
  if (sel && sel.isTrackTarget && sel.parentId){
    const parent = state.elements.find(e => e.id === sel.parentId);
    if (parent && parent.type === 'character' && parent.trackToId === sel.id){
      parent.trackToId = null;
    }
  }

  // If deleting a camera, also delete its track target (if any)
  if (sel && sel.type === 'camera' && sel.trackToId){
    const tid = sel.trackToId;
    state.elements = state.elements.filter(e => e.id !== tid);
  }

  // If deleting a track target, unlink its parent camera
  if (sel && sel.type === 'trackTarget' && sel.parentId){
    const parent = state.elements.find(e => e.id === sel.parentId);
    if (parent && parent.type === 'camera' && parent.trackToId === sel.id){
      parent.trackToId = null;
    }
  }

  state.elements = state.elements.filter(e => e.id !== state.selectedId);
  state.selectedId = null;
  syncPropsUI();
  syncButtons();
  saveToStorage();
  draw();
}

function clearAll(){
  if (state.elements.length === 0) return;
  pushHistory();
  state.elements = [];
  state.selectedId = null;
  syncPropsUI();
  syncButtons();
  saveToStorage();
  draw();
}

function openClearModal(){
  if (!modalClear) return;
  modalClear.setAttribute('aria-hidden','false');
}

function closeClearModal(){
  if (!modalClear) return;
  modalClear.setAttribute('aria-hidden','true');
}

function onDeletePressed(){
  if (state.selectedId){
    deleteSelected();
    return;
  }
  if (state.elements.length === 0) return;
  openClearModal();
}

// Modal wiring
if (modalClear){
  closeClearModal();
  modalClear.addEventListener('click', (e)=>{
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute('data-close') === '1') closeClearModal();
  });
}
if (modalClearNo) modalClearNo.addEventListener('click', closeClearModal);
if (modalClearYes) modalClearYes.addEventListener('click', ()=>{
  closeClearModal();
  clearAll();
});
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape') closeClearModal();
});

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
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
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


function drawTrackArrows(){
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.lineWidth = 3 * dpr;
  ctx.strokeStyle = 'rgba(17,17,17,0.55)';
  ctx.fillStyle = 'rgba(17,17,17,0.55)';

  for (const src of state.elements){
    if ((src.type !== 'camera' && src.type !== 'character') || !src.trackToId) continue;
    const target = state.elements.find(e => e.id === src.trackToId);
    if (!target) continue;

    const a = worldToScreen(src.x, src.y);
    const b = worldToScreen(target.x, target.y);

    const ax = a.x * dpr, ay = a.y * dpr;
    const bx = b.x * dpr, by = b.y * dpr;

    const mode = src.trackMode || 'to';

    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    if (mode === 'circle'){
      const cx = (ax + bx) / 2;
      const cy = (ay + by) / 2;
      const r = Math.max(len / 2, 1);
      const angleA = Math.atan2(ay - cy, ax - cx);
      const angleB = Math.atan2(by - cy, bx - cx);
      const gapPx = Math.min(24 * dpr, r * 0.32);
      const gapAngle = Math.min(0.5, gapPx / r);

      ctx.beginPath();
      ctx.arc(cx, cy, r, angleA + gapAngle, angleB - gapAngle, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r, angleB + gapAngle, angleA - gapAngle, false);
      ctx.stroke();
      continue;
    }

    // Line + arrowheads (with gaps from both camera icons)
    const headLen = 12 * dpr;
    const headAng = Math.PI / 7;

    const iconGap = 24 * dpr;

    const needsHeadAtEnd = (mode === 'to' || mode === 'between');
    const needsHeadAtStart = (mode === 'from' || mode === 'between');

    const gapStart = iconGap + (needsHeadAtStart ? headLen : 0);
    const gapEnd   = iconGap + (needsHeadAtEnd   ? headLen : 0);

    const sx = ax + ux * gapStart;
    const sy = ay + uy * gapStart;
    const ex = bx - ux * gapEnd;
    const ey = by - uy * gapEnd;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    if (needsHeadAtEnd){
      const angleEnd = Math.atan2(ey - sy, ex - sx);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angleEnd - headAng), ey - headLen * Math.sin(angleEnd - headAng));
      ctx.lineTo(ex - headLen * Math.cos(angleEnd + headAng), ey - headLen * Math.sin(angleEnd + headAng));
      ctx.closePath();
      ctx.fill();
    }

    if (needsHeadAtStart){
      const angleStart = Math.atan2(sy - ey, sx - ex);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - headLen * Math.cos(angleStart - headAng), sy - headLen * Math.sin(angleStart - headAng));
      ctx.lineTo(sx - headLen * Math.cos(angleStart + headAng), sy - headLen * Math.sin(angleStart + headAng));
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}


const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

function setZoomAtScreenPoint(nextScale, sx, sy){
  const before = screenToWorld(sx, sy);
  view.scale = clamp(nextScale, ZOOM_STEPS[0], ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  const after = screenToWorld(sx, sy);
  view.offsetX += (after.x - before.x) * view.scale;
  view.offsetY += (after.y - before.y) * view.scale;
  saveToStorage();
  draw();
}

function zoomStep(direction){
  const current = view.scale;
  let idx = 0;
  let best = Infinity;

  for (let i = 0; i < ZOOM_STEPS.length; i++){
    const d = Math.abs(ZOOM_STEPS[i] - current);
    if (d < best){
      best = d;
      idx = i;
    }
  }

  if (direction > 0){
    if (ZOOM_STEPS[idx] <= current + 1e-9 && idx < ZOOM_STEPS.length - 1) idx += 1;
  } else {
    if (ZOOM_STEPS[idx] >= current - 1e-9 && idx > 0) idx -= 1;
  }

  const sx = canvas.clientWidth / 2;
  const sy = canvas.clientHeight / 2;
  setZoomAtScreenPoint(ZOOM_STEPS[idx], sx, sy);
}

function draw(){
  resizeCanvasToDisplaySize();
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width * dpr;
  const h = rect.height * dpr;

  ctx.clearRect(0,0,w,h);

  // camera movement arrows
  drawTrackArrows();

  // world->screen handled manually per element for easier hit tests
  for (const el of state.elements){
    drawElement(el);
  }

  const sel = getSelected();
  if (sel) {
    drawRotationGizmo(sel);
    if (sel.type === 'wall') drawWallResizeGizmo(sel);
  }

  hudZoom.textContent = `${Math.round(view.scale*100)}%`;
}

function drawElement(el){
  // Track targets (camera trackTarget or camera element with isTrackTarget) inherit color from their parent camera (live)
  let inheritedColor = null;
  if (el.type === 'trackTarget' || el.isTrackTarget){
    const parent = state.elements.find(e => e.id === (el.parentId || '')) ||
                   state.elements.find(e => (e.type === 'camera') && e.trackToId === el.id);
    if (parent && (parent.type === 'camera' || parent.type === 'character')) inheritedColor = parent.color || null;
  }

  const dpr = window.devicePixelRatio || 1;
  const p = worldToScreen(el.x, el.y);
  const w = (el.width || 60) * el.scaleX * view.scale;
  const h = (el.height || 60) * el.scaleY * view.scale;

  ctx.save();
  ctx.translate(p.x * dpr, p.y * dpr);
  ctx.rotate(rad(el.rotation || 0));
  // Elegant selection indicator: soft drop shadow + subtle glow
    if (el.id === state.selectedId){
      // soft elevation shadow
      ctx.shadowColor = 'rgba(0,0,0,0.30)';
      ctx.shadowBlur = 28 * dpr;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10 * dpr;

      // subtle blue glow overlay
      ctx.shadowColor = 'rgba(59,130,246,0.45)';
      ctx.shadowBlur = 18 * dpr;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
ctx.fillStyle = (inheritedColor || el.color) || '#999';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2 * dpr;

  const drawAsType = (el.type === 'trackTarget') ? (el.trackFor || 'camera') : el.type;

  if (drawAsType === 'character'){
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
  else if (drawAsType === 'camera'){
    const size = (Math.max(el.width||52, el.height||52)) * el.scaleX * view.scale * dpr;
    const s = size/2;

    // Rounded square body + equilateral triangle "hood" (matches requested shape)
    ctx.fillStyle = (inheritedColor || el.color) || '#22c55e';
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2 * dpr;

    const body = s * 1.05;          // square side length
    const r = Math.max(4*dpr, body * 0.18); // corner radius
    const x0 = -body/2;
    const y0 = -body/2;

    // Square
    ctx.beginPath();
    ctx.roundRect(x0, y0, body, body, r);
    ctx.fill();
    ctx.stroke();

    // Equilateral triangle, one vertex touches midpoint of left edge of the square
    // Vertex on square edge:
    const vx = x0;          // left edge
    const vy = 0;           // midpoint of left edge (square centered at 0,0)

    // Choose triangle side length relative to body
    const side = body * 0.75;
    const height = side * Math.sqrt(3) / 2;

    // Orient triangle pointing left: tip at (vx,vy), base to the left
    const bx = vx - height; // base center x
    const by = vy;

    // Base vertices (vertical)
    const v2x = bx;
    const v2y = by - side/2;
    const v3x = bx;
    const v3y = by + side/2;

    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(v2x, v2y);
    ctx.lineTo(v3x, v3y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  else if (el.type === 'wall'){
    const ww = w * dpr;
    const hh = h * dpr;
    ctx.fillStyle = (inheritedColor || el.color) || '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(-ww/2, -hh/2, ww, hh, 8*dpr);
    ctx.fill();
    ctx.stroke();
  }
  else if (el.type === 'furniture'){
    const ww = w * dpr;
    const hh = h * dpr;
    ctx.fillStyle = (inheritedColor || el.color) || '#10b981';
    ctx.beginPath();
    ctx.roundRect(-ww/2, -hh/2, ww, hh, 12*dpr);
    ctx.fill();
    ctx.stroke();

    // inner detail
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 2 * dpr;
    
  }
  else if (el.type === 'label'){
    // text label (draw rounded rect + text)
    const ww = w * dpr;
    const hh = h * dpr;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.roundRect(-ww/2, -hh/2, ww, hh, 10*dpr);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = (inheritedColor || el.color) || '#e5e7eb';
    ctx.font = `${Math.max(12, hh*0.45)}px ui-sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((el.label || 'Label').slice(0, 50), 0, 0, ww*0.95);
  }

  ctx.restore();
  ctx.restore();

  // Draggable label (anchored to element)
  if (el.type !== 'label'){
    const text = getElementLabelText(el);
    if (text){
      const dx = (typeof el.labelDx === 'number') ? el.labelDx : 0;
      const dy = (typeof el.labelDy === 'number') ? el.labelDy : getDefaultLabelOffset(el).dy;
      const lp = worldToScreen(el.x + dx, el.y + dy);

      ctx.save();
      ctx.fillStyle = '#000000';
      const fontPx = Math.max(12, 12 * view.scale);
      ctx.font = `${fontPx * dpr}px ui-sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(text.slice(0, 50), lp.x * dpr, lp.y * dpr, 320 * dpr);
      ctx.restore();
    }
  }
}



function drawSelection(el){
  const dpr = window.devicePixelRatio || 1;
  const p = worldToScreen(el.x, el.y);
  const w = (el.width || 60) * el.scaleX * view.scale;
  const h = (el.height || 60) * el.scaleY * view.scale;

  ctx.save();
  ctx.translate(p.x * dpr, p.y * dpr);
  ctx.rotate(rad(el.rotation || 0));
  ctx.strokeStyle = 'rgba(59,130,246,0.95)';
  ctx.lineWidth = 2 * dpr;
  

  // selection bounds (approx)
  const ww = w * dpr;
  const hh = h * dpr;
  

  // center dot
  
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(0,0,3*dpr,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}



function snapWallRotation(angleDeg){
  const SNAP_STEP = 45;
  const SNAP_THRESHOLD = 10;
  const snapped = Math.round(angleDeg / SNAP_STEP) * SNAP_STEP;
  return Math.abs(angleDeg - snapped) <= SNAP_THRESHOLD ? snapped : angleDeg;
}


function wallAxis(el){
  const a = rad(el.rotation || 0);
  return { x: Math.cos(a), y: Math.sin(a) };
}

function wallResizeHandleWorld(el){
  const axis = wallAxis(el);
  const half = ((el.width || 180) * (el.scaleX || 1)) / 2;
  return {
    x: el.x + axis.x * half,
    y: el.y + axis.y * half
  };
}

function wallAnchorWorld(el){
  const axis = wallAxis(el);
  const half = ((el.width || 180) * (el.scaleX || 1)) / 2;
  return {
    x: el.x - axis.x * half,
    y: el.y - axis.y * half
  };
}

function hitWallResizeHandle(wx, wy, el){
  if (!el || el.type !== 'wall') return false;
  const h = wallResizeHandleWorld(el);
  const dx = wx - h.x;
  const dy = wy - h.y;
  const r = 16 / view.scale;
  return (dx*dx + dy*dy) <= r*r;
}

function drawWallResizeGizmo(el){
  if (!el || el.type !== 'wall') return;
  const dpr = window.devicePixelRatio || 1;
  const anchor = worldToScreen(el.x, el.y);
  const hW = wallResizeHandleWorld(el);
  const handle = worldToScreen(hW.x, hW.y);

  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);

  const cx = anchor.x * dpr;
  const cy = anchor.y * dpr;
  const hx = handle.x * dpr;
  const hy = handle.y * dpr;

  ctx.strokeStyle = 'rgba(245,158,11,0.55)';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  ctx.shadowColor = 'rgba(245,158,11,0.35)';
  ctx.shadowBlur = 12 * dpr;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(hx, hy, 7 * dpr, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.arc(hx, hy, 7 * dpr, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function rotationHandleWorld(el){
  // distance from center based on element size
  const base = Math.max(el.width||60, el.height||60) * Math.max(el.scaleX||1, el.scaleY||1);
  const dist = base * 0.75 + 24; // world units
  const a = rad(el.rotation || 0);
  return { x: el.x + Math.cos(a)*dist, y: el.y + Math.sin(a)*dist, dist };
}

function hitRotationHandle(wx, wy, el){
  const h = rotationHandleWorld(el);
  const dx = wx - h.x;
  const dy = wy - h.y;
  const r = 18 / view.scale; // keep consistent across zoom
  return (dx*dx + dy*dy) <= r*r;
}

function drawRotationGizmo(el){
  if (!el) return;
  const dpr = window.devicePixelRatio || 1;

  const c = worldToScreen(el.x, el.y);
  const hW = rotationHandleWorld(el);
  const h = worldToScreen(hW.x, hW.y);

  ctx.save();

  // draw in screen space, fixed sizes
  ctx.setTransform(1,0,0,1,0,0);

  const cx = c.x * dpr;
  const cy = c.y * dpr;
  const hx = h.x * dpr;
  const hy = h.y * dpr;

  // connector line
  ctx.strokeStyle = 'rgba(59,130,246,0.55)';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // outer glow ring
  ctx.shadowColor = 'rgba(59,130,246,0.35)';
  ctx.shadowBlur = 14 * dpr;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // handle dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx, hy, 7 * dpr, 0, Math.PI*2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(59,130,246,0.95)';
  ctx.lineWidth = 3 * dpr;
  ctx.beginPath();
  ctx.arc(hx, hy, 7 * dpr, 0, Math.PI*2);
  ctx.stroke();

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


function labelBoundsScreen(el){
  if (!el) return null;
  if (el.type === 'trackTarget') return null;
  const text = getElementLabelText(el);
  if (!text) return null;

  const dx = (typeof el.labelDx === 'number') ? el.labelDx : 0;
  const dy = (typeof el.labelDy === 'number') ? el.labelDy : getDefaultLabelOffset(el).dy;
  const lp = worldToScreen(el.x + dx, el.y + dy);

  const dpr = window.devicePixelRatio || 1;
  const fontPx = Math.max(12, 12 * view.scale);

  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.font = `${fontPx * dpr}px ui-sans-serif`;
  const wPx = ctx.measureText(text.slice(0, 50)).width / dpr;
  ctx.restore();

  const pad = 6;
  const hPx = fontPx;
  return {
    x0: lp.x - wPx/2 - pad,
    x1: lp.x + wPx/2 + pad,
    y0: lp.y - pad,
    y1: lp.y + hPx + pad,
  };
}

function hitTestLabel(screenX, screenY){
  for (let i = state.elements.length - 1; i >= 0; i--){
    const el = state.elements[i];
    const b = labelBoundsScreen(el);
    if (!b) continue;
    if (screenX >= b.x0 && screenX <= b.x1 && screenY >= b.y0 && screenY <= b.y1){
      return el;
    }
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
  mode: 'move', // move|pan|rotate|resize-wall
  startWorld: {x:0,y:0},
  startEl: null,
  startOffset: {x:0,y:0},
  startAngle: 0,
};

canvas.addEventListener('mousedown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const w = screenToWorld(sx, sy);

  if (e.button !== 0) return;
  // label drag (draggable, anchored label)
  const hitLbl = hitTestLabel(sx, sy);
  if (hitLbl){
    setSelected(hitLbl.id);
    drag.active = true;
    drag.mode = 'label';
    drag.startEl = deepClone(hitLbl);
    drag.startWorld = w;
    pushHistory();
    canvas.style.cursor = 'grabbing';
    return;
  }

// If clicking the rotation handle of the currently selected element, start rotating immediately.
const currentSel = getSelected();
if (currentSel && currentSel.type === 'wall' && hitWallResizeHandle(w.x, w.y, currentSel)){
  drag.active = true;
  drag.mode = 'resize-wall';
  drag.startEl = deepClone(currentSel);
  drag.startWorld = w;
  pushHistory();
  canvas.style.cursor = 'grabbing';
  return;
}
if (currentSel && hitRotationHandle(w.x, w.y, currentSel)){
  drag.active = true;
  drag.mode = 'rotate';
  drag.startEl = deepClone(currentSel);
  drag.startWorld = w;
  drag.startAngle = Math.atan2(w.y - currentSel.y, w.x - currentSel.x);
  pushHistory();
  canvas.style.cursor = 'grabbing';
  return;
}


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

if (hit.type === 'wall' && hitWallResizeHandle(w.x, w.y, hit)){
  drag.active = true;
  drag.mode = 'resize-wall';
  drag.startEl = deepClone(hit);
  drag.startWorld = w;
  pushHistory();
  canvas.style.cursor = 'grabbing';
  return;
}

// rotation gizmo: click/drag the handle to rotate
if (state.selectedId && hitRotationHandle(w.x, w.y, hit)){
  drag.active = true;
  drag.mode = 'rotate';
  drag.startEl = deepClone(hit);
  drag.startWorld = w; // world point at mouse down
  drag.startAngle = Math.atan2(w.y - hit.y, w.x - hit.x);
  pushHistory();
  canvas.style.cursor = 'grabbing';
  return;
}

drag.active = true;
drag.mode = 'move';

  drag.startWorld = w;
  drag.startEl = deepClone(hit);
  pushHistory();
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  lastCanvasPointer.active = true;
  lastCanvasPointer.sx = sx;
  lastCanvasPointer.sy = sy;

  // Hover cursor hints
  if (!drag.active){
    const w = screenToWorld(sx, sy);

    const sel = getSelected();
    if (sel && sel.type === 'wall' && hitWallResizeHandle(w.x, w.y, sel)){
      canvas.style.cursor = 'ew-resize';
    } else if (sel && hitRotationHandle(w.x, w.y, sel)){
      canvas.style.cursor = 'grab';
    } else if (hitTestLabel(sx, sy)){
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }
    return;
  }

  // Pan uses screen space deltas
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

  if (drag.mode === 'label'){
    // Draggable anchored label: store offset in world units
    sel.labelDx = w.x - sel.x;
    sel.labelDy = w.y - sel.y;

    const idx = state.elements.findIndex(x => x.id === sel.id);
    if (idx >= 0) state.elements[idx] = sel;

    saveToStorage();
    syncPropsUI(true);
    draw();
    return;
  }

  if (drag.mode === 'rotate'){
    const a0 = drag.startAngle;
    const a1 = Math.atan2(w.y - drag.startEl.y, w.x - drag.startEl.x);
    const delta = a1 - a0;
    let next = (drag.startEl.rotation || 0) + deg(delta);

    // normalize to [-180, 180]
    next = ((next + 180) % 360) - 180;
    if (sel.type === 'wall'){
      next = snapWallRotation(next);
    }

    sel.rotation = next;

    const idx = state.elements.findIndex(x => x.id === sel.id);
    if (idx >= 0) state.elements[idx] = sel;

    saveToStorage();
    syncPropsUI(true);
    draw();
    return;
  }

  if (drag.mode === 'resize-wall'){
    const axis = wallAxis(drag.startEl);
    const anchor = wallAnchorWorld(drag.startEl);
    const px = w.x - anchor.x;
    const py = w.y - anchor.y;
    const projected = px * axis.x + py * axis.y;
    const newWidth = Math.max(40, projected);

    sel.width = newWidth;
    sel.x = anchor.x + axis.x * (newWidth / 2);
    sel.y = anchor.y + axis.y * (newWidth / 2);

    const idx = state.elements.findIndex(x => x.id === sel.id);
    if (idx >= 0) state.elements[idx] = sel;

    saveToStorage();
    syncPropsUI(true);
    draw();
    return;
  }

  // Default: move element
  const dx = w.x - drag.startWorld.x;
  const dy = w.y - drag.startWorld.y;
  sel.x = drag.startEl.x + dx;
  sel.y = drag.startEl.y + dy;

  const idx = state.elements.findIndex(x => x.id === sel.id);
  if (idx >= 0) state.elements[idx] = sel;

  saveToStorage();
  syncPropsUI(true);
  draw();
});


window.addEventListener('mousemove', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const within = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!within){
    // keep last canvas pointer
    return;
  }
  lastCanvasPointer.active = true;
  lastCanvasPointer.sx = e.clientX - rect.left;
  lastCanvasPointer.sy = e.clientY - rect.top;
});

canvas.addEventListener('mouseleave', ()=>{
  lastCanvasPointer.active = false;
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

  // Don't hijack Delete/Backspace while typing in fields
  const t = e.target;
  const tag = (t && t.tagName) ? t.tagName.toLowerCase() : '';
  const isTyping = !!(t && (t.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));

  if (mod && !e.shiftKey && e.key.toLowerCase() === 'z'){
    e.preventDefault();
    undo();
  } else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))){
    e.preventDefault();
    redoDo();
  } else if (!isTyping && !mod && e.key.toLowerCase() === 'c'){
    e.preventDefault();
    addElement('camera', getSpawnOverridesFromCursor());
  } else if (!isTyping && !mod && e.key.toLowerCase() === 'p'){
    e.preventDefault();
    addElement('character', getSpawnOverridesFromCursor());
  } else if (!isTyping && !mod && e.key.toLowerCase() === 't'){
    const sel = getSelected();
    if (sel && (sel.type === 'camera' || sel.type === 'character')){
      e.preventDefault();
      {
      let pos = getTrackTargetOverridesFromCursor();
      if (!pos){
        const c = getCanvasCenterWorld();
        pos = {x:c.x, y:c.y};
      }
      createTrackTargetFor(sel, pos);
    }
    }
  } else if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace')){
    if (state.selectedId){
      e.preventDefault();
      deleteSelected();
    }
  }
});
window.addEventListener('keyup', (e)=>{
  if (e.code === 'Space') keys.Space = false;
});


if (btnZoomOut){
  btnZoomOut.onclick = (e)=>{
    e.preventDefault();
    e.stopPropagation();
    zoomStep(-1);
  };
}
if (btnZoomIn){
  btnZoomIn.onclick = (e)=>{
    e.preventDefault();
    e.stopPropagation();
    zoomStep(1);
  };
}

// ---------- UI wiring ----------
document.querySelectorAll('[data-add]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    addElement(btn.getAttribute('data-add'));
  });
});


// Scenes (hover menu + click to create new scene)
if (btnScene){
  btnScene.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    createNewScene();
    renderSceneMenu();
  });
}

function isWithin(el, target){
  if (!el || !target) return false;
  return el === target || el.contains(target);
}

function setSceneMenuOpen(open){
  if (!addSceneWrap || !sceneMenu) return;
  addSceneWrap.classList.toggle('open', !!open);
  sceneMenu.classList.toggle('open', !!open);
}

// Keep menu open while hovering button OR menu, like character presets
if (addSceneWrap){
  addSceneWrap.addEventListener('mouseenter', ()=>{ renderSceneMenu(); setSceneMenuOpen(true); });
  addSceneWrap.addEventListener('mouseleave', (e)=>{
    // If leaving to an element still inside wrap, ignore
    const rel = e.relatedTarget;
    if (isWithin(addSceneWrap, rel)) return;
    setSceneMenuOpen(false);
  });
}

// Close menu on click outside
document.addEventListener('click', (e)=>{
  if (!addSceneWrap) return;
  if (!isWithin(addSceneWrap, e.target)){
    setSceneMenuOpen(false);
  }
});

if (pScene){
  pScene.addEventListener('input', ()=>{
    updateSceneNumber(pScene.value);
  });
}
if (scenePalette){
  scenePalette.querySelectorAll('.swatch').forEach(btn=>{
    btn.style.backgroundColor = btn.getAttribute('data-color') || 'transparent';
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      updateSceneColor(btn.getAttribute('data-color') || '');
    });
  });
}


if (btnDeleteScene){
  btnDeleteScene.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    openModal(modalDeleteScene);
  });
}
if (btnConfirmDeleteScene){
  btnConfirmDeleteScene.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeModal(modalDeleteScene);
    deleteActiveScene();
  });
}

// Character presets (hover menu)
document.querySelectorAll('[data-character-preset]').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const name = btn.getAttribute('data-character-preset') || 'Character';
    const color = btn.getAttribute('data-color') || '#3b82f6';
    addElement('character', { label: name, color });
    draw();
  });
});

btnDelete.addEventListener('click', onDeletePressed);

btnUndo.addEventListener('click', undo);
btnRedo.addEventListener('click', redoDo);

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
    state.elements = normalizeElements(parsed.elements);
    ensureLabelOffsets();
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

btnExportCsv.addEventListener('click', ()=>{ exportToExcel(); });

// Track direction (to / from / between)


if (pTrackMode)if (pTrackMode){
  pTrackMode.addEventListener('change', () => {
  const el = getSelected();
  if (!el) return;

  // If selecting a track target (camera trackTarget or character isTrackTarget), update the parent
  if (el.type === 'trackTarget' || el.isTrackTarget){
    const parent = state.elements.find(e => e.id === (el.parentId || null)) ||
                   state.elements.find(e => (e.type === 'camera' || e.type === 'character') && e.trackToId === el.id);
    if (!parent) return;
    parent.trackMode = pTrackMode.value;
    saveToStorage();
    draw();
    return;
  }

  if (el.type !== 'camera' && el.type !== 'character') return;
  el.trackMode = pTrackMode.value;
  saveToStorage();
  draw();
  });
}

// Track To...  (camera movement target)
if (btnTrackTo){
  btnTrackTo.addEventListener('click', () => {
  const el = getSelected();
  if (!el) return;
  if (el.type !== 'camera' && el.type !== 'character') return;
  createTrackTargetFor(el);
});
}

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

function sceneNameForIndex(i){
  return `Scene ${i+1}`;
}

function ensureDefaultScene(){
  if (scenes.length) return;
  const s = {
    id: uid('scene'),
    name: sceneNameForIndex(0),
    color: nextSceneColor(),
    elements: [],
    view: { scale: 1, offsetX: 0, offsetY: 0 }
  };
  scenes = [s];
  activeSceneId = s.id;
}

function getActiveScene(){
  return scenes.find(s => s.id === activeSceneId) || scenes[0] || null;
}

function syncSceneUI(){
  const s = getActiveScene();
  if (!s) return;
  if (pScene) pScene.value = s.sceneNumber || '';
  if (scenePalette){
    scenePalette.querySelectorAll('.swatch').forEach(btn=>{
      const c = btn.getAttribute('data-color') || '';
      btn.classList.toggle('selected', (s.color || '') === c);
    });
  }
}

function updateSceneNumber(val){
  const s = getActiveScene();
  if (!s) return;
  s.sceneNumber = val;

  // keep all cameras in this scene synced to the scene number
  state.elements.forEach(e=>{
    if (e.type === 'camera'){
      e.sceneNumber = val;
    }
  });

  renderSceneMenu();
  syncPropsUI(true);
  saveToStorage();
}

function updateSceneColor(color){
  const s = getActiveScene();
  if (!s) return;
  s.color = color;
  renderSceneMenu();
  syncSceneUI();
  saveToStorage();
  draw();
}

function saveActiveSceneSnapshot(){
  const s = getActiveScene();
  if (!s) return;
  // deep clone elements to avoid cross-scene mutation
  s.elements = JSON.parse(JSON.stringify(state.elements));
  s.view = { scale: view.scale, offsetX: view.offsetX, offsetY: view.offsetY };
}

function loadSceneIntoState(sceneId){
  const target = scenes.find(s => s.id === sceneId);
  if (!target) return;
  // save current scene first
  saveActiveSceneSnapshot();

  activeSceneId = target.id;
  renderSceneMenu();
  state.selectedId = null;
  state.elements = JSON.parse(JSON.stringify(target.elements || []));

  // sync camera scene numbers to this scene
  const sceneNum = target.sceneNumber || '';
  state.elements.forEach(e=>{ if (e.type === 'camera') e.sceneNumber = sceneNum; });

  const v = target.view || { scale: 1, offsetX: 0, offsetY: 0 };
  view.scale = v.scale ?? 1;
  view.offsetX = v.offsetX ?? 0;
  view.offsetY = v.offsetY ?? 0;

  // reset undo/redo per scene switch
  history = [];
  redo = [];

  saveToStorage();
  syncPropsUI();
  syncButtons();
  draw();
}

function createNewScene(){
  saveActiveSceneSnapshot();

  const s = {
    id: uid('scene'),
    name: sceneNameForIndex(scenes.length),
    sceneNumber: '',
    color: nextSceneColor(),
    elements: [],
    view: { scale: 1, offsetX: 0, offsetY: 0 }
  };
  scenes.push(s);
  loadSceneIntoState(s.id);
}

function deleteActiveScene(){
  if (scenes.length <= 1) return; // keep at least one scene
  const idx = scenes.findIndex(s => s.id === activeSceneId);
  if (idx === -1) return;
  // remove active
  scenes.splice(idx, 1);
  // pick next scene
  const next = scenes[Math.min(idx, scenes.length-1)];
  activeSceneId = next.id;
  // load next into state
  state.selectedId = null;
  state.elements = JSON.parse(JSON.stringify(next.elements || []));
  const v = next.view || { scale: 1, offsetX: 0, offsetY: 0 };
  view.scale = v.scale ?? 1;
  view.offsetX = v.offsetX ?? 0;
  view.offsetY = v.offsetY ?? 0;
  history = [];
  redo = [];
  renderSceneMenu();
  saveToStorage();
  syncPropsUI();
  syncButtons();
  draw();
}

function renderSceneMenu(){
  if (!sceneMenu) return;
  sceneMenu.innerHTML = '';
  scenes.forEach((s, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-item' + (s.id === activeSceneId ? ' active' : '');
    btn.dataset.sceneId = s.id;
    btn.innerHTML = `<span class="dot" style="--dot:${s.color || '#6b7280'}"></span>${(s.sceneNumber && String(s.sceneNumber).trim()) ? ('Scene ' + String(s.sceneNumber).trim()) : (s.name || sceneNameForIndex(idx))}`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      loadSceneIntoState(s.id);
      // keep menu open only while hovering
    });
    sceneMenu.appendChild(btn);
  });
}

function syncButtons(){
  btnUndo.disabled = history.length === 0;
  btnRedo.disabled = redo.length === 0;
  btnDelete.disabled = state.selectedId ? false : (state.elements.length === 0);
}
function syncPropsUI(skipFocusPreserve=false){
  const el = getSelected();

  // Scene properties when nothing selected
  if (!el){
    propsForm.classList.add('hidden');
    propsEmpty.classList.add('hidden');
    if (sceneForm) sceneForm.classList.remove('hidden');
    syncSceneUI();
    return;
  }

  // element selected
  if (sceneForm) sceneForm.classList.add('hidden');

  propsEmpty.classList.add('hidden');

  // Track target: move/rotate only (no properties) - but allow track direction toggle
  if (el.type === 'trackTarget'){
    propsEmpty.classList.add('hidden');
    propsForm.classList.remove('hidden');
    cameraFields.classList.remove('hidden');

    // Hide all rows by default, then show only track direction
    const allRows = propsForm.querySelectorAll('.row, .grid2, #camera-fields');
    allRows.forEach(r=>r.classList.add('hidden'));

    // Hide everything in cameraFields, then enable just the camera color row
    const camFieldChildren = cameraFields.querySelectorAll('.row, .grid2');
    camFieldChildren.forEach(r=>r.classList.add('hidden'));
    if (rowCameraColor) rowCameraColor.classList.remove('hidden');

    if (rowTrackTo) rowTrackTo.classList.add('hidden');
    if (rowTrackMode) rowTrackMode.classList.remove('hidden');
    if (rowCameraColor) rowCameraColor.classList.remove('hidden');

    const owner = getColorOwner(el);
    syncPaletteSelection(owner?.color);

    const parent = state.elements.find(e => (e.type === 'camera' || e.type === 'character') && e.trackToId === el.id);
    if (pTrackMode) pTrackMode.value = (parent?.trackMode || 'to');

    return;
  }

  propsForm.classList.remove('hidden');

  const isCamera = el.type === 'camera';
  const isCharacter = el.type === 'character';
  const isWall = el.type === 'wall';

  const rowCharName = document.getElementById('row-character-name');
  const rowCamIdShot = document.getElementById('row-camera-id-shot');
  const rowShotTypeLens = document.getElementById('row-shottype-lens');
  const rowSceneSetup = document.getElementById('row-scene-setup');

  // Default: show everything, then specialize
  const allRows = propsForm.querySelectorAll('.row, .grid2, #camera-fields');
  allRows.forEach(r=>r.classList.remove('hidden'));

  // Color (palette only)
  const owner = getColorOwner(el);
  if (rowCameraColor){
    const ownerIsColorable = owner && (owner.type === 'camera' || owner.type === 'character');
    if (ownerIsColorable){
      rowCameraColor.classList.remove('hidden');
      syncPaletteSelection(owner.color);
    } else {
      rowCameraColor.classList.add('hidden');
      syncPaletteSelection(null);
    }
  }

  // Shot # shown only for camera
  const rowShot = document.getElementById('row-shotNumber');
  if (rowShot){
    if (isCamera) rowShot.classList.remove('hidden');
    else rowShot.classList.add('hidden');
  }

  if (isWall){
    if (rowCamIdShot) rowCamIdShot.classList.add('hidden');
    if (rowShotTypeLens) rowShotTypeLens.classList.add('hidden');
    if (rowSceneSetup) rowSceneSetup.classList.add('hidden');
    cameraFields.classList.add('hidden');
    if (rowCharName) rowCharName.classList.add('hidden');

    [P.id, P.type].forEach(input=>{
      const row = input?.closest('.row') || input?.closest('.grid2');
      if (row) row.classList.add('hidden');
    });
  }

  if (isCharacter){
    // Character panel: only Character Name, Rotation, Primary Color, Size
    if (rowCamIdShot) rowCamIdShot.classList.add('hidden');
    if (rowShotTypeLens) rowShotTypeLens.classList.add('hidden');
    if (rowSceneSetup) rowSceneSetup.classList.add('hidden');
    cameraFields.classList.add('hidden');
    if (rowCharName) rowCharName.classList.remove('hidden');

    [P.id, P.type, P.x, P.y, P.sx, P.sy].forEach(input=>{
      const row = input?.closest('.row') || input?.closest('.grid2');
      if(row) row.classList.add('hidden');
    });

    const xyGrid = P.x?.closest('.grid2');
    if (xyGrid) xyGrid.classList.add('hidden');

    if (P.characterName) P.characterName.value = el.label ?? '';
  }

  if (isCamera){
    // Camera panel: match screenshot
    if (rowCharName) rowCharName.classList.add('hidden');
    if (rowCamIdShot) rowCamIdShot.classList.remove('hidden');
    if (rowShotTypeLens) rowShotTypeLens.classList.remove('hidden');
    if (rowSceneSetup) rowSceneSetup.classList.remove('hidden');
    cameraFields.classList.remove('hidden');

    [P.id, P.type, P.x, P.y, P.sx, P.sy].forEach(input=>{
      const row = input?.closest('.row') || input?.closest('.grid2');
      if(row) row.classList.add('hidden');
    });

    const xyGrid = P.x?.closest('.grid2');
    if (xyGrid) xyGrid.classList.add('hidden');

    const camIdLabel = document.querySelector('#row-camera-id-shot .row label');
    if (camIdLabel) camIdLabel.textContent = 'Camera ID';
  }

  if (isCamera){
    if (P.label) P.label.value = el.label ?? '';

    cameraFields.classList.remove('hidden');
    P.shotNumber.value = el.shotNumber ?? '';
    P.shotType.value = el.shotType ?? '';
    P.lens.value = el.lens ?? '';
    P.nickname.value = el.nickname ?? '';
    P.techNotes.value = el.techNotes ?? '';
    P.productionNotes.value = el.productionNotes ?? '';
    const active = getActiveScene();
    const sceneNum = (active && active.sceneNumber) ? active.sceneNumber : '';
    P.sceneNumber.value = sceneNum;
    P.sceneNumber.readOnly = true;
    P.setupNumber.value = el.setupNumber ?? '';
    P.cameraSupport.value = el.cameraSupport ?? '';
  } else {
    cameraFields.classList.add('hidden');
    if (P.sceneNumber) P.sceneNumber.readOnly = false;
  }
}

function bindPropInput(elm, getter){
  if (!elm) return;

  const handler = ()=>{
    const sel = getSelected();
    if (!sel) return;
    const patch = getter(sel);
    updateElement(sel.id, patch);
  };

  // 'input' for text fields, 'change' for selects; attach both for robustness.
  elm.addEventListener('input', handler);
  elm.addEventListener('change', handler);
}

bindPropInput(P.label, ()=>({label: P.label.value}));
bindPropInput(P.characterName, ()=>({label: P.characterName.value}));
bindPropInput(P.x, ()=>({x: Number(P.x.value)}));
bindPropInput(P.y, ()=>({y: Number(P.y.value)}));
bindPropInput(P.sx, ()=>({scaleX: clamp(Number(P.sx.value), 0.1, 10)}));
bindPropInput(P.sy, ()=>({scaleY: clamp(Number(P.sy.value), 0.1, 10)}));

bindPropInput(P.shotNumber, ()=>({shotNumber: P.shotNumber.value}));
bindPropInput(P.shotType, ()=>({shotType: P.shotType.value}));
bindPropInput(P.lens, ()=>({lens: P.lens.value}));
bindPropInput(P.nickname, ()=>({nickname: P.nickname.value}));
bindPropInput(P.techNotes, ()=>({techNotes: P.techNotes.value}));
bindPropInput(P.productionNotes, ()=>({productionNotes: P.productionNotes.value}));
bindPropInput(P.sceneNumber, ()=>({sceneNumber: P.sceneNumber.value}));
bindPropInput(P.setupNumber, ()=>({setupNumber: P.setupNumber.value}));
bindPropInput(P.cameraSupport, ()=>({cameraSupport: P.cameraSupport.value}));


function syncPaletteSelection(color){
  if (!cameraPalette) return;
  cameraPalette.querySelectorAll('.swatch').forEach(s=>s.classList.remove('selected'));
  if (!color) return;
  const btn = cameraPalette.querySelector(`.swatch[data-color="${color.toLowerCase()}"], .swatch[data-color="${color}"]`);
  if (btn) btn.classList.add('selected');
}

if (cameraPalette){
  cameraPalette.querySelectorAll('.swatch').forEach(btn=>{
    const color = btn.getAttribute('data-color');
    btn.style.background = color;
    btn.addEventListener('click', ()=>{
      const sel = getSelected();
      if (!sel) return;
      const owner = getColorOwner(sel);
      if (!owner || (owner.type !== 'camera' && owner.type !== 'character')) return;
      updateElement(owner.id, {color});

      cameraPalette.querySelectorAll('.swatch').forEach(s=>s.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

// ---------- Init ----------
function init(){
  const saved = loadFromStorage();
  if (saved && Array.isArray(saved.scenes)){
    // scenes loaded in loadFromStorage
  } else if (saved && saved.scenes){
    // noop
  }
  ensureDefaultScene();

  const active = getActiveScene();
  state.elements = normalizeElements(deepClone(active.elements || []));
  ensureLabelOffsets();
  state.selectedId = null;
  history = [];
  redo = [];
  const v = active.view || { scale: 1, offsetX: 0, offsetY: 0 };
  view.scale = v.scale ?? 1;
  view.offsetX = v.offsetX ?? 0;
  view.offsetY = v.offsetY ?? 0;

  renderSceneMenu();
  syncPropsUI();
  syncButtons();
  draw();
}

window.addEventListener('resize', draw);
init();


function exportToExcel(){
  const cameras = state.elements.filter(el => el.type === 'camera' && !el.isTrackTarget);

  const headers = [
    "SCENE #",
    "SETUP #",
    "CAM ID",
    "SHOT #",
    "FRAME",
    "NICKNAME",
    "CAMERA SUPPORT",
    "LENS",
    "TECH NOTES",
    "PRODUCTION NOTES"
  ];

  const rows = [headers.map(csvEscape).join(",")];

  cameras.forEach(cam => {
    const row = [
      cam.sceneNumber || "",
      cam.setupNumber || "",
      cam.label ? `CAMERA ${cam.label.replace(/^CAMERA\s+/,"")}` : "",
      cam.shotNumber || "",
      cam.shotType || "", // FRAME = Shot Type
      cam.nickname || "",
      cam.cameraSupport || "",
      cam.lens || "",
      cam.techNotes || "",
      cam.productionNotes || ""
    ];
    rows.push(row.map(csvEscape).join(","));
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `shot-designer-shots-${new Date().toISOString().slice(0,10)}.csv`);
}

document.addEventListener('click', (e)=>{
  const close = e.target && e.target.getAttribute && e.target.getAttribute('data-close');
  if (close){
    const modal = e.target.closest('.sp-modal');
    closeModal(modal);
  }
});
