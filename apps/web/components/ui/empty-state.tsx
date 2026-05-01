type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="border border-line bg-white/40 px-6 py-10 text-center">
      <h2 className="text-[18px] font-medium">{title}</h2>
      <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-6 text-muted">
        {description}
      </p>
    </div>
  );
}
