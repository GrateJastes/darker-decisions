import { useCallback, useState } from "react";
import type { ParamSchema, ParamValues } from "@models/types";
import { decode, encode } from "./url-codec";

export function useParams<S extends ParamSchema>(schema: S) {
  const [values, setValues] = useState<ParamValues<S>>(() => decode(schema, window.location.search));

  const setMany = useCallback(
    (patch: Partial<ParamValues<S>>) => {
      setValues((prev) => {
        const next = { ...prev, ...patch };
        window.history.replaceState(null, "", window.location.pathname + encode(schema, next));
        return next;
      });
    },
    [schema],
  );

  const setParam = useCallback(
    <K extends keyof S>(key: K, value: ParamValues<S>[K]) =>
      setMany({ [key]: value } as unknown as Partial<ParamValues<S>>),
    [setMany],
  );

  return [values, setParam, setMany] as const;
}
