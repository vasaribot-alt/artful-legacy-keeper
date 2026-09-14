const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
  </svg>
);

const brandPaths: Record<string, string> = {
  facebook: "M13.5 22v-9h3l.5-3.5h-3.5V7.25c0-1.01.5-2 2.06-2H17.5V2.14A25.4 25.4 0 0 0 14.69 2C11.82 2 10 3.74 10 6.93V9.5H7V13h3v9h3.5Z",
  x: "M18.24 2H21l-6.04 6.9L22 22h-5.52l-4.32-5.65L7.22 22H4.46l6.41-7.33L4.12 2h5.66l3.9 5.16L18.24 2Zm-.97 17.7h1.53L8.95 4.18H7.31L17.27 19.7Z",
  linkedin: "M5.34 3.5A1.84 1.84 0 1 1 1.66 3.5a1.84 1.84 0 0 1 3.68 0ZM1.98 7h3.05v15H1.98V7Zm5.45 0h2.92v2.05h.04c.41-.77 1.4-2.38 4.62-2.38 4.94 0 5.85 3.25 5.85 7.48V22h-3.05v-6.96c0-1.66-.03-3.8-2.31-3.8-2.32 0-2.67 1.81-2.67 3.68V22H7.78V7h-.35Z",
  youtube: "M23.5 6.19a3.01 3.01 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.01 3.01 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.01 3.01 0 0 0 2.12 2.13c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.01 3.01 0 0 0 2.12-2.13C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.6 15.64V8.36L15.86 12 9.6 15.64Z",
  pinterest: "M12 1.5a10.5 10.5 0 0 0-3.82 20.28c-.09-1.77-.02-3.9.44-5.82l1.35-5.7s-.34-.69-.34-1.7c0-1.6.92-2.79 2.08-2.79.98 0 1.45.74 1.45 1.62 0 .99-.63 2.46-.95 3.82-.27 1.14.57 2.07 1.7 2.07 2.04 0 3.6-2.15 3.6-5.25 0-2.75-1.97-4.67-4.8-4.67-3.27 0-5.19 2.45-5.19 4.99 0 .99.38 2.05.86 2.63.09.11.11.2.08.31l-.32 1.3c-.05.21-.17.26-.39.16-1.47-.68-2.38-2.82-2.38-4.54 0-3.7 2.68-7.09 7.74-7.09 4.06 0 7.22 2.89 7.22 6.76 0 4.03-2.54 7.28-6.07 7.28-1.18 0-2.3-.62-2.68-1.35l-.73 2.77c-.26 1.02-.98 2.29-1.46 3.06.8.25 1.63.38 2.51.38A10.5 10.5 0 0 0 12 1.5Z",
  tiktok: "M17.14 2c.37 2.17 1.65 3.47 3.86 3.61v3.03a8.3 8.3 0 0 1-3.81-.88v6.03a6.22 6.22 0 1 1-5.37-6.16c.43-.05.86-.07 1.29-.03v3.1a3.16 3.16 0 1 0 .02 6.22c.75-.23 1.24-.69 1.46-1.38.07-.2.11-.69.11-1.46V2h2.44Z",
  threads: "M12.19 2C6.63 2 2.5 6.12 2.5 12.05c0 5.94 4.18 9.95 9.94 9.95 5.04 0 8.44-2.95 8.44-7.12 0-3.45-2.02-5.49-5.11-6.11-.32-2.08-1.57-3.31-3.72-3.31-1.89 0-3.3.83-4.2 2.47l2.06 1.14c.48-.88 1.17-1.33 2.08-1.33.78 0 1.29.38 1.52 1.13-3.62.27-5.64 1.75-5.64 4.15 0 2.07 1.63 3.52 3.96 3.52 2.49 0 4.1-1.5 4.14-3.86v-1.52c1.66.51 2.49 1.67 2.49 3.51 0 2.91-2.29 4.91-5.94 4.91-4.34 0-7.42-3.06-7.42-7.55 0-4.47 3.01-7.63 7.15-7.63 2.85 0 5.08 1.32 6.3 3.73l2.16-1.19C19.1 3.78 16.14 2 12.19 2Zm1.45 9.63v.81c0 1.25-.69 1.93-1.8 1.93-.9 0-1.49-.51-1.49-1.28 0-.93 1.08-1.42 3.29-1.46Z",
};

export const SocialPlatformIcon = ({ platform, className = "h-6 w-6" }: { platform: string; className?: string }) => {
  const normalized = platform.toLowerCase().trim();
  if (normalized === "instagram") return <InstagramIcon className={className} />;
  const key = normalized === "twitter" ? "x" : normalized;
  const path = brandPaths[key];

  if (!path) {
    return <span aria-hidden="true" className="text-sm font-semibold uppercase">{platform.slice(0, 2)}</span>;
  }

  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} aria-hidden="true">
      <path d={path} />
    </svg>
  );
};

interface SocialLinkProps {
  href: string;
  label: string;
  platform: "instagram" | "x" | "facebook" | "linkedin" | "youtube" | "tiktok";
  variant?: "icon" | "inline";
}

export const SocialLink = ({ href, label, platform, variant = "icon" }: SocialLinkProps) => {
  const icon = <SocialPlatformIcon platform={platform} />;

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
