import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { X } from "lucide-react";
import { ARCHETYPES, type Respondent } from "@/lib/om";
import { PersonCard } from "./PeopleSection";

type GNode = {
  id: string;
  kind: "person" | "tool";
  label: string;
  r: number;
  person?: Respondent;
  users?: string[];
  phoneFirst?: boolean;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};
type GLink = {
  source: string | GNode;
  target: string | GNode;
  kind: "waits" | "uses" | "rekey";
};

function readColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    bg: v("--graph-bg"),
    cream: v("--graph-cream"),
    creamDeep: v("--graph-cream-deep"),
    sage: v("--graph-sage"),
    peach: v("--graph-peach"),
    terracotta: v("--graph-terracotta"),
    gold: v("--graph-gold"),
  };
}
type Colors = ReturnType<typeof readColors>;

function archetypeColor(c: Colors, name: string) {
  switch (name) {
    case "The Anchor":
      return c.cream;
    case "The Editor":
      return c.creamDeep;
    case "The Architect":
      return c.sage;
    case "The Switchboard":
      return c.peach;
    case "The Closer":
      return c.terracotta;
    case "The Sprinter":
      return c.gold;
    default:
      return c.cream;
  }
}

function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const idOf = (n: string | GNode) => (typeof n === "string" ? n : n.id);

export default function PeopleGraph({ respondents }: { respondents: Respondent[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(undefined);
  const [width, setWidth] = useState(800);
  const [isMobile, setIsMobile] = useState(false);
  const [hover, setHover] = useState<GNode | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Respondent | null>(null);
  const [colors, setColors] = useState<Colors | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setColors(readColors());
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setIsMobile(window.innerWidth < 1024);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setHover(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const height = isMobile ? 420 : 560;

  const data = useMemo(() => {
    const base = isMobile ? 11 : 14;
    const byName = new Map(respondents.map((r) => [r.first_name.trim().toLowerCase(), r]));
    const waitCount = new Map<string, number>();
    const links: GLink[] = [];
    for (const r of respondents) {
      const target = byName.get((r.waits_on ?? "").trim().toLowerCase());
      if (target && target.id !== r.id) {
        waitCount.set(target.id, (waitCount.get(target.id) ?? 0) + 1);
        links.push({ source: `p:${r.id}`, target: `p:${target.id}`, kind: "waits" });
      }
    }
    const toolUsers = new Map<string, string[]>();
    for (const r of respondents) {
      for (const t of r.tools) toolUsers.set(t, [...(toolUsers.get(t) ?? []), r.first_name]);
      for (const t of r.rekey_pair ?? []) if (t && !toolUsers.has(t)) toolUsers.set(t, []);
    }
    const nodes: GNode[] = respondents.map((r) => ({
      id: `p:${r.id}`,
      kind: "person",
      label: r.first_name,
      r: base + 2 * (waitCount.get(r.id) ?? 0),
      person: r,
      phoneFirst:
        (r.seniority === "Founder or partner" || r.seniority === "Lead or manager") &&
        (r.channel_urgent === "Phone call" || r.channel_urgent === "Text message"),
    }));
    for (const [tool, users] of toolUsers) {
      nodes.push({
        id: `t:${tool}`,
        kind: "tool",
        label: tool,
        r: Math.min(11, 5 + users.length),
        users,
      });
    }
    for (const r of respondents) {
      const pair = new Set((r.rekey_pair ?? []).filter(Boolean));
      for (const t of r.tools) {
        if (!pair.has(t)) links.push({ source: `p:${r.id}`, target: `t:${t}`, kind: "uses" });
      }
      for (const t of pair) links.push({ source: `p:${r.id}`, target: `t:${t}`, kind: "rekey" });
    }
    return { nodes, links };
  }, [respondents, isMobile]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-180);
    fg.d3Force("link")?.distance((l: GLink) => (l.kind === "waits" ? 110 : 60));
    fg.d3ReheatSimulation();
  }, [data]);

  const neighbors = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover.id]);
    for (const l of data.links) {
      const s = idOf(l.source);
      const t = idOf(l.target);
      if (s === hover.id) set.add(t);
      if (t === hover.id) set.add(s);
    }
    return set;
  }, [hover, data]);

  const linkActive = useCallback(
    (l: GLink) => !hover || idOf(l.source) === hover.id || idOf(l.target) === hover.id,
    [hover],
  );

  const drawNode = useCallback(
    (node: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
      if (!colors || node.x == null || node.y == null) return;
      const dim = neighbors && !neighbors.has(node.id);
      ctx.globalAlpha = dim ? 0.25 : 1;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      if (node.kind === "person") {
        ctx.fillStyle = archetypeColor(colors, node.person!.archetype);
        ctx.fill();
        if (node.phoneFirst) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = colors.peach;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.font = `12px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = colors.cream;
        ctx.fillText(node.label, node.x, node.y + node.r + (node.phoneFirst ? 6 : 4));
      } else {
        ctx.strokeStyle = alpha(colors.cream, 0.55);
        ctx.lineWidth = 1;
        ctx.stroke();
        const show = hover?.id === node.id || scale > 1.4 || (node.users?.length ?? 0) >= 3;
        if (show) {
          ctx.font = `10px "DM Mono", monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = alpha(colors.cream, 0.7);
          ctx.fillText(node.label, node.x, node.y + node.r + 3);
        }
      }
      ctx.globalAlpha = 1;
    },
    [colors, neighbors, hover],
  );

  const paintArea = useCallback((node: GNode, color: string, ctx: CanvasRenderingContext2D) => {
    if (node.x == null || node.y == null) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const linkColor = (l: GLink) => {
    if (!colors) return "transparent";
    const f = linkActive(l) ? 1 : 0.25;
    if (l.kind === "waits") return alpha(colors.terracotta, f);
    if (l.kind === "rekey") return alpha(colors.peach, 0.6 * f);
    return alpha(colors.cream, 0.18 * (hover && linkActive(l) ? 3 : f));
  };

  const center = () => fgRef.current?.zoomToFit(400, 40);

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-xl bg-forest-deep"
        style={{ height }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {colors ? (
          <ForceGraph2D
            ref={fgRef}
            width={width}
            height={height}
            graphData={data}
            backgroundColor={colors.bg}
            nodeRelSize={1}
            nodeCanvasObject={(n, ctx, s) => drawNode(n as GNode, ctx, s)}
            nodePointerAreaPaint={(n, c, ctx) => paintArea(n as GNode, c, ctx)}
            linkColor={(l) => linkColor(l as GLink)}
            linkWidth={(l) => {
              const k = (l as GLink).kind;
              return k === "rekey" ? 2 : k === "waits" ? 1.5 : 1;
            }}
            linkLineDash={(l) => ((l as GLink).kind === "rekey" ? [4, 3] : null)}
            linkDirectionalArrowLength={(l) => ((l as GLink).kind === "waits" ? 6 : 0)}
            linkDirectionalArrowRelPos={0.92}
            cooldownTime={3000}
            onEngineStop={() => undefined}
            onZoom={({ k }) => setZoom(k)}
            onNodeHover={(n) => setHover((n as GNode) ?? null)}
            onNodeClick={(n) => {
              const node = n as GNode;
              if (node.kind === "person") setSelected(node.person!);
            }}
            onBackgroundClick={() => {
              setSelected(null);
              setHover(null);
            }}
            onNodeDragEnd={(n) => {
              const node = n as GNode;
              if (node.x != null) node.fx = node.x;
              if (node.y != null) node.fy = node.y;
            }}
          />
        ) : null}
        <button
          onClick={center}
          className="absolute right-3 top-3 rounded-full border border-cream/30 bg-forest-deep/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-cream"
        >
          Reset view
        </button>
        {respondents.length === 1 ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-cream">
            Invite the team to see the connections
          </p>
        ) : null}
        {hover && !selected ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[240px] rounded-lg border bg-cream p-3 text-xs text-ink shadow-lg"
            style={{
              left: Math.min(mouse.x + 14, width - 250),
              top: Math.min(mouse.y + 14, height - 120),
            }}
          >
            {hover.kind === "person" ? (
              <>
                <p className="font-display text-base text-forest">{hover.person!.first_name}</p>
                <p className="text-ink-soft">
                  {hover.person!.role_title || hover.person!.function} · {hover.person!.archetype}
                </p>
                <p className="mt-1 text-ink-soft">
                  {hover.person!.channel_routine} / {hover.person!.channel_sameday} /{" "}
                  {hover.person!.channel_urgent}
                </p>
              </>
            ) : (
              <>
                <p className="font-mono uppercase tracking-widest text-forest">{hover.label}</p>
                <p className="text-ink-soft">Used by {hover.users?.length ?? 0}</p>
                {hover.users?.length ? (
                  <p className="text-ink-soft">{hover.users.join(", ")}</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {selected ? (
          <div
            className={
              isMobile
                ? "absolute inset-x-0 bottom-0 z-20 max-h-[75%] overflow-y-auto rounded-t-2xl bg-cream p-4 shadow-2xl animate-in slide-in-from-bottom"
                : "absolute inset-y-0 right-0 z-20 w-[360px] overflow-y-auto bg-cream p-4 shadow-2xl animate-in slide-in-from-right"
            }
          >
            <button
              aria-label="Close"
              onClick={() => setSelected(null)}
              className="mb-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-cream-deep"
            >
              <X className="h-4 w-4" />
            </button>
            <PersonCard person={selected} extended />
          </div>
        ) : null}
        <span className="sr-only">Zoom {zoom.toFixed(1)}</span>
      </div>
      <Legend colors={colors} />
    </div>
  );
}

function Legend({ colors }: { colors: Colors | null }) {
  if (!colors) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-soft">
      {ARCHETYPES.map((a) => (
        <span key={a.name} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full border border-ink-soft/30"
            style={{ background: archetypeColor(colors, a.name) }}
          />
          {a.name.replace("The ", "")}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-5" style={{ background: colors.terracotta }} />
        waits on
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-px w-5 bg-ink-soft/50" />
        uses
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block w-5 border-t-2 border-dashed"
          style={{ borderColor: colors.peach }}
        />
        re-keys between
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-3 w-3 rounded-full border-[1.5px]"
          style={{ borderColor: colors.peach }}
        />
        phone-first decider
      </span>
    </div>
  );
}
