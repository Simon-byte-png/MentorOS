type MessageBubbleProps = {
  children: React.ReactNode;
};

export function MessageBubble({ children }: MessageBubbleProps) {
  return (
    <div className="ml-auto max-w-[620px] border border-line bg-white/50 px-5 py-4 text-[16px] leading-7 text-ink shadow-quiet">
      {children}
    </div>
  );
}
