import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTick, formatValue, type DisplayUnit } from "../format";

export interface ChartAxis {
  label: string;
  unit: DisplayUnit;
  domain?: readonly [number, number] | undefined;
  ticks?: readonly number[] | undefined;
}

export interface ChartSeries {
  id: string;
  label: string;
  points: readonly { x: number; y: number }[];
  emphasis: "primary" | "secondary";
  dashed?: boolean | undefined;
}

export interface ChartBand {
  id: string;
  label: string;
  points: readonly { x: number; lo: number; hi: number }[];
}

export type ChartMarker =
  | { kind: "hline"; y: number; label?: string }
  | { kind: "vline"; x: number; label?: string }
  | { kind: "point"; x: number; y: number; label?: string }
  | { kind: "xband"; x1: number; x2: number; label?: string }
  | { kind: "text"; x: number; y: number; text: string };

export interface ChartViewProps {
  x: ChartAxis;
  y: ChartAxis;
  series: readonly ChartSeries[];
  bands?: readonly ChartBand[] | undefined;
  markers: readonly ChartMarker[];
  height?: number;
}

const Y_AXIS_WIDTH = 60;
const MARGIN = { top: 12, right: 24, left: 4, bottom: 28 };
const SLIDER_THUMB_RADIUS = 7;

export const PLOT_INSET = {
  left: MARGIN.left + Y_AXIS_WIDTH - SLIDER_THUMB_RADIUS,
  right: MARGIN.right - SLIDER_THUMB_RADIUS,
};

const PRIMARY = "var(--color-accent-hot)";
const secondaryColors = ["series-1", "series-2", "series-3", "series-4", "series-5"].map(
  (c) => `var(--color-${c})`,
);
const axisTick = { fill: "var(--color-ink-dim)", fontSize: 11, fontFamily: "var(--font-serif)" };
const axisLabel = {
  fill: "var(--color-ink)",
  fontSize: 11,
  fontFamily: "var(--font-display)",
  letterSpacing: "0.15em",
};
const markerLabel = (value: string, position: "insideTopLeft" | "insideTopRight" | "insideTop") => ({
  label: { value, position, fill: "var(--color-ink-faint)", fontSize: 11 },
});

interface LegendItem {
  id: string;
  label: string;
  color: string;
  kind: "line" | "band";
  dashed?: boolean | undefined;
}

function legendItems(series: readonly ChartSeries[], bands: readonly ChartBand[]): LegendItem[] {
  let next = 0;
  const pick = () => secondaryColors[next++ % secondaryColors.length] ?? "var(--color-ink-dim)";
  const primary = series.filter((s) => s.emphasis === "primary");
  const secondary = series.filter((s) => s.emphasis === "secondary");
  return [
    ...primary.map((s) => ({ id: s.id, label: s.label, color: PRIMARY, kind: "line" as const })),
    ...bands.map((b) => ({ id: b.id, label: b.label, color: pick(), kind: "band" as const })),
    ...secondary.map((s) => ({
      id: s.id,
      label: s.label,
      color: pick(),
      kind: "line" as const,
      dashed: s.dashed,
    })),
  ];
}

export function ChartView({ x, y, series, bands = [], markers, height = 340 }: ChartViewProps) {
  const legend = legendItems(series, bands);
  const color = (id: string) => legend.find((l) => l.id === id)?.color ?? "var(--color-ink-dim)";
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={MARGIN}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={x.domain ? [...x.domain] : ["dataMin", "dataMax"]}
              allowDuplicatedCategory={false}
              {...(x.ticks ? { ticks: [...x.ticks] } : {})}
              stroke="var(--color-ink-dim)"
              tick={axisTick}
              tickFormatter={(v: number) => formatTick(v, x.unit)}
              label={{ value: x.label, position: "insideBottom", offset: -16, style: axisLabel }}
            />
            <YAxis
              type="number"
              width={Y_AXIS_WIDTH}
              domain={y.domain ? [...y.domain] : [0, "auto"]}
              allowDataOverflow={y.domain !== undefined}
              {...(y.ticks ? { ticks: [...y.ticks] } : {})}
              stroke="var(--color-ink-dim)"
              tick={axisTick}
              tickFormatter={(v: number) => formatTick(v, y.unit)}
              label={{
                value: y.label,
                angle: -90,
                position: "insideLeft",
                offset: 12,
                style: { ...axisLabel, textAnchor: "middle" },
              }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-bg)",
                border: "1px solid var(--color-accent)",
                borderRadius: 0,
                fontFamily: "var(--font-serif)",
              }}
              labelStyle={{ color: "var(--color-accent)", fontFamily: "var(--font-display)", fontSize: 11 }}
              itemStyle={{ color: "var(--color-ink)" }}
              labelFormatter={(v) => `${x.label}: ${formatValue(Number(v), x.unit)}`}
              formatter={(v) =>
                Array.isArray(v)
                  ? v.map((n) => formatValue(Number(n), y.unit)).join(" – ")
                  : formatValue(Number(v), y.unit)
              }
              cursor={{ stroke: "var(--color-ink-faint)", strokeDasharray: "2 4" }}
            />
            {markers
              .filter((m) => m.kind === "xband")
              .map((m, i) => (
                <ReferenceArea
                  key={`xband-${i}`}
                  x1={m.x1}
                  x2={m.x2}
                  fill="var(--color-blood)"
                  fillOpacity={0.18}
                  stroke="none"
                  {...(m.label ? markerLabel(m.label, "insideTop") : {})}
                />
              ))}
            {bands.map((b) => (
              <Area
                key={b.id}
                data={b.points.map((p) => ({ x: p.x, range: [p.lo, p.hi] }))}
                dataKey="range"
                name={b.label}
                type="linear"
                stroke={color(b.id)}
                strokeWidth={1}
                fill={color(b.id)}
                fillOpacity={0.3}
                isAnimationActive={false}
              />
            ))}
            {[...series]
              .sort((a, b) => (a.emphasis === b.emphasis ? 0 : a.emphasis === "primary" ? 1 : -1))
              .map((s) => {
                const primary = s.emphasis === "primary";
                return (
                  <Line
                    key={s.id}
                    data={[...s.points]}
                    dataKey="y"
                    name={s.label}
                    type="linear"
                    stroke={color(s.id)}
                    strokeWidth={primary ? 2.5 : 1.25}
                    strokeOpacity={primary ? 1 : 0.8}
                    {...(s.dashed ? { strokeDasharray: "5 4" } : {})}
                    dot={false}
                    isAnimationActive={false}
                  />
                );
              })}
            {markers.map((m, i) => {
              switch (m.kind) {
                case "hline":
                  return (
                    <ReferenceLine
                      key={i}
                      y={m.y}
                      stroke="var(--color-ink-faint)"
                      strokeDasharray="4 4"
                      {...(m.label ? markerLabel(m.label, "insideTopRight") : {})}
                    />
                  );
                case "vline":
                  return (
                    <ReferenceLine
                      key={i}
                      x={m.x}
                      stroke="var(--color-ink-faint)"
                      strokeDasharray="2 4"
                      {...(m.label ? markerLabel(m.label, "insideTopLeft") : {})}
                    />
                  );
                case "point":
                  return (
                    <ReferenceDot
                      key={i}
                      x={m.x}
                      y={m.y}
                      r={6}
                      fill="var(--color-blood)"
                      stroke="var(--color-accent-hot)"
                      strokeWidth={2}
                    />
                  );
                case "xband":
                  return null;
                case "text":
                  return (
                    <ReferenceDot
                      key={i}
                      x={m.x}
                      y={m.y}
                      r={0}
                      fill="none"
                      stroke="none"
                      label={{
                        value: m.text,
                        position: "center",
                        fill: "var(--color-ink-dim)",
                        fontSize: 12,
                        fontFamily: "var(--font-display)",
                        letterSpacing: "0.12em",
                      }}
                    />
                  );
              }
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={legend} />
    </div>
  );
}

function Legend({ items }: { items: readonly LegendItem[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-xs text-ink-dim">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          <span
            className={item.kind === "band" ? "inline-block h-2.5 w-4 opacity-60" : "inline-block h-0.5 w-4"}
            style={
              item.dashed
                ? { background: `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)` }
                : { background: item.color }
            }
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
