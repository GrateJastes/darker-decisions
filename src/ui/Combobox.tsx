import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Field } from "./Field";

export interface ComboOption {
  value: string;
  label: string;
  group?: string | undefined;
}

export interface ComboboxProps {
  label: string;
  value: string | undefined;
  options: readonly ComboOption[];
  placeholder?: string;
  hint?: string | undefined;
  onChange: (value: string) => void;
}

function filterOptions(options: readonly ComboOption[], query: string): ComboOption[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [...options];
  return options.filter((o) => {
    const hay = `${o.group ?? ""} ${o.label}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export function Combobox({ label, value, options, placeholder = "Custom", hint, onChange }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const current = options.find((o) => o.value === value);
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const openList = () => {
    setQuery("");
    setCursor(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };

  const pick = (o: ComboOption | undefined) => {
    if (!o) return;
    onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      else setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open) pick(filtered[cursor]);
      else openList();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div ref={root} className="relative">
        <input
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          className="w-full border border-border bg-bg-alt px-2 py-1.5 text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
          value={open ? query : (current?.label ?? placeholder)}
          placeholder={open ? (current?.label ?? "Search…") : undefined}
          onFocus={openList}
          onClick={() => !open && openList()}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul
            ref={list}
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-80 w-full overflow-auto border border-border-hot bg-bg p-0 shadow-lg"
          >
            {filtered.length === 0 && (
              <li className="list-none px-2 py-1.5 text-ink-muted italic">No matches</li>
            )}
            {filtered.map((o, i) => (
              <li key={o.value} className="list-none">
                {o.group !== undefined && o.group !== filtered[i - 1]?.group && (
                  <div className="sticky top-0 bg-panel px-2 py-1 font-display text-[10px] tracking-[0.2em] text-accent uppercase">
                    {o.group}
                  </div>
                )}
                <div
                  role="option"
                  data-index={i}
                  aria-selected={o.value === value}
                  className={`cursor-pointer px-3 py-1 text-sm ${
                    i === cursor
                      ? "bg-border text-ink"
                      : o.value === value
                        ? "text-accent-hot"
                        : "text-ink-dim"
                  }`}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                >
                  {o.label}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}
