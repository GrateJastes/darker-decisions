import { RichText } from "./RichText";

export interface TextWithValues {
  template: string;
  values: Record<string, string>;
  fixed?: readonly string[];
}

export function VerdictBanner({
  headline,
  details,
}: {
  headline: TextWithValues;
  details: readonly TextWithValues[];
}) {
  return (
    <div className="border-y border-border-hot py-5 text-center">
      <p className="m-0 text-xl leading-snug text-ink sm:text-2xl">
        <RichText {...headline} />
      </p>
      {details.map((d, i) => (
        <p key={i} className="mt-2 mb-0 text-base text-ink-dim italic">
          <RichText {...d} />
        </p>
      ))}
    </div>
  );
}
