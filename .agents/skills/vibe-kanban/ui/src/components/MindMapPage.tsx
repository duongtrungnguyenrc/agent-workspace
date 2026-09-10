import { useEffect, useMemo, useRef, useState } from "react";
import { formatStatus } from "../lib/format";
import {
  badgeToneClass,
  borderToneClass,
  fillToneClass,
  panelClass,
  statusTone,
  typeTone,
} from "../lib/styles";
import { projectTree, type TicketTreeNode } from "../lib/tree";
import type { TicketListItem } from "../types/kanban";
import { Badge } from "./Badge";

interface MindMapPageProps {
  tickets: TicketListItem[];
  onOpen: (id: number) => void;
}

interface GraphNode {
  id: string;
  node: TicketTreeNode;
  x: number;
  y: number;
}

interface GraphLink {
  id: string;
  source: GraphNode;
  target: GraphNode;
}

interface ViewportSize {
  width: number;
  height: number;
}

const xGap = 360;
const yGap = 160;
const nodeWidth = 280;
const nodeHeight = 150;
const fallbackViewport: ViewportSize = { width: 1180, height: 560 };

function toneFor(node: TicketTreeNode) {
  if (node.type === "task") return "teal";
  if (node.type === "feature") return "fuchsia";
  if (node.type === "orphan") return "amber";
  if (node.type === "project") return "violet";
  return "indigo";
}

function nodeKey(node: TicketTreeNode, path: string) {
  return node.ticket
    ? `${node.type}-${node.ticket.id}`
    : `${node.type}-${path}`;
}

function layoutTree(root: TicketTreeNode) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  let leafIndex = 0;

  function visit(node: TicketTreeNode, depth: number, path: string): GraphNode {
    const children = node.children || [];
    const childNodes = children.map((child, index) =>
      visit(child, depth + 1, `${path}-${index}`),
    );
    const y = childNodes.length
      ? childNodes.reduce((sum, child) => sum + child.y, 0) / childNodes.length
      : leafIndex++ * yGap;
    const graphNode: GraphNode = {
      id: nodeKey(node, path),
      node,
      x: depth * xGap,
      y,
    };
    nodes.push(graphNode);
    for (const child of childNodes) {
      links.push({
        id: `${graphNode.id}-${child.id}`,
        source: graphNode,
        target: child,
      });
    }
    return graphNode;
  }

  visit(root, 0, "root");
  const minY = Math.min(...nodes.map((node) => node.y), 0);
  const maxY = Math.max(...nodes.map((node) => node.y), 0);
  const maxX = Math.max(...nodes.map((node) => node.x), 0);
  const rootNode = nodes[nodes.length - 1] || { x: 0, y: 0 };

  return {
    nodes,
    links,
    width: maxX + nodeWidth + 180,
    height: maxY - minY + nodeHeight + 180,
    rootX: rootNode.x,
    rootY: rootNode.y,
  };
}

function zoomConfigForGraph(
  graph: ReturnType<typeof layoutTree>,
  viewport: ViewportSize,
) {
  const heightFactor = Math.max(1, graph.height / Math.max(viewport.height, 1));
  const widthFactor = Math.max(1, graph.width / Math.max(viewport.width, 1));
  const sizeFactor = Math.max(heightFactor, widthFactor);

  return {
    min: Math.max(
      0.012,
      Math.min(0.18, (viewport.height / Math.max(graph.height, 1)) * 0.72),
    ),
    max: Math.min(90, Math.max(10, 7 * Math.sqrt(sizeFactor))),
    wheelSpeed: Math.min(0.014, 0.0028 + heightFactor * 0.00038),
    stepFactor: Math.min(3.2, 1.45 + heightFactor * 0.08),
  };
}

function clampZoom(
  value: number,
  config: ReturnType<typeof zoomConfigForGraph>,
) {
  return Math.max(config.min, Math.min(value, config.max));
}

function initialView(
  graph: ReturnType<typeof layoutTree>,
  ticketCount: number,
  config: ReturnType<typeof zoomConfigForGraph>,
  viewport: ViewportSize,
) {
  const readableZoom =
    ticketCount <= 6
      ? 1.7
      : ticketCount <= 14
        ? 1.15
        : ticketCount <= 32
          ? 0.82
          : ticketCount <= 80
            ? 0.56
            : 0.42;
  const heightFitZoom = (viewport.height - 120) / Math.max(graph.height, 1);
  const widthFitZoom = (viewport.width - 180) / Math.max(graph.width, 1);
  const overviewZoom = Math.min(heightFitZoom, widthFitZoom) * 0.95;
  const zoom = clampZoom(Math.max(readableZoom, overviewZoom), config);
  return {
    x: viewport.width * 0.12 - graph.rootX * zoom,
    y: viewport.height * 0.5 - graph.rootY * zoom,
    zoom,
  };
}

function GraphCard({
  graphNode,
  onOpen,
}: {
  graphNode: GraphNode;
  onOpen: (id: number) => void;
}) {
  const { node } = graphNode;
  const tone = toneFor(node);
  const statusToneValue =
    node.status !== "project" ? statusTone[node.status] : "violet";
  const typeToneValue = node.ticket ? typeTone[node.ticket.type] : tone;

  return (
    <foreignObject
      width={nodeWidth}
      height={nodeHeight}
      x={graphNode.x - nodeWidth / 2}
      y={graphNode.y - nodeHeight / 2}
    >
      <div className="p-2">
        <button
          className={`grid h-full w-full content-start gap-2 overflow-hidden rounded-xl border border-l-4 p-3 text-left shadow-lg shadow-neutral-950/10 transition hover:-translate-y-0.5 ${borderToneClass(tone)}`}
          type="button"
          onClick={() => node.ticket && onOpen(node.ticket.id)}
        >
          <span className="truncate font-mono text-xs font-bold uppercase tracking-normal text-violet-700">
            {node.code}
          </span>
          <strong className="line-clamp-2 min-w-0 wrap-break-word truncate text-sm font-bold leading-5 text-neutral-950">
            {node.title}
          </strong>
          <span className="flex min-w-0 flex-wrap gap-1">
            <Badge tone={typeToneValue}>{node.typeLabel}</Badge>
            <Badge tone={statusToneValue}>
              {node.status === "project"
                ? node.statusLabel
                : formatStatus(node.status)}
            </Badge>
          </span>
          <span className="mt-auto grid grid-cols-[34px_minmax(0,1fr)] items-center gap-2">
            <span className="text-right text-xs font-bold text-neutral-500">
              {node.progress}%
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-white/80">
              <i
                className={`block h-full rounded-full ${fillToneClass(statusToneValue)}`}
                style={{ width: `${node.progress}%` }}
              />
            </span>
          </span>
        </button>
      </div>
    </foreignObject>
  );
}

export function MindMapPage({ tickets, onOpen }: MindMapPageProps) {
  const graph = useMemo(() => layoutTree(projectTree(tickets)), [tickets]);
  const [viewport, setViewport] = useState<ViewportSize>(fallbackViewport);
  const zoomConfig = useMemo(
    () => zoomConfigForGraph(graph, viewport),
    [graph, viewport],
  );
  const defaultView = useMemo(
    () => initialView(graph, tickets.length, zoomConfig, viewport),
    [graph, tickets.length, zoomConfig, viewport],
  );
  const [view, setView] = useState(defaultView);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    viewX: number;
    viewY: number;
  } | null>(null);
  const storyCount = tickets.filter((ticket) => ticket.type === "group").length;
  const useCaseCount = tickets.filter(
    (ticket) => ticket.type === "feature",
  ).length;
  const taskCount = tickets.filter((ticket) => ticket.type === "task").length;

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setViewport({
        width: Math.max(320, rect.width),
        height: Math.max(320, rect.height),
      });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = element.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      setView((current) => {
        const nextZoom = clampZoom(
          current.zoom * Math.exp(-event.deltaY * zoomConfig.wheelSpeed),
          zoomConfig,
        );
        const graphX = (localX - current.x) / current.zoom;
        const graphY = (localY - current.y) / current.zoom;
        return {
          x: localX - graphX * nextZoom,
          y: localY - graphY * nextZoom,
          zoom: nextZoom,
        };
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [graph.height, graph.width, zoomConfig]);

  return (
    <section className={`${panelClass} mb-4 overflow-hidden p-0`}>
      <header className="flex flex-col gap-3 border-b border-neutral-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="block font-mono text-xs font-bold uppercase tracking-normal text-violet-700">
            Project graph
          </span>
          <h2 className="m-0 mt-1 break-words text-base font-bold text-neutral-950">
            Story mindmap
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeToneClass("indigo")}`}
          >
            {storyCount} Stories
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeToneClass("fuchsia")}`}
          >
            {useCaseCount} Use cases
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeToneClass("teal")}`}
          >
            {taskCount} Tasks
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeToneClass("violet")}`}
          >
            {Math.round(view.zoom * 100)}% / max{" "}
            {Math.round(zoomConfig.max * 100)}%
          </span>
        </div>
      </header>

      <div
        className="relative h-[min(760px,calc(100vh-260px))] min-h-[560px] overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgb(212_212_212)_1px,transparent_0)] [background-size:22px_22px] overscroll-contain"
        ref={viewportRef}
      >
        {tickets.length ? (
          <>
            <div className="absolute right-3 top-3 z-10 flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <button
                className="min-h-9 px-3 text-sm font-bold text-neutral-700 hover:bg-neutral-100"
                type="button"
                onClick={() =>
                  setView((current) => ({
                    ...current,
                    zoom: clampZoom(
                      current.zoom / zoomConfig.stepFactor,
                      zoomConfig,
                    ),
                  }))
                }
              >
                -
              </button>
              <button
                className="min-h-9 border-x border-neutral-200 px-3 text-xs font-bold text-violet-700 hover:bg-violet-50"
                type="button"
                onClick={() => setView(defaultView)}
              >
                Reset
              </button>
              <button
                className="min-h-9 px-3 text-sm font-bold text-neutral-700 hover:bg-neutral-100"
                type="button"
                onClick={() =>
                  setView((current) => ({
                    ...current,
                    zoom: clampZoom(
                      current.zoom * zoomConfig.stepFactor,
                      zoomConfig,
                    ),
                  }))
                }
              >
                +
              </button>
            </div>
            <svg
              className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
              role="img"
              viewBox={`0 0 ${viewport.width} ${viewport.height}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  viewX: view.x,
                  viewY: view.y,
                };
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                setView((current) => ({
                  ...current,
                  x: drag.viewX + event.clientX - drag.x,
                  y: drag.viewY + event.clientY - drag.y,
                }));
              }}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
            >
              <g
                transform={`translate(${view.x}, ${view.y}) scale(${view.zoom})`}
              >
                {graph.links.map((link) => (
                  <path
                    className="fill-none stroke-neutral-300 stroke-[2.5]"
                    d={`M ${link.source.x + nodeWidth / 2} ${link.source.y} C ${link.source.x + nodeWidth / 2 + 70} ${link.source.y}, ${link.target.x - nodeWidth / 2 - 70} ${link.target.y}, ${link.target.x - nodeWidth / 2} ${link.target.y}`}
                    key={link.id}
                  />
                ))}
                {graph.nodes.map((node) => (
                  <GraphCard graphNode={node} key={node.id} onOpen={onOpen} />
                ))}
              </g>
            </svg>
          </>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div className="grid gap-1">
              <strong className="text-base font-bold text-neutral-950">
                No tickets to visualize
              </strong>
              <span className="text-sm text-neutral-500">
                Create a group ticket with use cases and tasks to populate the
                map.
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
