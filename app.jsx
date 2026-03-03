import React, { StrictMode, useState, useEffect, useCallback, useRef } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import {
  Stage, Layer, Transformer,
  Circle, Rect, Group, Text, Line, Path, Arrow
} from "https://esm.sh/react-konva@18.2.10?deps=react@18.2.0,react-dom@18.2.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

/**
 * Element types used in the scene.
 * @typedef {'character'|'camera'|'wall'|'furniture'|'label'} ElementType
 */

/**
 * @typedef {Object} SceneElement
 * @property {string} id
 * @property {ElementType} type
 * @property {number} x
 * @property {number} y
 * @property {number} rotation
 * @property {number} scaleX
 * @property {number} scaleY
 * @property {string} color
 * @property {string=} label
 * @property {number=} width
 * @property {number=} height
 * @property {number=} radius
 * @property {number=} fov
 * @property {string=} shotNumber
 * @property {string=} shotType
 * @property {string=} lens
 * @property {string=} nickname
 * @property {string=} techNotes
 * @property {string=} productionNotes
 * @property {string=} sceneNumber
 * @property {string=} setupNumber
 * @property {string=} cameraSupport
 * @property {{x:number,y:number,rotation:number}=} trackTo
 */

function CanvasElement({ element, isSelected, selectedId, onSelect, onChange }) {
  const handleDragEnd = (e) => {
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const handleVisualTransform = (e, isEnd = false) => {
    const node = e.target;
    const newRotation = node.rotation();
    // Reset node rotation to 0 because we apply it to the parent
    node.rotation(0);

    onChange({ rotation: element.rotation + newRotation }, !isEnd);
  };

  const renderShape = () => {
    const rad = (element.rotation * Math.PI) / 180;
    const labelOffset = 35;
    const labelX = labelOffset * Math.sin(rad);
    const labelY = labelOffset * Math.cos(rad);

    switch (element.type) {
      case "character":
        return (
          <Group
            x={element.x}
            y={element.y}
            rotation={element.rotation}
            scaleX={element.scaleX}
            scaleY={element.scaleY}
            draggable
            onClick={() => onSelect(element.id)}
            onTap={() => onSelect(element.id)}
            onDragEnd={handleDragEnd}
          >
            <Group
              id={element.id}
              onTransform={(e) => handleVisualTransform(e, false)}
              onTransformEnd={(e) => handleVisualTransform(e, true)}
            >
              <Circle
                radius={element.radius || 20}
                fill={element.color}
                stroke={isSelected ? "#3b82f6" : "#1c1917"}
                strokeWidth={isSelected ? 3 : 2}
              />
              <Line
                points={[0, 0, 0, -(element.radius || 20)]}
                stroke="#ffffff"
                strokeWidth={2}
                opacity={0.8}
                lineCap="round"
              />
            </Group>

            {element.label && (
              <Text
                text={element.label}
                fontSize={12}
                fontFamily="Inter"
                fill="#1c1917"
                align="center"
                width={120}
                height={16}
                x={labelX}
                y={labelY}
                offsetX={60}
                offsetY={8}
                rotation={-element.rotation}
              />
            )}
          </Group>
        );

      case "camera": {
        const t = element.trackTo;
        const dx = t ? t.x : 0;
        const dy = t ? t.y : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const arrowPadding = 22;
        const arrowEndX = dist > arrowPadding ? dx * (1 - arrowPadding / dist) : dx;
        const arrowEndY = dist > arrowPadding ? dy * (1 - arrowPadding / dist) : dy;

        const camRad = (element.rotation * Math.PI) / 180;
        const camLabelOffset = 45;
        const camLabelX = camLabelOffset * Math.sin(camRad);
        const camLabelY = camLabelOffset * Math.cos(camRad);

        return (
          <Group
            x={element.x}
            y={element.y}
            rotation={element.rotation}
            scaleX={element.scaleX}
            scaleY={element.scaleY}
            draggable
            onClick={() => onSelect(element.id)}
            onTap={() => onSelect(element.id)}
            onDragEnd={handleDragEnd}
          >
            {t && (
              <Group rotation={-element.rotation}>
                <Arrow
                  points={[0, 0, arrowEndX, arrowEndY]}
                  stroke={element.color}
                  strokeWidth={2}
                  fill={element.color}
                  pointerLength={10}
                  pointerWidth={10}
                  opacity={0.4}
                />

                <Group
                  id={`${element.id}-track`}
                  x={t.x}
                  y={t.y}
                  rotation={t.rotation}
                  draggable
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelect(`${element.id}-track`);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onSelect(`${element.id}-track`);
                  }}
                  onDragMove={(e) => {
                    if (e.target !== e.currentTarget) return;
                    e.cancelBubble = true;
                    onChange(
                      { trackTo: { ...t, x: e.target.x(), y: e.target.y() } },
                      true
                    );
                  }}
                  onDragEnd={(e) => {
                    if (e.target !== e.currentTarget) return;
                    e.cancelBubble = true;
                    onChange(
                      { trackTo: { ...t, x: e.target.x(), y: e.target.y() } },
                      false
                    );
                  }}
                  onTransform={(e) => {
                    const node = e.target;
                    onChange(
                      {
                        trackTo: { ...t, x: node.x(), y: node.y(), rotation: node.rotation() },
                      },
                      true
                    );
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    onChange(
                      {
                        trackTo: { ...t, x: node.x(), y: node.y(), rotation: node.rotation() },
                      },
                      false
                    );
                  }}
                >
                  <Path
                    data="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
                    fill={element.color}
                    stroke={
                      isSelected || selectedId === `${element.id}-track` ? "#3b82f6" : "#1c1917"
                    }
                    strokeWidth={
                      isSelected || selectedId === `${element.id}-track` ? 1 : 0.5
                    }
                    scaleX={1.6}
                    scaleY={1.6}
                    offsetX={12}
                    offsetY={12}
                    rotation={-90}
                    opacity={0.25}
                  />
                </Group>
              </Group>
            )}

            <Group
              id={element.id}
              onTransform={(e) => handleVisualTransform(e, false)}
              onTransformEnd={(e) => handleVisualTransform(e, true)}
            >
              <Path
                data="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
                fill={element.color}
                stroke={isSelected ? "#3b82f6" : "#1c1917"}
                strokeWidth={isSelected ? 1.5 : 0.5}
                scaleX={1.8}
                scaleY={1.8}
                offsetX={12}
                offsetY={12}
                rotation={-90}
              />
            </Group>

            {(element.label || element.shotType || element.shotNumber) && (
              <Text
                text={`${element.shotNumber ? element.shotNumber + " " : ""}${
                  element.label || ""
                }${
                  (element.label || element.shotNumber) && element.shotType ? " - " : ""
                }${element.shotType || ""}`}
                fontSize={12}
                fontFamily="Inter"
                fill="#1c1917"
                align="center"
                width={120}
                height={16}
                x={camLabelX}
                y={camLabelY}
                offsetX={60}
                offsetY={8}
                rotation={-element.rotation}
              />
            )}
          </Group>
        );
      }

      case "wall":
        return (
          <Group
            x={element.x}
            y={element.y}
            rotation={element.rotation}
            scaleX={element.scaleX}
            scaleY={element.scaleY}
            draggable
            onClick={() => onSelect(element.id)}
            onTap={() => onSelect(element.id)}
            onDragEnd={handleDragEnd}
          >
            <Rect
              id={element.id}
              width={element.width || 100}
              height={element.height || 10}
              x={0}
              y={0}
              fill={element.color}
              stroke={isSelected ? "#3b82f6" : "#1c1917"}
              strokeWidth={isSelected ? 3 : 1}
              onTransform={(e) => handleVisualTransform(e, false)}
              onTransformEnd={(e) => handleVisualTransform(e, true)}
            />
          </Group>
        );

      case "furniture": {
        const furnWidth = element.width || 60;
        const furnHeight = element.height || 40;
        const furnLabelOffset = furnHeight / 2 + 15;
        const furnLabelX = furnLabelOffset * Math.sin(rad);
        const furnLabelY = furnLabelOffset * Math.cos(rad);

        return (
          <Group
            x={element.x}
            y={element.y}
            rotation={element.rotation}
            scaleX={element.scaleX}
            scaleY={element.scaleY}
            draggable
            onClick={() => onSelect(element.id)}
            onTap={() => onSelect(element.id)}
            onDragEnd={handleDragEnd}
          >
            <Rect
              id={element.id}
              width={furnWidth}
              height={furnHeight}
              x={-furnWidth / 2}
              y={-furnHeight / 2}
              fill={element.color}
              stroke={isSelected ? "#3b82f6" : "#1c1917"}
              strokeWidth={isSelected ? 3 : 2}
              cornerRadius={4}
              onTransform={(e) => handleVisualTransform(e, false)}
              onTransformEnd={(e) => handleVisualTransform(e, true)}
            />
            {element.label && (
              <Text
                text={element.label}
                fontSize={10}
                fontFamily="Inter"
                fill="#1c1917"
                align="center"
                width={furnWidth + 40}
                height={14}
                x={furnLabelX}
                y={furnLabelY}
                offsetX={(furnWidth + 40) / 2}
                offsetY={7}
                rotation={-element.rotation}
              />
            )}
          </Group>
        );
      }

      default:
        return null;
    }
  };

  return renderShape();
}

function ShotCanvas({ elements, selectedId, onSelect, onUpdateElement }) {
  const stageRef = React.useRef(null);
  const transformerRef = React.useRef(null);
  const [size, setSize] = React.useState({ width: window.innerWidth, height: window.innerHeight });
  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) onSelect(null);
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * speed : oldScale / speed;
    const limitedScale = Math.max(0.1, Math.min(newScale, 10));

    const newPos = {
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    };

    setScale(limitedScale);
    setPosition(newPos);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.2, 10);
    const centerX = size.width / 2;
    const centerY = size.height / 2;

    const mousePointTo = {
      x: (centerX - position.x) / scale,
      y: (centerY - position.y) / scale,
    };

    const newPos = {
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale / 1.2, 0.1);
    const centerX = size.width / 2;
    const centerY = size.height / 2;

    const mousePointTo = {
      x: (centerX - position.x) / scale,
      y: (centerY - position.y) / scale,
    };

    const newPos = {
      x: centerX - mousePointTo.x * newScale,
      y: centerY - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  React.useEffect(() => {
    if (!selectedId) return;
    const node = stageRef.current.findOne((node) => node?.attrs?.id === selectedId);
    if (node && transformerRef.current) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);

  return (
    <div className="w-full h-full bg-stone-200 overflow-hidden relative">
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
        <div className="flex flex-col bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-stone-200 shadow-lg">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <div className="w-full h-px bg-stone-200 my-1" />
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
            title="Zoom Out"
          >
            –
          </button>
        </div>
        <button
          onClick={handleResetZoom}
          className="bg-white/80 backdrop-blur-md p-2.5 rounded-xl border border-stone-200 shadow-lg text-stone-600 hover:bg-stone-100 transition-colors"
          title="Reset Zoom"
        >
          Reset
        </button>
        <div className="bg-stone-900/10 px-2 py-1 rounded text-[10px] font-mono text-stone-500 text-center">
          {Math.round(scale * 100)}%
        </div>
      </div>

      <Stage
        width={size.width}
        height={size.height}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setPosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
        ref={stageRef}
      >
        <Layer>
          {elements.map((el) => (
            <CanvasElement
              key={el.id}
              element={el}
              isSelected={el.id === selectedId}
              selectedId={selectedId}
              onSelect={onSelect}
              onChange={(newAttrs, skipHistory) => onUpdateElement(el.id, newAttrs, skipHistory)}
            />
          ))}

          {selectedId && (
            <Transformer
              ref={transformerRef}
              resizeEnabled={false}
              rotateEnabled={true}
              borderEnabled={false}
              enabledAnchors={[]}
              rotateAnchorOffset={35}
              anchorSize={12}
              anchorCornerRadius={6}
              anchorFill="#3b82f6"
              anchorStroke="#ffffff"
              anchorStrokeWidth={2}
              padding={0}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

function Toolbar({ onAddElement, onDelete, hasSelection }) {
  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-stone-200 z-10">
      <ToolButton icon="👤" label="Character" onClick={() => onAddElement("character")} />
      <ToolButton icon="🎥" label="Camera" onClick={() => onAddElement("camera")} />
      <ToolButton icon="—" label="Wall" onClick={() => onAddElement("wall")} />
      <ToolButton icon="▭" label="Furniture" onClick={() => onAddElement("furniture")} />

      <div className="h-px bg-stone-200 my-1" />

      <button
        disabled={!hasSelection}
        onClick={onDelete}
        className="p-3 rounded-xl transition-all duration-200 hover:bg-red-50 text-stone-400 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent"
        title="Delete Selected"
      >
        🗑️
      </button>
    </div>
  );
}

function ToolButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative p-3 rounded-xl transition-all duration-200 hover:bg-stone-100 text-stone-600 hover:text-stone-900"
      title={label}
    >
      <span className="text-[18px] leading-none">{icon}</span>
      <span className="absolute left-full ml-3 px-2 py-1 bg-stone-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6",
  "#6366f1", "#8b5cf6", "#d946ef", "#1c1917", "#78716c",
];

function PropertiesPanel({ element, selectedId, onUpdate }) {
  if (!element) {
    return (
      <div className="absolute right-6 top-6 w-64 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-stone-200 z-10">
        <p className="text-stone-400 text-sm italic">Select an element to edit properties</p>
      </div>
    );
  }

  const isTrackSelected = selectedId && selectedId.endsWith("-track");

  const update = (key, value) => {
    onUpdate(selectedId, { [key]: value });
  };

  const updateTrack = (key, value) => {
    const t = element.trackTo || { x: 0, y: 0, rotation: 0 };
    onUpdate(selectedId, { trackTo: { ...t, [key]: value } });
  };

  return (
    <div className="absolute right-6 top-6 w-64 max-h-[calc(100vh-120px)] bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-stone-200 z-10 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            {isTrackSelected ? "Track Target" : "Properties"}
          </h3>
          <span className="text-[10px] font-mono text-stone-400">{element.type}</span>
        </div>

        <label className="block text-xs font-semibold text-stone-600 mb-2">Label</label>
        <input
          value={element.label || ""}
          onChange={(e) => update("label", e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Name"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-3">Color</label>
        <div className="grid grid-cols-5 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => update("color", c)}
              className={`w-9 h-9 rounded-xl border ${element.color === c ? "border-blue-500 ring-2 ring-blue-200" : "border-stone-200"}`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {element.type === "camera" && !isTrackSelected && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Shot #</label>
            <input
              value={element.shotNumber || ""}
              onChange={(e) => update("shotNumber", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 12A"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Frame</label>
            <input
              value={element.shotType || ""}
              onChange={(e) => update("shotType", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., CU"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">Scene #</label>
              <input
                value={element.sceneNumber || ""}
                onChange={(e) => update("sceneNumber", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-2">Setup #</label>
              <input
                value={element.setupNumber || ""}
                onChange={(e) => update("setupNumber", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Lens</label>
            <input
              value={element.lens || ""}
              onChange={(e) => update("lens", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Camera Support</label>
            <input
              value={element.cameraSupport || ""}
              onChange={(e) => update("cameraSupport", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Dolly, Tripod"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Tech Notes</label>
            <textarea
              value={element.techNotes || ""}
              onChange={(e) => update("techNotes", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Production Notes</label>
            <textarea
              value={element.productionNotes || ""}
              onChange={(e) => update("productionNotes", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => onUpdate(element.id, { trackTo: { x: 120, y: 0, rotation: 0 } })}
              className="w-full px-3 py-2 text-sm rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition-colors"
              title="Add a draggable/rotatable end camera position (track target)"
            >
              Add Track Target
            </button>
          </div>
        </div>
      )}

      {element.type === "camera" && isTrackSelected && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-stone-500">
            Drag/rotate the ghost camera on the canvas. This panel is mainly for clearing it.
          </p>
          <button
            onClick={() => onUpdate(element.id, { trackTo: undefined })}
            className="w-full px-3 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            Remove Track Target
          </button>
        </div>
      )}
    </div>
  );
}

const INITIAL_ELEMENTS = [
  {
    id: "char-1",
    type: "character",
    x: 200,
    y: 200,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: "#3b82f6",
    label: "Protagonist",
    radius: 20,
  },
  {
    id: "cam-1",
    type: "camera",
    x: 400,
    y: 400,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    color: "#1c1917",
    label: "Cam A",
    fov: 60,
  },
];

function App() {
  const [elements, setElements] = useState(() => {
    const saved = localStorage.getItem("shot-designer-scene");
    return saved ? JSON.parse(saved) : INITIAL_ELEMENTS;
  });
  const [selectedId, setSelectedId] = useState(null);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    localStorage.setItem("shot-designer-scene", JSON.stringify(elements));
  }, [elements]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, redoStack, elements]);

  const saveToHistory = useCallback((currentElements) => {
    setHistory((prev) => [...prev, currentElements]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setRedoStack((prev) => [elements, ...prev]);
    setHistory(newHistory);

    isInternalUpdate.current = true;
    setElements(previous);
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 0);
  }, [history, elements]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const next = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setHistory((prev) => [...prev, elements]);
    setRedoStack(newRedoStack);

    isInternalUpdate.current = true;
    setElements(next);
    setTimeout(() => {
      isInternalUpdate.current = false;
    }, 0);
  }, [redoStack, elements]);

  const handleAddElement = (type) => {
    saveToHistory(elements);
    const id = `${type}-${Date.now()}`;
    const newElement = {
      id,
      type,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      color: type === "character" ? "#3b82f6" : type === "camera" ? "#1c1917" : "#78716c",
      label: type.charAt(0).toUpperCase() + type.slice(1),
      radius: type === "character" ? 20 : undefined,
      width: type === "wall" ? 200 : type === "furniture" ? 80 : undefined,
      height: type === "wall" ? 10 : type === "furniture" ? 60 : undefined,
      fov: type === "camera" ? 60 : undefined,
    };
    setElements([...elements, newElement]);
    setSelectedId(id);
  };

  const handleUpdateElement = (id, newAttrs, skipHistory = false) => {
    if (!isInternalUpdate.current && !skipHistory) saveToHistory(elements);

    const baseId = id.endsWith("-track") ? id.replace("-track", "") : id;

    setElements(
      elements.map((el) => {
        if (el.id !== baseId) return el;

        if (id.endsWith("-track") && newAttrs.trackTo) {
          const t = el.trackTo || { x: 0, y: 0, rotation: 0 };
          return { ...el, trackTo: { ...t, ...newAttrs.trackTo } };
        }
        return { ...el, ...newAttrs };
      })
    );
  };

  const handleDelete = () => {
    if (!selectedId) return;

    saveToHistory(elements);

    if (selectedId.endsWith("-track")) {
      const baseId = selectedId.replace("-track", "");
      setElements(elements.map((el) => (el.id === baseId ? { ...el, trackTo: undefined } : el)));
      setSelectedId(null);
    } else {
      setElements(elements.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(elements, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", "scene.json");
    linkElement.click();
  };

  const handleImport = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        saveToHistory(elements);
        setElements(json);
        setSelectedId(null);
      } catch {
        alert("Failed to import scene file.");
      }
    };
    reader.readAsText(file);
  };

  const handleExcelExport = () => {
    const cameras = elements.filter((el) => el.type === "camera");

    const excelData = cameras.map((cam) => ({
      "SCENE #": cam.sceneNumber || "",
      "SETUP #": cam.setupNumber || "",
      "CAM ID": cam.label || "",
      "SHOT #": cam.shotNumber || "",
      FRAME: cam.shotType || "",
      NICKNAME: cam.nickname || "",
      "CAMERA SUPPORT": cam.cameraSupport || "",
      LENS: cam.lens || "",
      "TECH NOTES": cam.techNotes || "",
      "PRODUCTION NOTES": cam.productionNotes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shot List");

    worksheet["!cols"] = [
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
      { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 30 },
    ];

    XLSX.writeFile(workbook, "shot-list.xlsx");
  };

  const baseId = selectedId && selectedId.endsWith("-track") ? selectedId.replace("-track", "") : selectedId;
  const selectedElement = elements.find((el) => el.id === baseId) || null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-200">
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="bg-stone-900 text-white p-3 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">
              SD
            </div>
            <h1 className="font-bold tracking-tight text-lg pr-2">Shot Designer</h1>
          </div>

          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-stone-200 shadow-lg">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-3 py-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-3 py-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
            <div className="w-px h-4 bg-stone-200 mx-1" />
            <button
              onClick={handleExport}
              className="px-3 py-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
              title="Export Scene"
            >
              Export JSON
            </button>
            <label
              className="px-3 py-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors cursor-pointer"
              title="Import Scene"
            >
              Import JSON
              <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
            <div className="w-px h-4 bg-stone-200 mx-1" />
            <button
              onClick={handleExcelExport}
              className="px-3 py-2 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
              title="Export to Excel"
            >
              Export Excel
            </button>
          </div>
        </div>

        <div className="pointer-events-auto">
          <PropertiesPanel element={selectedElement} selectedId={selectedId} onUpdate={handleUpdateElement} />
        </div>
      </header>

      <ShotCanvas
        elements={elements}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdateElement={handleUpdateElement}
      />

      <Toolbar onAddElement={handleAddElement} onDelete={handleDelete} hasSelection={!!selectedId} />

      <footer className="absolute bottom-6 left-6 text-[10px] font-mono text-stone-400 uppercase tracking-widest z-10">
        Scene: {elements.length} elements • {selectedId ? `Selected: ${selectedId}` : "No selection"}
      </footer>

      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="text-center max-w-md p-8 bg-white/40 backdrop-blur-sm rounded-3xl border border-white/20">
            <h2 className="text-2xl font-bold text-stone-800 mb-2">Start Designing</h2>
            <p className="text-stone-500 text-sm">
              Use the toolbar on the left to add characters, cameras, and set elements to your scene.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
