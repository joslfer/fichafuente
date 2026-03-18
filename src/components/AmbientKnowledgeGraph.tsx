import { useEffect, useMemo, useRef } from "react";
import { normalizeTags } from "@/lib/utils";

type GraphItem = {
  tags?: string[] | null;
};

type AmbientKnowledgeGraphProps = {
  items: GraphItem[];
  className?: string;
  centerAvoidRadius?: number;
  perturbSignal?: number;
};

type NodeState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

type EdgeState = {
  from: number;
  to: number;
  sharedTags: number;
  alpha: number;
  width: number;
};

const CANVAS_HEIGHT = 160;
const IDEAL_EDGE_DISTANCE = 70;
const REPULSION_STRENGTH = 1800;
const SPRING_STRENGTH = 0.0055;
const CENTER_PULL = 0.0018;
const DAMPING = 0.94;
const RANDOM_NUDGE = 0.008;
const INTRO_DURATION_MS = 950;

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

const segmentIntersectsCircle = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  radius: number
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    const ddx = x1 - cx;
    const ddy = y1 - cy;
    return ddx * ddx + ddy * ddy <= radius * radius;
  }

  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lengthSq));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  const ndx = nearestX - cx;
  const ndy = nearestY - cy;
  return ndx * ndx + ndy * ndy <= radius * radius;
};

const AmbientKnowledgeGraph = ({
  items,
  className,
  centerAvoidRadius = 56,
  perturbSignal = 0,
}: AmbientKnowledgeGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const perturbStrengthRef = useRef(0);
  const lastPerturbSignalRef = useRef(perturbSignal);

  const model = useMemo(() => {
    const count = items.length;
    const edges: EdgeState[] = [];
    let maxSharedTags = 1;

    for (let i = 0; i < count; i += 1) {
      const tagsA = new Set(normalizeTags(items[i].tags));
      if (tagsA.size === 0) continue;

      for (let j = i + 1; j < count; j += 1) {
        const tagsB = new Set(normalizeTags(items[j].tags));
        const sharedTags = Array.from(tagsA).reduce((total, tag) => total + (tagsB.has(tag) ? 1 : 0), 0);

        if (sharedTags > 0) {
          maxSharedTags = Math.max(maxSharedTags, sharedTags);
          edges.push({
            from: i,
            to: j,
            sharedTags,
            alpha: 0,
            width: 0.5,
          });
        }
      }
    }

    const normalizedEdges = edges.map((edge) => {
      const strength = edge.sharedTags / maxSharedTags;
      return {
        ...edge,
        alpha: 0.18 + strength * 0.24,
        width: 0.75 + strength * 0.65,
      };
    });

    return { count, edges: normalizedEdges };
  }, [items]);

  useEffect(() => {
    if (perturbSignal === lastPerturbSignalRef.current) return;
    lastPerturbSignalRef.current = perturbSignal;
    perturbStrengthRef.current = Math.min(2.2, perturbStrengthRef.current + 1.5);
  }, [perturbSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || model.count === 0) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = CANVAS_HEIGHT;
    let centerX = 0;
    let centerY = 0;
    let frameId = 0;
    let animationStart = performance.now();
    let lastTick = performance.now();
    let introFactor = 0;
    const isDark = document.documentElement.classList.contains("dark");
    const edgeRgb = isDark ? "255,255,255" : "52,52,52";
    const hasCenterAvoid = centerAvoidRadius > 0;
    let draggedNodeIndex: number | null = null;
    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;

    const nodes: NodeState[] = Array.from({ length: model.count }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 2 + Math.random() * 2,
    }));

    const resize = () => {
      width = container.clientWidth;
      height = CANVAS_HEIGHT;
      centerX = width * 0.5;
      centerY = height * 0.5;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const ringRadius = Math.min(width, height) * 0.33;
      nodes.forEach((node, index) => {
        const angle = (index / Math.max(model.count, 1)) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
        const spread = ringRadius * (0.45 + Math.random() * 0.65);
        node.x = centerX + Math.cos(angle) * spread;
        node.y = centerY + Math.sin(angle) * spread;
        node.vx = (Math.random() - 0.5) * 0.4;
        node.vy = (Math.random() - 0.5) * 0.4;
      });

      animationStart = performance.now();
    };

    const getPointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const getRenderedNodePosition = (node: NodeState) => ({
      x: centerX + (node.x - centerX) * introFactor,
      y: centerY + (node.y - centerY) * introFactor,
    });

    const pickNodeAt = (x: number, y: number) => {
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        const rendered = getRenderedNodePosition(node);
        const dx = rendered.x - x;
        const dy = rendered.y - y;
        const hitRadius = node.radius + 8;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return index;
        }
      }
      return null;
    };

    const stepPhysics = (dt: number) => {
      const safeDt = Math.min(dt, 24);

      for (let i = 0; i < nodes.length; i += 1) {
        const nodeA = nodes[i];

        for (let j = i + 1; j < nodes.length; j += 1) {
          const nodeB = nodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          const repulse = REPULSION_STRENGTH / distSq;
          nodeA.vx -= nx * repulse;
          nodeA.vy -= ny * repulse;
          nodeB.vx += nx * repulse;
          nodeB.vy += ny * repulse;
        }
      }

      for (const edge of model.edges) {
        const from = nodes[edge.from];
        const to = nodes[edge.to];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const nx = dx / dist;
        const ny = dy / dist;
        const springForce = (dist - IDEAL_EDGE_DISTANCE) * SPRING_STRENGTH;

        from.vx += nx * springForce;
        from.vy += ny * springForce;
        to.vx -= nx * springForce;
        to.vy -= ny * springForce;
      }

      for (const node of nodes) {
        const perturbStrength = perturbStrengthRef.current;
        if (perturbStrength > 0.0001) {
          node.vx += (Math.random() - 0.5) * 1.25 * perturbStrength;
          node.vy += (Math.random() - 0.5) * 1.25 * perturbStrength;
        }

        node.vx += (centerX - node.x) * CENTER_PULL;
        node.vy += (centerY - node.y) * CENTER_PULL;

        if (hasCenterAvoid) {
          const fromCenterX = node.x - centerX;
          const fromCenterY = node.y - centerY;
          const distanceFromCenter = Math.sqrt(fromCenterX * fromCenterX + fromCenterY * fromCenterY) || 0.0001;
          const safeRadius = centerAvoidRadius + node.radius + 6;

          if (distanceFromCenter < safeRadius) {
            const nx = fromCenterX / distanceFromCenter;
            const ny = fromCenterY / distanceFromCenter;
            const push = (safeRadius - distanceFromCenter) * 0.08;

            node.vx += nx * push;
            node.vy += ny * push;
          }
        }

        node.vx += (Math.random() - 0.5) * RANDOM_NUDGE;
        node.vy += (Math.random() - 0.5) * RANDOM_NUDGE;

        node.vx *= DAMPING;
        node.vy *= DAMPING;

        node.x += node.vx * (safeDt / 16.67);
        node.y += node.vy * (safeDt / 16.67);

        const minX = 8;
        const minY = 8;
        const maxX = width - 8;
        const maxY = height - 8;

        if (node.x < minX) {
          node.x = minX;
          node.vx *= -0.55;
        } else if (node.x > maxX) {
          node.x = maxX;
          node.vx *= -0.55;
        }

        if (node.y < minY) {
          node.y = minY;
          node.vy *= -0.55;
        } else if (node.y > maxY) {
          node.y = maxY;
          node.vy *= -0.55;
        }
      }

      perturbStrengthRef.current *= 0.94;
    };

    const draw = (now: number) => {
      const elapsed = now - animationStart;
      const introProgress = Math.min(1, elapsed / INTRO_DURATION_MS);
      const intro = easeOutQuart(introProgress);
      introFactor = intro;

      context.clearRect(0, 0, width, height);

      const projectedX = (node: NodeState) => centerX + (node.x - centerX) * intro;
      const projectedY = (node: NodeState) => centerY + (node.y - centerY) * intro;

      for (const edge of model.edges) {
        const a = nodes[edge.from];
        const b = nodes[edge.to];
        const ax = projectedX(a);
        const ay = projectedY(a);
        const bx = projectedX(b);
        const by = projectedY(b);
        const crossesCenter =
          hasCenterAvoid &&
          segmentIntersectsCircle(
            ax,
            ay,
            bx,
            by,
            centerX,
            centerY,
            centerAvoidRadius + 8
          );

        context.lineWidth = edge.width;
        context.beginPath();

        if (crossesCenter) {
          const midX = (ax + bx) * 0.5;
          const midY = (ay + by) * 0.5;

          let normalX = midX - centerX;
          let normalY = midY - centerY;
          let normalLen = Math.sqrt(normalX * normalX + normalY * normalY);

          if (normalLen < 0.001) {
            normalX = -(by - ay);
            normalY = bx - ax;
            normalLen = Math.sqrt(normalX * normalX + normalY * normalY) || 1;
          }

          normalX /= normalLen;
          normalY /= normalLen;

          const controlRadius = centerAvoidRadius + 12;
          const controlX = centerX + normalX * controlRadius;
          const controlY = centerY + normalY * controlRadius;

          context.moveTo(ax, ay);
          context.quadraticCurveTo(controlX, controlY, bx, by);
        } else {
          context.moveTo(ax, ay);
          context.lineTo(bx, by);
        }

        context.strokeStyle = `rgba(${edgeRgb},${edge.alpha})`;
        context.stroke();
      }

      for (const node of nodes) {
        context.beginPath();
        context.arc(projectedX(node), projectedY(node), node.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(148, 148, 148, 0.55)";
        context.fill();
      }
    };

    const tick = (now: number) => {
      const dt = now - lastTick;
      lastTick = now;

      stepPhysics(dt);
      draw(now);
      frameId = window.requestAnimationFrame(tick);
    };

    const handlePointerDown = (event: PointerEvent) => {
      const pointer = getPointerPosition(event);
      const nodeIndex = pickNodeAt(pointer.x, pointer.y);
      if (nodeIndex === null) return;

      animationStart = performance.now() - INTRO_DURATION_MS;
      introFactor = 1;

      draggedNodeIndex = nodeIndex;
      activePointerId = event.pointerId;
      lastPointerX = pointer.x;
      lastPointerY = pointer.y;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const pointer = getPointerPosition(event);

      if (draggedNodeIndex !== null && activePointerId === event.pointerId) {
        const node = nodes[draggedNodeIndex];
        const deltaX = pointer.x - lastPointerX;
        const deltaY = pointer.y - lastPointerY;

        node.x = pointer.x;
        node.y = pointer.y;
        node.vx = deltaX * 0.35;
        node.vy = deltaY * 0.35;

        lastPointerX = pointer.x;
        lastPointerY = pointer.y;
        return;
      }

      const hoveredNode = pickNodeAt(pointer.x, pointer.y);
      canvas.style.cursor = hoveredNode !== null ? "grab" : "default";
    };

    const releasePointer = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) return;

      draggedNodeIndex = null;
      activePointerId = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.style.cursor = "default";
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);
    canvas.addEventListener("pointerleave", handlePointerMove);
    resize();
    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", releasePointer);
      canvas.removeEventListener("pointercancel", releasePointer);
      canvas.removeEventListener("pointerleave", handlePointerMove);
    };
  }, [model, centerAvoidRadius]);

  if (model.count === 0) return null;

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-[160px] w-full touch-none" />
    </div>
  );
};

export default AmbientKnowledgeGraph;
