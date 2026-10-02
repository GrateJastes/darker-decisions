import { Fragment } from "react";

const DIGIT_EM = 0.66;
const GLYPH_EM: Record<string, number> = { ".": 0.23, ",": 0.24, "%": 0.74, "-": 0.38, "×": 0.42 };
const OTHER_EM = 0.8;

const fixedWidth = (text: string) =>
  [...text].reduce((sum, c) => sum + (/\d/.test(c) ? DIGIT_EM : (GLYPH_EM[c] ?? OTHER_EM)), 0);

export function RichText({
  template,
  values,
  fixed = [],
}: {
  template: string;
  values: Record<string, string>;
  fixed?: readonly string[];
}) {
  const parts = template.split(/(\{\w+\})/);
  return (
    <>
      {parts.map((part, i) => {
        const key = /^\{(\w+)\}$/.exec(part)?.[1];
        if (key === undefined || !(key in values)) return <Fragment key={i}>{part}</Fragment>;
        const boxed = fixed.includes(key);
        return (
          <strong
            key={i}
            className={`font-display font-bold text-accent-hot ${boxed ? "inline-block text-center" : ""}`}
            style={boxed ? { minWidth: `${fixedWidth(values[key]!).toFixed(2)}em` } : undefined}
          >
            {values[key]}
          </strong>
        );
      })}
    </>
  );
}
