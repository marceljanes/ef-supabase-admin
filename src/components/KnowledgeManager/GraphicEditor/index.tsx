import React, { useMemo, useRef, useState, useCallback } from "react";
import type { GraphicEditorProps, GridShape, Point } from "./types";

/**
 * Minimal, self-contained GraphicEditor implementation.
 * - Renders rect, text, line/arrow using SVG
 * - Read-only by default (document view). When isEditable is true, supports basic dragging (translate) for all shapes.
 * - Calls onChange with updated shapes when editing.
 * - Does NOT depend on any other local files to avoid missing-module issues.
 */

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 500;

function toPointsAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function translatePoints(points: Point[], dx: number, dy: number): Point[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

function getShapeXY(shape: GridShape): { x?: number; y?: number } {
  if ("x" in shape && "y" in shape) {
    return { x: (shape as any).x, y: (shape as any).y };
  }
  return {};
}

type DragState =
  | null
  | {
      id: string;
      start: { x: number; y: number };
      last: { x: number; y: number };
    };

const GraphicEditor: React.FC<GraphicEditorProps> = ({
  shapes,
  onChange,
  isEditable = false,
  theme = "dark",
  layout = "default",
}) => {
  // Normalize shapes to always have an id for stable dragging
  const normalizedShapes = useMemo<GridShape[]>(
    () =>
      (Array.isArray(shapes) ? shapes : []).map((s, i) => ({
        id: (s as any).id ?? `shape-${i}`,
        ...s,
      })),
    [shapes]
  );

  const [localShapes, setLocalShapes] = useState<GridShape[]>(normalizedShapes);
  const [drag, setDrag] = useState<DragState>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Keep local state in sync if external changes arrive (e.g., when switching chunks)
  React.useEffect(() => {
    setLocalShapes(normalizedShapes);
  }, [normalizedShapes]);

  const bg = theme === "light" ? "#ffffff" : "#0b0b0f";
  const fg = theme === "light" ? "#111827" : "#e5e7eb";
  const gridStroke = theme === "light" ? "#e5e7eb" : "#27272a";
  const rectFill = theme === "light" ? "#e0f2fe" : "#0ea5e9";
  const rectStroke = theme === "light" ? "#0284c7" : "#7dd3fc";

  const width = layout === "compact" ? Math.min(DEFAULT_WIDTH, 800) : DEFAULT_WIDTH;
  const height = layout === "compact" ? Math.min(DEFAULT_HEIGHT, 420) : DEFAULT_HEIGHT;

  const commitChange = useCallback(
    (next: GridShape[]) => {
      setLocalShapes(next);
      if (onChange) onChange(next as any[]);
    },
    [onChange]
  );

  const getMousePos = (evt: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = (svg as any).createSVGPoint ? (svg as any).createSVGPoint() : null;
    if (pt) {
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm && (ctm as any).inverse) {
        const cursorPt = pt.matrixTransform(ctm.inverse());
        return { x: cursorPt.x, y: cursorPt.y };
      }
    }
    // Fallback approximate position
    const rect = svg.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const onMouseDownShape = (evt: React.MouseEvent, shapeId: string) => {
    if (!isEditable) return;
    evt.stopPropagation();
    const pos = getMousePos(evt);
    setDrag({
      id: shapeId,
      start: pos,
      last: pos,
    });
  };

  const onMouseMove = (evt: React.MouseEvent) => {
    if (!isEditable || !drag) return;
    const pos = getMousePos(evt);
    const dx = pos.x - drag.last.x;
    const dy = pos.y - drag.last.y;
    if (dx === 0 && dy === 0) return;

    const next = localShapes.map((s) => {
      if ((s as any).id !== drag.id) return s;

      // Translate by dx, dy depending on type
      if ((s as any).type === "rect" || (s as any).type === "text") {
        const { x, y } = getShapeXY(s);
        return { ...(s as any), x: (x || 0) + dx, y: (y || 0) + dy };
      }
      if ((s as any).type === "arrow" || (s as any).type === "line") {
        const pts = Array.isArray((s as any).points) ? (s as any).points : [];
        return { ...(s as any), points: translatePoints(pts, dx, dy) };
      }
      // Unknown shape - best-effort translate x/y if present
      if ("x" in (s as any) && "y" in (s as any)) {
        return { ...(s as any), x: (s as any).x + dx, y: (s as any).y + dy };
      }
      return s;
    });

    setDrag((d) => (d ? { ...d, last: pos } : d));
    commitChange(next);
  };

  const onMouseUp = () => {
    if (!isEditable) return;
    setDrag(null);
  };

  return (
    <div
      className={`w-full overflow-auto ${
        layout === "compact" ? "rounded-md" : "rounded-lg"
      }`}
      style={{
        border: theme === "light" ? "1px solid #e5e7eb" : "1px solid #3f3f46",
        background: theme === "light" ? "#f8fafc" : "#0a0a0b",
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block", background: bg, cursor: isEditable ? "grab" : "default" }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={fg} />
          </marker>
        </defs>

        {/* Grid background */}
        <g opacity={theme === "light" ? 0.5 : 0.2}>
          {Array.from({ length: Math.floor(width / 20) + 1 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 20}
              y1={0}
              x2={i * 20}
              y2={height}
              stroke={gridStroke}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: Math.floor(height / 20) + 1 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * 20}
              x2={width}
              y2={i * 20}
              stroke={gridStroke}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Shapes */}
        {localShapes.map((shape: GridShape, idx: number) => {
          const sid = (shape as any).id ?? `shape-${idx}`;
          const type = (shape as any).type;

          if (type === "rect") {
            const x = (shape as any).x ?? 0;
            const y = (shape as any).y ?? 0;
            const w = (shape as any).width ?? 120;
            const h = (shape as any).height ?? 60;
            const label = (shape as any).label ?? "";
            return (
              <g
                key={sid}
                onMouseDown={(e) => onMouseDownShape(e, sid)}
                style={{ cursor: isEditable ? "move" : "default" }}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={8}
                  ry={8}
                  fill={rectFill}
                  stroke={rectStroke}
                  strokeWidth={2}
                  opacity={(shape as any).opacity ?? 1}
                />
                {label && (
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    fill={fg}
                    fontSize={14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ userSelect: "none" }}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          }

          if (type === "text") {
            const x = (shape as any).x ?? 0;
            const y = (shape as any).y ?? 0;
            const text = (shape as any).text ?? "";
            return (
              <text
                key={sid}
                x={x}
                y={y}
                fill={fg}
                fontSize={14}
                onMouseDown={(e) => onMouseDownShape(e, sid)}
                style={{ cursor: isEditable ? "move" : "default", userSelect: "none" }}
              >
                {text}
              </text>
            );
          }

          if (type === "arrow" || type === "line") {
            const pts = Array.isArray((shape as any).points) ? (shape as any).points : [];
            return (
              <polyline
                key={sid}
                points={toPointsAttr(pts)}
                fill="none"
                stroke={fg}
                strokeWidth={2}
                markerEnd={type === "arrow" ? "url(#arrowhead)" : undefined}
                onMouseDown={(e) => onMouseDownShape(e, sid)}
                style={{ cursor: isEditable ? "move" : "default" }}
              />
            );
          }

          // Unknown shape - attempt to render as faint circle or ignore
          if ("x" in (shape as any) && "y" in (shape as any)) {
            const x = (shape as any).x ?? 0;
            const y = (shape as any).y ?? 0;
            return (
              <circle
                key={sid}
                cx={x}
                cy={y}
                r={6}
                fill={fg}
                opacity={0.4}
                onMouseDown={(e) => onMouseDownShape(e, sid)}
                style={{ cursor: isEditable ? "move" : "default" }}
              />
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
};

export { GraphicEditor };
export default GraphicEditor;
