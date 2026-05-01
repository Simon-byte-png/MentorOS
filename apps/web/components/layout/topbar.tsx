type TopbarProps = {
  title?: string;
};

export function Topbar({ title = "Quiet Council" }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 px-5 py-4 backdrop-blur md:px-10">
      <div className="mx-auto flex max-w-[840px] flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="text-ink">{title}</span>
        <span aria-hidden>·</span>
        <span>Memory On</span>
        <span aria-hidden>·</span>
        <span>6 cognitive models available</span>
      </div>
    </header>
  );
}
