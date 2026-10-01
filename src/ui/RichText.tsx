import { Fragment } from "react";

export function RichText({ template, values }: { template: string; values: Record<string, string> }) {
  const parts = template.split(/(\{\w+\})/);
  return (
    <>
      {parts.map((part, i) => {
        const key = /^\{(\w+)\}$/.exec(part)?.[1];
        return key !== undefined && key in values ? (
          <strong key={i} className="font-display font-bold text-accent-hot">
            {values[key]}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}
