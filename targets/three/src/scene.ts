import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  LineCurve3,
  LineLoop,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  QuadraticBezierCurve3,
  Raycaster,
  RingGeometry,
  Scene,
  TetrahedronGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Curve,
  type Material,
  type Object3D,
} from "three";
import { OrbitCamera } from "@/camera";
import { nodeSize, type Layout, type Point } from "@/layout";
import type { Category, SceneModel, SceneNode } from "@/model";
import type { Palette, RGB } from "@/palette";

// ── Scene ──────────────────────────────────────────────────────────────
// The renderer owns its canvas (CLAUDE.md §4). It renders on demand: a
// frame is drawn only when something changed, so an idle scene costs
// nothing and nothing moves unless the visitor asks.

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface SceneApi {
  readonly canvas: HTMLCanvasElement;
  setFocus(id: string | null, opts: { instant: boolean }): void;
  setHover(id: string | null): void;
  setPalette(p: Palette): void;
  pick(clientX: number, clientY: number): string | null;
  orbit(dx: number, dy: number): void;
  zoomBy(factor: number, opts: { instant: boolean }): void;
  zoomTo(radius: number): void;
  readonly radius: number;
  /** World point → CSS px inside the canvas. */
  project(p: Point): ScreenPoint;
  onFrame(fn: () => void): void;
  resize(width: number, height: number): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

const OVERVIEW_RADIUS = 30;
// Shape = category; root and paper get their own. Built per scene so a
// disposed scene never shares GPU buffers with the next mount.
const geometryFor = () => ({
  root: new DodecahedronGeometry(1, 0),
  paper: new BoxGeometry(1.4, 1.8, 0.3),
  work: new BoxGeometry(1.3, 1.3, 1.3),
  skills: new IcosahedronGeometry(1, 0),
  career: new CylinderGeometry(0.9, 0.9, 1.3, 6),
  writing: new ConeGeometry(1, 1.6, 4),
  self: new TetrahedronGeometry(1.15, 0),
});

interface NodeObj {
  node: SceneNode;
  group: Group;
  fill: Mesh<BufferGeometry, MeshBasicMaterial>;
  edge: LineSegments<BufferGeometry, LineBasicMaterial>;
}

// Palette values are gamma-encoded sRGB; three works in linear space.
const toColor = (c: RGB) => new Color().setRGB(c[0], c[1], c[2], SRGBColorSpace);
const V = (p: Point) => new Vector3(p.x, p.y, p.z);

export function createScene(host: HTMLElement, model: SceneModel, layout: Layout, palette: Palette): SceneApi {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  host.append(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 200);
  // Overview: look at the middle of the stack.
  const overviewTarget: Point = { x: 0, y: (layout.planes.at(-1)?.y ?? 0) / 2, z: 0 };
  const orbit = new OrbitCamera(overviewTarget, OVERVIEW_RADIUS);

  let pal = palette;
  let focus: string = model.root;
  let overview = true;
  let hover: string | null = null;

  // ── Nodes ─────────────────────────────────────────────────────────
  const geos = geometryFor();
  const edgeGeos = new Map<BufferGeometry, EdgesGeometry>();
  const objs = new Map<string, NodeObj>();
  const pickables: Mesh[] = [];
  for (const id of model.order) {
    const node = model.nodes.get(id)!;
    const geo = node.kind === "root" ? geos.root : node.kind === "paper" ? geos.paper : geos[node.category];
    if (!edgeGeos.has(geo)) edgeGeos.set(geo, new EdgesGeometry(geo));
    const fill = new Mesh(geo, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
    const edge = new LineSegments(edgeGeos.get(geo)!, new LineBasicMaterial({ transparent: true }));
    fill.userData.id = id;
    const group = new Group();
    group.add(fill, edge);
    const p = layout.positions.get(id)!;
    group.position.set(p.x, p.y, p.z);
    group.scale.setScalar(nodeSize(node));
    scene.add(group);
    objs.set(id, { node, group, fill, edge });
    pickables.push(fill);
  }

  // ── Planes ────────────────────────────────────────────────────────
  const planes = layout.planes.map((pl) => {
    const fill = new Mesh(
      new PlaneGeometry(pl.extent * 2, pl.extent * 2),
      new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = pl.y;
    const e = pl.extent;
    const corners = [
      [-e, -e],
      [e, -e],
      [e, e],
      [-e, e],
    ].map(([x, z]) => new Vector3(x, pl.y, z));
    const border = new LineLoop(new BufferGeometry().setFromPoints(corners), new LineBasicMaterial({ transparent: true }));
    scene.add(fill, border);
    return { plane: pl, fill, border, corners };
  });

  // ── Edges ─────────────────────────────────────────────────────────
  const containsPts: number[] = [];
  for (const n of model.nodes.values()) {
    if (!n.parent) continue;
    const a = layout.positions.get(n.parent)!;
    const b = layout.positions.get(n.id)!;
    containsPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const containsGeo = new BufferGeometry();
  containsGeo.setAttribute("position", new Float32BufferAttribute(containsPts, 3));
  const contains = new LineSegments(containsGeo, new LineBasicMaterial({ transparent: true, depthWrite: false }));
  scene.add(contains);

  const cross = model.cross.map((e) => {
    const A = V(layout.positions.get(e.from)!);
    const B = V(layout.positions.get(e.to)!);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    // Same-plane links arc upward; links between planes bow outward.
    const lift = A.y === B.y ? new Vector3(0, 2.2, 0) : new Vector3(mid.x * 0.12, 0.6, mid.z * 0.12);
    const curve = new QuadraticBezierCurve3(A, mid.clone().add(lift), B);
    const line = new Line(
      new BufferGeometry().setFromPoints(curve.getPoints(32)),
      new LineBasicMaterial({ transparent: true, depthWrite: false })
    );
    scene.add(line);
    return { edge: e, curve, line };
  });

  // ── Focus highlight: tubes and rings (WebGL lines are always 1 px) ──
  const highlight = new Group();
  scene.add(highlight);
  const hlAdd = (geo: BufferGeometry, opacity: number) => {
    const m = new Mesh(
      geo,
      new MeshBasicMaterial({ color: toColor(pal.accent), transparent: true, opacity, depthWrite: false, side: DoubleSide })
    );
    highlight.add(m);
    return m;
  };
  const tube = (curve: Curve<Vector3>, r: number, segments = 1) => new TubeGeometry(curve, segments, r, 8, false);
  const segment = (a: Point, b: Point, r: number) => tube(new LineCurve3(V(a), V(b)), r);
  const ring = (at: Point, r: number, width: number, opacity: number) => {
    const g = new RingGeometry(r, r + width, 64);
    g.rotateX(-Math.PI / 2);
    hlAdd(g, opacity).position.copy(V(at));
  };

  function buildHighlight() {
    for (const o of highlight.children as Mesh[]) {
      o.geometry.dispose();
      (o.material as Material).dispose();
    }
    highlight.clear();
    const f = model.nodes.get(focus)!;
    const at = (id: string) => layout.positions.get(id)!;
    // Path to the root: thick tubes, a ring where it crosses each plane.
    const path = model.ancestors(focus);
    for (let i = 0; i < path.length - 1; i++) hlAdd(segment(at(path[i]!), at(path[i + 1]!), 0.035), 0.95);
    for (const id of path.slice(1)) ring(at(id), nodeSize(model.nodes.get(id)!) * 1.9 + 0.12, 0.04, 0.6);
    // Down to the children: thinner.
    for (const c of f.children) hlAdd(segment(at(focus), at(c), 0.015), 0.5);
    // Cross links touching the focus.
    for (const c of cross) {
      if (c.edge.from === focus || c.edge.to === focus) hlAdd(tube(c.curve, 0.025, 32), 0.95);
    }
    // The focus: a double ring on its plane.
    const r = nodeSize(f) * 2.4 + 0.2;
    ring(at(focus), r, 0.09, 1);
    ring(at(focus), r * 1.45, 0.03, 0.55);
    // Its plane: a thick frame.
    if (!overview) {
      const c = planes[f.depth]!.corners;
      for (let i = 0; i < 4; i++) hlAdd(tube(new LineCurve3(c[i]!, c[(i + 1) % 4]!), 0.035), 0.9);
    }
  }

  function applyStyles() {
    const f = model.nodes.get(focus)!;
    const near = model.neighbors(focus);
    const path = new Set(model.ancestors(focus));
    const accent = toColor(pal.accent);
    const text = toColor(pal.text);
    const cats = Object.fromEntries(
      Object.entries(pal.category).map(([k, c]) => [k, toColor(c)])
    ) as Record<Category, Color>;

    renderer.setClearColor(toColor(pal.bg));
    for (const { node, group, fill, edge } of objs.values()) {
      const on = node.id === focus && !overview;
      const hov = node.id === hover;
      const related = near.has(node.id) || path.has(node.id);
      const base = node.depth >= 3 ? 0.7 : 1;
      const alpha = on || hov ? 1 : overview ? base : related ? 1 : node.depth === f.depth ? base * 0.75 : base * 0.25;
      const color = hov ? accent : cats[node.category];
      fill.material.color.copy(color);
      edge.material.color.copy(color);
      edge.material.opacity = alpha;
      fill.material.opacity = alpha * (node.isGroup ? 0.07 : on ? 0.75 : 0.4);
      group.scale.setScalar(nodeSize(node) * (on ? 1.5 : hov ? 1.25 : 1));
    }
    for (const { plane, fill, border } of planes) {
      const lit = !overview && plane.depth === f.depth;
      fill.material.color.copy(lit ? accent : text);
      border.material.color.copy(lit ? accent : text);
      fill.material.opacity = overview ? 0.035 : lit ? 0.06 : 0.015;
      border.material.opacity = overview ? 0.22 : lit ? 0.9 : 0.08;
    }
    contains.material.color.copy(text);
    contains.material.opacity = overview ? 0.16 : 0.08;
    for (const c of cross) {
      const touches = c.edge.from === focus || c.edge.to === focus;
      c.line.material.color.copy(accent);
      c.line.material.opacity = overview ? 0.75 : touches ? 1 : 0.25;
    }
    buildHighlight();
  }

  // ── Frame loop (on demand) ────────────────────────────────────────
  let raf = 0;
  let paused = false;
  let width = 1;
  let height = 1;
  const frameListeners: (() => void)[] = [];
  const requestRender = () => {
    if (raf || paused) return;
    raf = requestAnimationFrame(frame);
  };
  function frame(now: number) {
    raf = 0;
    if (orbit.step(now)) requestRender();
    const p = orbit.position();
    camera.position.set(p.x, p.y, p.z);
    camera.lookAt(V(orbit.target));
    renderer.render(scene, camera);
    for (const fn of frameListeners) fn();
  }

  // Far enough back that the focused plane's near edge is not magnified across the screen.
  const radiusFor = (n: SceneNode) => (n.depth >= 3 ? 12 : n.depth === 2 ? 16 : 20);
  const ndc = new Vector2();
  const ray = new Raycaster();
  const projected = new Vector3();

  applyStyles();

  return {
    canvas,
    get radius() {
      return orbit.radius;
    },
    setFocus(id, { instant }) {
      const next = id && model.nodes.has(id) ? id : model.root;
      overview = next === model.root;
      focus = next;
      applyStyles();
      const n = model.nodes.get(next)!;
      const now = performance.now();
      if (overview) orbit.flyTo(overviewTarget, OVERVIEW_RADIUS, { instant, now });
      else orbit.flyTo(layout.positions.get(next)!, radiusFor(n), { instant, now });
      requestRender();
    },
    setHover(id) {
      if (id === hover) return;
      hover = id;
      applyStyles();
      requestRender();
    },
    setPalette(p) {
      pal = p;
      applyStyles();
      requestRender();
    },
    pick(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      return (hit?.object.userData.id as string | undefined) ?? null;
    },
    orbit(dx, dy) {
      orbit.orbit(dx, dy);
      requestRender();
    },
    zoomBy(factor, { instant }) {
      orbit.zoomBy(factor, { instant, now: performance.now() });
      requestRender();
    },
    zoomTo(radius) {
      orbit.zoomTo(radius);
      requestRender();
    },
    project(p) {
      projected.set(p.x, p.y, p.z).project(camera);
      return {
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
        visible: projected.z <= 1,
      };
    },
    onFrame(fn) {
      frameListeners.push(fn);
    },
    resize(w, h) {
      if (w <= 0 || h <= 0) return;
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      requestRender();
    },
    pause() {
      paused = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },
    resume() {
      paused = false;
      requestRender();
    },
    dispose() {
      paused = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      frameListeners.length = 0;
      scene.traverse((o: Object3D) => {
        const m = o as Partial<Mesh>;
        m.geometry?.dispose();
        const mat = m.material as Material | Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      for (const g of edgeGeos.values()) g.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
