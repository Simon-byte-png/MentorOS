import { roundtableThinkers } from "@/lib/mock-data";
import type { RoundtableThinker } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ThinkingStepsProps = {
  steps?: string[];
  thinkers?: RoundtableThinker[];
};

export function ThinkingSteps({
  thinkers = roundtableThinkers
}: ThinkingStepsProps) {
  return (
    <section className="mt-10 max-w-[720px] border-t border-line pt-6">
      <p className="mb-5 text-[13px] leading-6 text-muted">
        圆桌正在思考
      </p>
      <div className="space-y-3">
        {thinkers.map((thinker, index) => (
          <ThinkerRow key={thinker.id} thinker={thinker} index={index} />
        ))}
      </div>
    </section>
  );
}

function ThinkerRow({
  thinker,
  index
}: {
  thinker: RoundtableThinker;
  index: number;
}) {
  const delay = `${index * 420}ms`;

  return (
    <div
      className="grid grid-cols-[24px_minmax(0,180px)_minmax(0,1fr)_64px] items-center gap-4 text-[14px] leading-6 text-muted"
      style={{ animationDelay: delay }}
    >
      <span
        className={cn(
          "relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#ff7426]/70",
          "animate-[thinkerPulse_2.8s_ease-in-out_infinite]"
        )}
        style={{ animationDelay: delay }}
        aria-hidden
      >
        <span className="h-2 w-2 rounded-full bg-[#ff7426]" />
      </span>
      <span className="truncate text-ink">{thinker.name}</span>
      <span className="truncate">{thinker.status}</span>
      <span
        className="text-right text-[12px] text-muted/80"
        style={{ animationDelay: delay }}
      >
        思考中
      </span>
    </div>
  );
}
