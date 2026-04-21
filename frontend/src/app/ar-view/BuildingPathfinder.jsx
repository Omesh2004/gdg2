"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCrisisSocket } from "./useCrisisSocket";

// ── Canvas and blueprint dimensions ────────────────────────────
const W = 980;
const H = 920;
const FLOOR_H = 170;
const FLOOR_GAP = 34;
const FLOOR_TOP = 48;

const FLOOR_DEFS = [
  { code: "F1", title: "LEVEL 4  •  ADMIN WING" },
  { code: "F2", title: "LEVEL 3  •  PATIENT CARE" },
  { code: "F3", title: "LEVEL 2  •  CLINICAL LABS" },
  { code: "F4", title: "GROUND  •  LOBBY + TRIAGE" },
];

const SHAFTS = [
  { key: "stairA", x: 36, w: 38, label: "STAIR A", type: "stair" },
  { key: "elev", x: 472, w: 36, label: "ELEV", type: "elevator" },
  { key: "stairB", x: 904, w: 38, label: "STAIR B", type: "stair" },
];

const ROOM_SHELL = [
  { key: "wardW", label: "WARD WEST", x: 82, w: 125, y: 28, h: 66 },
  { key: "imaging", label: "IMAGING", x: 226, w: 105, y: 28, h: 66 },
  { key: "nurse", label: "NURSE HUB", x: 344, w: 132, y: 28, h: 66 },
  { key: "surgery", label: "SURGERY", x: 494, w: 132, y: 28, h: 66 },
  { key: "wardE", label: "WARD EAST", x: 642, w: 125, y: 28, h: 66 },
  { key: "pharma", label: "PHARMACY", x: 786, w: 104, y: 28, h: 66 },
  { key: "hall", label: "MAIN CORRIDOR", x: 82, w: 808, y: 106, h: 44 },
];

const ROOM_STYLE = {
  roomFill: "#0f203a",
  roomStroke: "#32557f",
  hallFill: "#101a30",
  hallStroke: "#28415f",
};

function floorY(index) {
  return FLOOR_TOP + index * (FLOOR_H + FLOOR_GAP);
}

function makeFloor(def, index) {
  const fy = floorY(index);
  return {
    ...def,
    floor: index + 1,
    fy,
    rooms: ROOM_SHELL.map(r => ({
      id: `${def.code}_${r.key}`,
      label: r.label,
      x: r.x,
      y: fy + r.y,
      w: r.w,
      h: r.h,
      fill: r.key === "hall" ? ROOM_STYLE.hallFill : ROOM_STYLE.roomFill,
      stroke: r.key === "hall" ? ROOM_STYLE.hallStroke : ROOM_STYLE.roomStroke,
      isHall: r.key === "hall",
    })),
  };
}

const FLOORS = FLOOR_DEFS.map(makeFloor);
const GROUND = FLOORS[FLOORS.length - 1];

const EXIT_ROOMS = [
  {
    id: "exit_west",
    label: "EXIT WEST",
    x: 30,
    y: GROUND.fy + FLOOR_H + 8,
    w: 132,
    h: 52,
    fill: "#0b2618",
    stroke: "#2f9a5f",
    isExit: true,
  },
  {
    id: "exit_east",
    label: "EXIT EAST",
    x: 818,
    y: GROUND.fy + FLOOR_H + 8,
    w: 132,
    h: 52,
    fill: "#0b2618",
    stroke: "#2f9a5f",
    isExit: true,
  },
];

const EXIT_IDS = EXIT_ROOMS.map(r => r.id);

function buildGraph() {
  const nodes = {};
  const labels = {};
  const edges = [];

  const addNode = (id, x, y, floor, label) => {
    nodes[id] = { x, y, floor };
    labels[id] = label;
  };

  const connect = (a, b) => edges.push([a, b]);

  FLOORS.forEach(floor => {
    const fy = floor.fy;
    const p = floor.code;

    addNode(`${p}_wardW`, 145, fy + 60, floor.floor, `${p} Ward West`);
    addNode(`${p}_imaging`, 277, fy + 60, floor.floor, `${p} Imaging`);
    addNode(`${p}_nurse`, 410, fy + 60, floor.floor, `${p} Nurse Hub`);
    addNode(`${p}_surgery`, 560, fy + 60, floor.floor, `${p} Surgery`);
    addNode(`${p}_wardE`, 703, fy + 60, floor.floor, `${p} Ward East`);
    addNode(`${p}_pharma`, 839, fy + 60, floor.floor, `${p} Pharmacy`);

    addNode(`${p}_hallW`, 192, fy + 128, floor.floor, `${p} Corridor West`);
    addNode(`${p}_hallC`, 490, fy + 128, floor.floor, `${p} Corridor Core`);
    addNode(`${p}_hallE`, 770, fy + 128, floor.floor, `${p} Corridor East`);

    addNode(`${p}_stairA`, 55, fy + 128, floor.floor, `${p} Stair A`);
    addNode(`${p}_elev`, 490, fy + 102, floor.floor, `${p} Elevator Lobby`);
    addNode(`${p}_stairB`, 923, fy + 128, floor.floor, `${p} Stair B`);

    connect(`${p}_wardW`, `${p}_hallW`);
    connect(`${p}_imaging`, `${p}_hallW`);
    connect(`${p}_nurse`, `${p}_hallC`);
    connect(`${p}_surgery`, `${p}_hallC`);
    connect(`${p}_wardE`, `${p}_hallE`);
    connect(`${p}_pharma`, `${p}_hallE`);

    connect(`${p}_hallW`, `${p}_hallC`);
    connect(`${p}_hallC`, `${p}_hallE`);
    connect(`${p}_hallW`, `${p}_stairA`);
    connect(`${p}_hallC`, `${p}_elev`);
    connect(`${p}_hallE`, `${p}_stairB`);
  });

  for (let i = 0; i < FLOORS.length - 1; i += 1) {
    const cur = FLOORS[i].code;
    const next = FLOORS[i + 1].code;
    connect(`${cur}_stairA`, `${next}_stairA`);
    connect(`${cur}_elev`, `${next}_elev`);
    connect(`${cur}_stairB`, `${next}_stairB`);
  }

  addNode("exit_west", 95, EXIT_ROOMS[0].y + 26, GROUND.floor, "Exit West");
  addNode("exit_east", 885, EXIT_ROOMS[1].y + 26, GROUND.floor, "Exit East");
  connect(`${GROUND.code}_hallW`, "exit_west");
  connect(`${GROUND.code}_hallE`, "exit_east");
  connect(`${GROUND.code}_stairA`, "exit_west");
  connect(`${GROUND.code}_stairB`, "exit_east");

  return { nodes, edges, labels };
}

const { nodes: NODES, edges: EDGES, labels: NODE_LABELS } = buildGraph();

const DEFAULT_START = "F1_nurse";

const FLOOR_ALERT_ANCHORS = {
  F1: { x: 560, y: floorY(0) + 62 },
  F2: { x: 560, y: floorY(1) + 62 },
  F3: { x: 560, y: floorY(2) + 62 },
  F4: { x: 560, y: floorY(3) + 62 },
};

function inferFloorCodeFromIncident(incident) {
  const raw = `${incident.floor || ""} ${incident.cameraId || ""} ${incident.message || ""}`.toLowerCase();

  if (raw.includes("f1") || raw.includes("floor 1") || raw.includes("level 4")) return "F1";
  if (raw.includes("f2") || raw.includes("floor 2") || raw.includes("level 3")) return "F2";
  if (raw.includes("f3") || raw.includes("floor 3") || raw.includes("level 2")) return "F3";
  if (raw.includes("f4") || raw.includes("ground") || raw.includes("floor 4")) return "F4";

  return "F2";
}

function incidentToFirePoint(incident, index) {
  const floorCode = inferFloorCodeFromIncident(incident);
  const anchor = FLOOR_ALERT_ANCHORS[floorCode] || FLOOR_ALERT_ANCHORS.F2;
  const spread = (index % 3) * 22;

  return {
    x: anchor.x + spread,
    y: anchor.y + (Math.floor(index / 3) % 2 === 0 ? 0 : 18),
  };
}

// ── A* ─────────────────────────────────────────────────────────
function nodeDist(a, b) {
  return Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
}

function getNeighbors(node, blocked) {
  return EDGES
    .filter(([a, b]) => a === node || b === node)
    .map(([a, b]) => (a === node ? b : a))
    .filter(n => !blocked.has(n));
}

function astar(start, goal, blocked) {
  if (blocked.has(start) || blocked.has(goal)) return null;
  const open = new Set([start]);
  const cameFrom = {};
  const g = {};
  const f = {};
  Object.keys(NODES).forEach(n => {
    g[n] = Infinity;
    f[n] = Infinity;
  });

  g[start] = 0;
  f[start] = nodeDist(start, goal);

  while (open.size > 0) {
    let cur = [...open].reduce((a, b) => (f[a] < f[b] ? a : b));
    if (cur === goal) {
      const path = [];
      while (cur) {
        path.unshift(cur);
        cur = cameFrom[cur];
      }
      return path;
    }

    open.delete(cur);
    for (const nb of getNeighbors(cur, blocked)) {
      const t = g[cur] + nodeDist(cur, nb);
      if (t < g[nb]) {
        cameFrom[nb] = cur;
        g[nb] = t;
        f[nb] = t + nodeDist(nb, goal);
        open.add(nb);
      }
    }
  }
  return null;
}

function computePath(startNode, fires, fireRadius) {
  const blocked = new Set();
  fires.forEach(fp => {
    Object.entries(NODES).forEach(([id, n]) => {
      if (Math.hypot(n.x - fp.x, n.y - fp.y) < fireRadius) blocked.add(id);
    });

    EDGES.forEach(([a, b]) => {
      const mx = (NODES[a].x + NODES[b].x) / 2;
      const my = (NODES[a].y + NODES[b].y) / 2;
      if (Math.hypot(mx - fp.x, my - fp.y) < fireRadius) {
        blocked.add(a);
        blocked.add(b);
      }
    });
  });

  let bestPath = null;
  for (const exitId of EXIT_IDS) {
    const p = astar(startNode, exitId, blocked);
    if (p && (!bestPath || p.length < bestPath.length)) bestPath = p;
  }
  return { path: bestPath, blocked };
}

// ── Catmull-Rom curve ──────────────────────────────────────────
function catmullPoint(p0, p1, p2, p3, t) {
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * t + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * t * t),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t),
  };
}

function getCurvePoints(pts, steps = 8) {
  if (pts.length < 2) return pts;
  const ext = [pts[0], ...pts, pts[pts.length - 1]];
  const result = [];
  for (let i = 1; i < ext.length - 2; i += 1) {
    for (let s = 0; s <= steps; s += 1) {
      result.push(catmullPoint(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / steps));
    }
  }
  return result;
}

function nodeFloor(id) {
  const prefix = id.split("_")[0];
  return prefix.startsWith("F") ? prefix : "";
}

// ── Renderer ────────────────────────────────────────────────────
function drawScene(ctx, state, time) {
  const { path, blocked, fires, fireRadius, hoveredNode, startNode, mode } = state;

  ctx.save();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#060d1a";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "rgba(25, 55, 95, 0.2)");
  bgGrad.addColorStop(1, "rgba(5, 12, 20, 0.1)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(40, 80, 130, 0.22)";
  ctx.lineWidth = 0.6;
  for (let x = 0; x < W; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  FLOORS.forEach((floor, i) => {
    const fy = floor.fy;
    const hue = 165 + i * 8;
    ctx.fillStyle = `hsla(${hue}, 45%, 35%, 0.12)`;
    ctx.fillRect(10, fy - 2, W - 20, FLOOR_H + 4);
    ctx.fillStyle = "rgba(40, 80, 120, 0.12)";
    ctx.fillRect(10, fy, W - 20, 24);
    ctx.strokeStyle = "rgba(70, 120, 170, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, fy, W - 20, FLOOR_H);
    ctx.fillStyle = "#79a4d4";
    ctx.fillText(floor.title, 20, fy + 7);
  });
  ctx.restore();

  const shaftTop = FLOORS[0].fy + 22;
  const shaftBottom = FLOORS[FLOORS.length - 1].fy + FLOOR_H;
  ctx.save();
  SHAFTS.forEach(shaft => {
    const isElevator = shaft.type === "elevator";
    ctx.fillStyle = isElevator ? "rgba(20, 95, 150, 0.32)" : "rgba(90, 70, 165, 0.2)";
    ctx.strokeStyle = isElevator ? "rgba(60, 170, 235, 0.65)" : "rgba(140, 120, 240, 0.58)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(shaft.x, shaftTop, shaft.w, shaftBottom - shaftTop, 4);
    ctx.fill();
    ctx.stroke();

    if (!isElevator) {
      ctx.strokeStyle = "rgba(140, 120, 240, 0.34)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 16; i += 1) {
        const y = shaftTop + ((shaftBottom - shaftTop) / 17) * i;
        ctx.beginPath();
        ctx.moveTo(shaft.x + 3, y);
        ctx.lineTo(shaft.x + shaft.w - 3, y);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(shaft.x + shaft.w / 2, shaftTop + 14);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = isElevator ? "#6ecdf9" : "#a7a0ff";
    ctx.font = "bold 9px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(shaft.label, 0, 0);
    ctx.restore();
  });
  ctx.restore();

  ctx.save();
  [...FLOORS.flatMap(f => f.rooms), ...EXIT_ROOMS].forEach(r => {
    ctx.fillStyle = r.fill;
    ctx.strokeStyle = r.stroke;
    ctx.lineWidth = r.isHall ? 1.2 : 1.5;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 4);
    ctx.fill();
    ctx.stroke();

    if (r.isExit) {
      ctx.shadowColor = "#32ffa2";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#4ff7ad";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = r.isExit ? "#4ff7ad" : r.isHall ? "#8ab7df" : "#7ea8d1";
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(r.label, r.x + r.w / 2, r.y + r.h / 2);
  });
  ctx.restore();

  if (fires.length > 0) {
    ctx.save();
    fires.forEach(fp => {
      const pulse = 1 + Math.sin(time * 4) * 0.06;
      const fr = fireRadius * pulse;
      const grad = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, fr);
      grad.addColorStop(0, `rgba(255,180,0,${0.38 + Math.sin(time * 5) * 0.09})`);
      grad.addColorStop(0.4, "rgba(255,80,0,0.25)");
      grad.addColorStop(1, "rgba(255,30,0,0)");
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, fr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(fp.x, fp.y, fr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 120, 40, ${0.42 + Math.sin(time * 5.5) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  ctx.save();
  EDGES.forEach(([a, b]) => {
    const na = NODES[a];
    const nb = NODES[b];
    const isBlocked = blocked.has(a) || blocked.has(b);
    const sameFloor = nodeFloor(a) === nodeFloor(b);
    const isElev = a.includes("_elev") && b.includes("_elev");
    const isStair = a.includes("_stair") && b.includes("_stair");

    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = isBlocked
      ? "rgba(255, 70, 35, 0.26)"
      : isElev
        ? "rgba(95, 210, 255, 0.62)"
        : isStair && !sameFloor
          ? "rgba(165, 138, 255, 0.55)"
          : "rgba(70, 135, 200, 0.36)";
    ctx.lineWidth = !sameFloor ? 2.1 : 1;
    if (!sameFloor) ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.restore();

  if (path && path.length >= 2) {
    const pts = path.map(id => NODES[id]);
    const curve = getCurvePoints(pts);

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    curve.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = `rgba(50, 255, 175, ${0.14 + Math.sin(time * 3) * 0.05})`;
    ctx.lineWidth = 15;
    ctx.stroke();

    ctx.beginPath();
    curve.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = `rgba(50, 255, 175, ${0.78 + Math.sin(time * 3.2) * 0.17})`;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.setLineDash([11, 14]);
    ctx.lineDashOffset = -((time * 88) % 25);
    ctx.beginPath();
    curve.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = "rgba(190, 255, 225, 0.64)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.restore();
  }

  ctx.save();
  Object.entries(NODES).forEach(([id, n]) => {
    const isBlocked = blocked.has(id);
    const isExit = id.startsWith("exit");
    const isStart = id === startNode;
    const isStair = id.includes("_stair");
    const isElev = id.includes("_elev");
    const isOnPath = path && path.includes(id);
    const isHovered = hoveredNode === id;

    let color = "#2c63b7";
    if (isBlocked) color = "#d53f2a";
    else if (isExit) color = "#ffbf3a";
    else if (isStart) color = "#ba7cff";
    else if (isElev) color = "#56d4ff";
    else if (isStair) color = "#8f76ff";
    else if (isOnPath) color = "#30ffaf";

    const r = isExit || isStart || isStair || isElev ? 6.8 : 4.8;
    const pr = isHovered ? r + 2.8 : r;

    if (isHovered || isOnPath) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, pr + 4.5, 0, Math.PI * 2);
      ctx.fillStyle = `${color}30`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(n.x, n.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isHovered || isOnPath ? 10 : 4;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (isExit || isStart || isStair || isElev) {
      ctx.font = "bold 9px 'Courier New', monospace";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const label = isStart ? "START" : isElev ? "ELEV" : isStair ? "STAIR" : "EXIT";
      ctx.fillText(label, n.x, n.y - pr - 3);
    }
  });
  ctx.restore();

  if (fires.length > 0) {
    ctx.save();
    fires.forEach(fp => {
      ctx.font = `${18 + Math.sin(time * 4.5) * 2}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🔥", fp.x, fp.y);
    });
    ctx.restore();
  }

  if (mode === "fire") {
    ctx.save();
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "#ff9f5f";
    ctx.textAlign = "center";
    ctx.fillText("🔥 Click blueprint to place fire zone", W / 2, H - 12);
    ctx.restore();
  } else if (mode === "start") {
    ctx.save();
    ctx.font = "11px 'Courier New', monospace";
    ctx.fillStyle = "#c8a3ff";
    ctx.textAlign = "center";
    ctx.fillText("🟣 Click any waypoint to set start", W / 2, H - 12);
    ctx.restore();
  }
}

// ── Main component ──────────────────────────────────────────────
export default function BuildingPathfinder() {
  const { status: socketStatus, incidents } = useCrisisSocket();

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const stateRef = useRef({
    path: null,
    blocked: new Set(),
    fires: [],
    manualFires: [],
    externalFires: [],
    fireRadius: 62,
    hoveredNode: null,
    startNode: DEFAULT_START,
    mode: "none",
  });

  const [fireRadius, setFireRadius] = useState(62);
  const [fires, setFires] = useState([]);
  const [startNode, setStartNode] = useState(DEFAULT_START);
  const [pathState, setPathState] = useState({ path: null, blocked: new Set() });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mode, setMode] = useState("none");

  const externalFires = useMemo(
    () => incidents.map((incident, index) => incidentToFirePoint(incident, index)),
    [incidents]
  );

  const refresh = useCallback((sn, manualFireZones, liveFireZones, fr) => {
    const mergedFires = [...manualFireZones, ...liveFireZones];
    const result = computePath(sn, mergedFires, fr);
    setPathState(result);
    stateRef.current = {
      ...stateRef.current,
      ...result,
      fires: mergedFires,
      manualFires: manualFireZones,
      externalFires: liveFireZones,
      fireRadius: fr,
      startNode: sn,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const initial = computePath(DEFAULT_START, [], 62);
    stateRef.current = {
      ...stateRef.current,
      ...initial,
      fires: [],
      manualFires: [],
      externalFires: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    setPathState(initial);

    const loop = () => {
      timeRef.current += 0.016;
      drawScene(ctx, stateRef.current, timeRef.current);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    stateRef.current.mode = mode;
  }, [mode]);

  useEffect(() => {
    refresh(stateRef.current.startNode, stateRef.current.manualFires, externalFires, stateRef.current.fireRadius);
  }, [externalFires, refresh]);

  const getCanvasPos = e => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const sx = W / rect.width;
    const sy = H / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const handleCanvasMove = useCallback(e => {
    const pos = getCanvasPos(e);
    if (!pos) return;

    let found = null;
    for (const [id, n] of Object.entries(NODES)) {
      if (Math.hypot(n.x - pos.x, n.y - pos.y) < 12) {
        found = id;
        break;
      }
    }

    setHoveredNode(found);
    stateRef.current.hoveredNode = found;
  }, []);

  const handleCanvasClick = useCallback(
    e => {
      const pos = getCanvasPos(e);
      if (!pos) return;
      const currentMode = stateRef.current.mode;

      if (currentMode === "fire") {
        const newFires = [...stateRef.current.manualFires, { x: pos.x, y: pos.y }];
        setFires(newFires);
        stateRef.current.manualFires = newFires;
        refresh(stateRef.current.startNode, newFires, stateRef.current.externalFires, stateRef.current.fireRadius);
      } else if (currentMode === "start") {
        let best = null;
        let bestD = Infinity;
        for (const [id, n] of Object.entries(NODES)) {
          const d = Math.hypot(n.x - pos.x, n.y - pos.y);
          if (d < bestD && !id.startsWith("exit")) {
            best = id;
            bestD = d;
          }
        }

        if (best && bestD < 30) {
          setStartNode(best);
          stateRef.current.startNode = best;
          refresh(best, stateRef.current.manualFires, stateRef.current.externalFires, stateRef.current.fireRadius);
          setMode("none");
          stateRef.current.mode = "none";
        }
      }
    },
    [refresh]
  );

  const handleClearFire = () => {
    setFires([]);
    stateRef.current.manualFires = [];
    refresh(stateRef.current.startNode, [], stateRef.current.externalFires, stateRef.current.fireRadius);
  };

  const handleClearAll = () => {
    setFires([]);
    setStartNode(DEFAULT_START);
    setMode("none");
    stateRef.current.manualFires = [];
    stateRef.current.startNode = DEFAULT_START;
    stateRef.current.mode = "none";
    refresh(DEFAULT_START, [], stateRef.current.externalFires, fireRadius);
  };

  const handleRadiusChange = val => {
    setFireRadius(val);
    stateRef.current.fireRadius = val;
    refresh(stateRef.current.startNode, stateRef.current.manualFires, stateRef.current.externalFires, val);
  };

  const { path, blocked } = pathState;
  const pathFound = Boolean(path && path.length > 0);
  const endNode = pathFound ? path[path.length - 1] : null;
  const exitLabel = endNode === "exit_west" ? "EXIT WEST" : endNode === "exit_east" ? "EXIT EAST" : "-";
  const startLabel = NODE_LABELS[startNode] ? `${NODE_LABELS[startNode]} (Floor ${NODES[startNode].floor})` : startNode;

  const btnBase = {
    width: "100%",
    padding: "7px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 11,
    marginBottom: 6,
    fontFamily: "'Courier New', monospace",
  };

  return (
    <div
      style={{
        fontFamily: "'Courier New', monospace",
        background: "#030810",
        minHeight: "calc(100vh - 8rem)",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ color: "#5f9bd9", fontSize: 11, letterSpacing: 4, marginBottom: 8, textTransform: "uppercase" }}>
        ⬡ Hyper-Detailed Multi-Floor Building Pathfinder
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", width: "100%", maxWidth: 1320 }}>
        <div
          style={{
            position: "relative",
            flex: 1,
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid rgba(40,80,160,0.4)",
            boxShadow: "0 0 55px rgba(0,80,200,0.14)",
            cursor: mode !== "none" ? "crosshair" : hoveredNode ? "pointer" : "default",
          }}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ display: "block", width: "100%" }}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => {
              setHoveredNode(null);
              stateRef.current.hoveredNode = null;
            }}
            onClick={handleCanvasClick}
          />

          {hoveredNode && (
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: 10,
                background: "rgba(5,15,35,0.9)",
                border: "1px solid rgba(40,80,160,0.5)",
                borderRadius: 4,
                padding: "4px 10px",
                color: "#8ec4ff",
                fontSize: 11,
                pointerEvents: "none",
              }}
            >
              Node: <span style={{ color: "#c1e2ff" }}>{NODE_LABELS[hoveredNode] ?? hoveredNode}</span>
              {blocked.has(hoveredNode) && <span style={{ color: "#ff5f45", marginLeft: 8 }}>BLOCKED</span>}
            </div>
          )}
        </div>

        <div
          style={{
            width: 250,
            background: "rgba(5,12,28,0.95)",
            border: "1px solid rgba(40,80,160,0.35)",
            borderRadius: 8,
            padding: "16px",
            color: "#a0b8d8",
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ color: "#62a3e8", fontSize: 10, letterSpacing: 3, marginBottom: 12 }}>PATHFINDING</div>

          <Row label="Algorithm" value="A*" />
          <Row label="Floors" value={`${FLOORS.length} linked levels`} />
          <Row label="Start" value={startLabel} />
          <Row label="Nodes in path" value={pathFound ? path.length : "0"} highlight={!pathFound} />
          <Row label="Live feed" value={socketStatus} highlight={socketStatus !== "connected"} />

          <Divider />

          <div
            style={{
              padding: "7px 10px",
              borderRadius: 4,
              marginBottom: 12,
              fontSize: 11,
              textAlign: "center",
              background: pathFound ? "rgba(0,180,80,0.1)" : "rgba(255,40,0,0.1)",
              border: `1px solid ${pathFound ? "rgba(0,200,80,0.3)" : "rgba(255,60,0,0.3)"}`,
              color: pathFound ? "#40e880" : "#ff6644",
            }}
          >
            {pathFound ? `✓ Route found → ${exitLabel}` : "✗ All exits blocked"}
          </div>

          <Divider />
          <div style={{ marginBottom: 8, fontSize: 10, color: "#4a6080", letterSpacing: 2 }}>PLACEMENT MODE</div>

          <button
            onClick={() => {
              const m = mode === "start" ? "none" : "start";
              setMode(m);
              stateRef.current.mode = m;
            }}
            style={{
              ...btnBase,
              background: mode === "start" ? "rgba(140,80,255,0.2)" : "rgba(100,60,200,0.1)",
              border: `1px solid ${mode === "start" ? "rgba(160,100,255,0.6)" : "rgba(100,60,200,0.3)"}`,
              color: mode === "start" ? "#cc99ff" : "#8866cc",
            }}
          >
            🟣 {mode === "start" ? "Click a node..." : "Set Start Point"}
          </button>

          <button
            onClick={() => {
              const m = mode === "fire" ? "none" : "fire";
              setMode(m);
              stateRef.current.mode = m;
            }}
            style={{
              ...btnBase,
              background: mode === "fire" ? "rgba(255,80,0,0.2)" : "rgba(180,50,0,0.1)",
              border: `1px solid ${mode === "fire" ? "rgba(255,120,0,0.6)" : "rgba(200,70,0,0.3)"}`,
              color: mode === "fire" ? "#ff9955" : "#cc5522",
            }}
          >
            🔥 {mode === "fire" ? "Click to place..." : "Place Fire"}
          </button>

          <Divider />
          <div style={{ marginBottom: 6, fontSize: 10, color: "#4a6080", letterSpacing: 2 }}>FIRE CONTROL</div>

          <Row label="Fire zones" value={`${fires.length} manual / ${externalFires.length} live`} highlight={fires.length + externalFires.length === 0} />

          <label style={{ fontSize: 10, color: "#4a6080", display: "block", marginBottom: 4 }}>
            Radius: <span style={{ color: "#a0b8d8" }}>{fireRadius}px</span>
          </label>
          <input
            type="range"
            min={30}
            max={160}
            step={5}
            value={fireRadius}
            onChange={e => handleRadiusChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#ff5b28", marginBottom: 10 }}
          />

          <button
            onClick={handleClearFire}
            disabled={fires.length === 0}
            style={{
              ...btnBase,
              background: "rgba(0,180,80,0.1)",
              border: "1px solid rgba(0,200,80,0.3)",
              color: "#40e880",
              opacity: fires.length === 0 ? 0.4 : 1,
              cursor: fires.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            ✓ Clear Fire
          </button>

          <button
            onClick={handleClearAll}
            style={{ ...btnBase, background: "rgba(30,50,100,0.2)", border: "1px solid rgba(40,80,160,0.35)", color: "#6688bb" }}
          >
            ↺ Reset All
          </button>

          <Divider />
          <div style={{ marginBottom: 8, fontSize: 10, color: "#4a6080", letterSpacing: 2 }}>LIVE INCIDENTS</div>
          <div style={{ marginBottom: 10, maxHeight: 110, overflowY: "auto", border: "1px solid rgba(40,80,160,0.2)", borderRadius: 4, padding: "6px" }}>
            {incidents.length === 0 ? (
              <div style={{ fontSize: 10, color: "#607080" }}>No active critical incidents received.</div>
            ) : (
              incidents.slice(0, 4).map((incident) => (
                <div key={incident.id} style={{ marginBottom: 6, fontSize: 10, color: "#a0b8d8" }}>
                  <div style={{ color: "#ff9f5f" }}>{incident.type.toUpperCase()}</div>
                  <div>{incident.cameraId}</div>
                </div>
              ))
            )}
          </div>

          <Divider />
          <div style={{ fontSize: 10, color: "#4a6080", letterSpacing: 2, marginBottom: 8 }}>LEGEND</div>
          {[
            ["#ba7cff", "Start node"],
            ["#30ffaf", "Safe path"],
            ["#ffbf3a", "Exit"],
            ["#8f76ff", "Stair connector"],
            ["#56d4ff", "Elevator connector"],
            ["#2c63b7", "Waypoint"],
            ["#d53f2a", "Blocked"],
            ["#ff7a2a", "Fire zone"],
          ].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#607080" }}>{l}</span>
            </div>
          ))}

          <Divider />
          <div style={{ fontSize: 10, color: "#3a5070", lineHeight: 1.6 }}>
            <div>1) Set Start and pick any waypoint</div>
            <div>2) Place one or more fire zones</div>
            <div>3) Tune hazard radius with slider</div>
            <div>4) Route auto-updates across all floors</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
      <span style={{ color: "#4a6080", fontSize: 11 }}>{label}</span>
      <span style={{ color: highlight ? "#ff6644" : "#c8daf0", fontWeight: "bold", fontSize: 11, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid rgba(40,80,160,0.2)", margin: "12px 0" }} />;
}
