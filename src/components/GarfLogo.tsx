import { cn } from "@/lib/utils";

interface GarfLogoProps {
  className?: string;
}

/** Official GARF wordmark, used in place of the written foundation name. */
const GarfLogo = ({ className }: GarfLogoProps) => (
  <img
    src="/garf-logo.png"
    alt="Global Artist Registry Foundation"
    className={cn("h-12 w-auto dark:invert", className)}
    loading="eager"
  />
);

export default GarfLogo;
