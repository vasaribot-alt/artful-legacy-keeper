import type { ReactNode } from "react";

type PublicPageHeroProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  borderBottom?: boolean;
};

export default function PublicPageHero({ eyebrow, title, description, children, borderBottom = false }: PublicPageHeroProps) {
  return (
    <header className={`pt-32 pb-16 px-6 ${borderBottom ? "border-b border-border" : ""}`}>
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">{eyebrow}</p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.05] mb-6 text-balance">{title}</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">{description}</p>
        {children}
      </div>
    </header>
  );
}