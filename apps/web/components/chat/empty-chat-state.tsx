import type { EmptyStateCopy } from "@/lib/mock-data";

type EmptyChatStateProps = {
  copy: EmptyStateCopy;
};

export function EmptyChatState({ copy }: EmptyChatStateProps) {
  return (
    <section className="flex min-h-[calc(100vh-220px)] min-w-0 items-center pt-10 md:pt-14">
      <div className="max-w-[760px] pb-12">
        <p className="mb-5 text-[13px] leading-6 text-muted">New conversation</p>
        <h1 className="font-serif text-[42px] leading-tight text-ink md:text-[58px]">
          {copy.title}
        </h1>
        <p className="mt-7 max-w-[680px] text-[18px] leading-[1.9] text-muted md:text-[20px]">
          {copy.subtitle}
        </p>
      </div>
    </section>
  );
}
