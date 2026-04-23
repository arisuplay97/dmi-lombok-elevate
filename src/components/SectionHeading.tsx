import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, align = "left", className }: Props) {
  const alignment = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";
  return (
    <div className={["flex flex-col max-w-3xl", alignment, className ?? ""].join(" ")}>
      {eyebrow && (
        <Reveal>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-brand" />
            <span className="eyebrow">{eyebrow}</span>
          </div>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2 className="mt-5 font-display font-bold text-3xl md:text-[2.5rem] lg:text-[3rem] leading-[1.05] text-balance text-ink">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={0.1}>
          <p className="mt-5 text-base md:text-lg text-ink-muted leading-relaxed text-pretty max-w-2xl">
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
