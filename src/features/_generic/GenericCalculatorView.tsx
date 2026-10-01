import { useMemo, type CSSProperties } from "react";
import { currentData } from "@data/index";
import {
  activePreset,
  layout,
  presetPatch,
  resolveParams,
  type CalculatorModel,
  type LayoutSection,
  type ParamDef,
  type ParamSchema,
  type ParamValues,
  type PresetGroup,
} from "@models/types";
import { useParams } from "@state/useParams";
import { ChartView, PLOT_INSET } from "@ui/chart/ChartView";
import { Combobox } from "@ui/Combobox";
import { Panel } from "@ui/Panel";
import { ParamControl } from "@ui/params/ParamControl";
import { Readout } from "@ui/Readout";
import { Select } from "@ui/Select";
import { VerdictBanner } from "@ui/VerdictBanner";
import { formatQuantity, presentStatement } from "./present";

export function GenericCalculatorView<S extends ParamSchema>({ model }: { model: CalculatorModel<S> }) {
  const [values, setParam, setMany] = useParams(model.params);
  const resolved = useMemo(() => resolveParams(model.params, values, currentData), [model, values]);
  const result = useMemo(() => model.compute(resolved.values, currentData), [model, resolved]);
  const sections = useMemo(() => layout(model), [model]);

  const renderSection = (section: LayoutSection<S>) => (
    <div key={section.id} className="mb-2">
      {section.label && (
        <h3 className="mt-0 mb-3 border-b border-border pb-1 font-display text-[11px] tracking-[0.2em] text-ink-dim uppercase">
          {section.label}
        </h3>
      )}
      <div
        className={
          section.columns && section.columns > 1
            ? "grid gap-x-8 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            : ""
        }
        style={section.columns ? ({ "--cols": section.columns } as CSSProperties) : undefined}
      >
        {section.items.map((item) =>
          item.kind === "preset" ? (
            <PresetSelect
              key={`preset-${item.preset.id}`}
              group={item.preset}
              values={resolved.values}
              onApply={setMany}
            />
          ) : (
            <ParamControl
              key={item.key}
              def={withBounds(model.params[item.key]!, resolved.bounds[item.key])}
              value={resolved.values[item.key] as ParamValues<S>[keyof S]}
              onChange={(v) => setParam(item.key, v as ParamValues<S>[keyof S])}
            />
          ),
        )}
      </div>
    </div>
  );

  const inputSections = sections.filter((s) => s.placement === "inputs");
  const chartSections = sections.filter((s) => s.placement === "chart");

  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <h1 className="m-0 font-display text-2xl font-bold tracking-wider text-ink sm:text-3xl">
          {model.title}
        </h1>
        <p className="mt-2 text-base text-ink-dim italic">{model.question}</p>
      </header>

      <VerdictBanner
        headline={presentStatement(result.verdict.headline)}
        details={result.verdict.details.map(presentStatement)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Inputs">{inputSections.map(renderSection)}</Panel>

        <div className="flex flex-col gap-6 lg:col-span-2">
          {result.charts.map((c, i) => (
            <Panel key={c.id} title={c.title}>
              <ChartView x={c.x} y={c.y} series={c.series} bands={c.bands} markers={c.markers} />
              {i === 0 && chartSections.length > 0 && (
                <div
                  className="mt-4"
                  style={{ paddingLeft: PLOT_INSET.left, paddingRight: PLOT_INSET.right }}
                >
                  {chartSections.map(renderSection)}
                </div>
              )}
            </Panel>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {result.readouts.map((r) => (
          <Readout key={r.id} label={r.label} value={formatQuantity(r.value)} hint={r.hint} />
        ))}
      </div>
    </div>
  );
}

function withBounds<D extends ParamDef>(def: D, bounds: readonly [number, number] | undefined): D {
  return bounds && def.kind === "number" ? { ...def, min: bounds[0], max: bounds[1] } : def;
}

const CUSTOM = "__custom";

function PresetSelect<S extends ParamSchema>({
  group,
  values,
  onApply,
}: {
  group: PresetGroup<S>;
  values: ParamValues<S>;
  onApply: (patch: Partial<ParamValues<S>>) => void;
}) {
  const active = activePreset(group, values);
  const apply = (v: string) => {
    const option = group.options.find((o) => o.value === v);
    if (option) onApply(presetPatch(group, option));
  };
  if (group.searchable) {
    return (
      <Combobox
        label={group.label}
        hint={group.hint}
        value={active}
        options={group.options.map((o) => ({ value: o.value, label: o.label, group: o.group }))}
        onChange={apply}
      />
    );
  }
  const options = group.options.map((o) => ({ value: o.value, label: o.label }));
  return (
    <Select
      label={group.label}
      hint={group.hint}
      value={active ?? CUSTOM}
      options={active === undefined ? [{ value: CUSTOM, label: "Custom" }, ...options] : options}
      onChange={apply}
    />
  );
}
