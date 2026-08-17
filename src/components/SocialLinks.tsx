const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
  </svg>
);

interface SocialLinkProps {
  href: string;
  label: string;
  platform: "instagram" | "x" | "facebook" | "linkedin" | "youtube" | "tiktok";
  variant?: "icon" | "inline";
}

const icons: Record<string, React.ReactNode> = {
  instagram: <InstagramIcon />,
};

export const SocialLink = ({ href, label, platform, variant = "icon" }: SocialLinkProps) => {
  const icon = icons[platform] ?? null;

  if (variant === "inline") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-label={label}
      >
        {icon}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label={label}
    >
      {icon}
    </a>
  );
};

export const InstagramLink = ({ variant = "icon" }: { variant?: "icon" | "inline" }) => (
  <SocialLink
    href="https://www.instagram.com/globalartistregistryfoundation/"
    label="Global Artist Registry Foundation on Instagram"
    platform="instagram"
    variant={variant}
  />
);
