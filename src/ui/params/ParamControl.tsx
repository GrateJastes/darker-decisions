import { Select } from "../Select";
import { Slider } from "../Slider";
import { Toggle } from "../Toggle";
import type { DisplayUnit } from "../format";

export type ControlDef =
  | {
      kind: "number";
      label: string;
      min: number;
      max: number;
      step: number;
      unit: DisplayUnit;
      sticky?: readonly number[];
      hint?: string;
    }
  | { kind: "select"; label: string; options: readonly { value: string; label: string }[]; hint?: string }
  | { kind: "toggle"; label: string; hint?: string };

export function ParamControl({
  def,
  value,
  onChange,
}: {
  def: ControlDef;
  value: number | string | boolean;
  onChange: (v: number | string | boolean) => void;
}) {
  switch (def.kind) {
    case "number":
      return <Slider {...def} hint={def.hint} value={value as number} onChange={onChange} />;
    case "select":
      return <Select {...def} hint={def.hint} value={value as string} onChange={onChange} />;
    case "toggle":
      return <Toggle {...def} hint={def.hint} value={value as boolean} onChange={onChange} />;
  }
}
