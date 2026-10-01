import { describe, expect, it } from "vitest";
import type { ParamSchema } from "@models/types";
import { decode, encode } from "./url-codec";

const schema = {
  n: { kind: "number", label: "n", min: 0, max: 1, step: 0.005, default: 0.3, unit: "percent" },
  s: {
    kind: "select",
    label: "s",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
    default: "a",
  },
  t: { kind: "toggle", label: "t", default: false },
} as const satisfies ParamSchema;

describe("url codec", () => {
  it("omits defaults", () => {
    expect(encode(schema, { n: 0.3, s: "a", t: false })).toBe("");
  });

  it("round-trips values", () => {
    const v = { n: 0.4555, s: "b", t: true };
    expect(decode(schema, encode(schema, v))).toEqual(v);
  });

  it("rejects garbage and clamps out-of-range numbers", () => {
    expect(decode(schema, "?n=abc&s=zzz&t=maybe")).toEqual({ n: 0.3, s: "a", t: false });
    expect(decode(schema, "?n=5").n).toBe(1);
  });
});
