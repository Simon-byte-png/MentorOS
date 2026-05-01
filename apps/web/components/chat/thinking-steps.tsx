type ThinkingStepsProps = {
  steps: string[];
};

export function ThinkingSteps({ steps }: ThinkingStepsProps) {
  return (
    <div className="mb-8 max-w-[640px] border-t border-line pt-5 text-[13px] text-muted">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-3 py-1">
          <span className="tabular-nums text-[12px] text-muted/70">
            0{index + 1}
          </span>
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}
