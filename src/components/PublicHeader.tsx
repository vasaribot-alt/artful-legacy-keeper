import { Link, useLocation } from "react-router-dom";
import { ExternalLink, Menu } from "lucide-react";
import GarfLogo from "@/components/GarfLogo";
import { InstagramLink } from "@/components/SocialLinks";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { label: "Why GARF", to: "/why-garf-matters" },
  { label: "About", to: "/about" },
  { label: "Artists", to: "/founding-artists" },
  { label: "Registrars", to: "/registrars" },
  { label: "Supporters", to: "/donors" },
  { label: "Contact", to: "/contact" },
  { label: "FAQ", to: "/faq" },
  { label: "Tutorials", to: "/tutorials" },
  { label: "News", to: "/news" },
];

const PublicHeader = () => {
  const { pathname } = useLocation();
  const linkClass = (to: string) =>
    `text-sm transition-colors hover:text-foreground ${pathname === to ? "font-medium text-foreground" : "text-muted-foreground"}`;

  return (
    <nav aria-label="Public navigation" className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Global Artist Registry Foundation home" className="shrink-0">
          <GarfLogo className="h-10 sm:h-14" />
        </Link>
        <div className="ml-auto hidden min-[1400px]:flex items-center gap-5 whitespace-nowrap">
          {links.map(({ label, to }) => <Link key={to} to={to} aria-current={pathname === to ? "page" : undefined} className={linkClass(to)}>{label}</Link>)}
          <a href="https://catalogueraisonnefoundation.org" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            CR Foundation <ExternalLink className="h-3 w-3" />
          </a>
          <InstagramLink />
          <Link to="/login" className={linkClass("/login")}>Sign In</Link>
          <Button asChild size="sm"><Link to="/register">Get Started</Link></Button>
        </div>
        <div className="ml-auto min-[1400px]:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" title="Open menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex max-h-dvh flex-col overflow-y-auto">
              <SheetHeader className="mb-4 text-left"><SheetTitle>Menu</SheetTitle></SheetHeader>
              <div className="flex flex-col gap-1">
                {links.map(({ label, to }) => (
                  <SheetClose asChild key={to}>
                    <Link to={to} aria-current={pathname === to ? "page" : undefined} className={`block px-2 py-2.5 ${linkClass(to)}`}>{label}</Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <a href="https://catalogueraisonnefoundation.org" className="inline-flex items-center gap-1 px-2 py-2.5 text-sm text-muted-foreground hover:text-foreground">CR Foundation <ExternalLink className="h-3 w-3" /></a>
                </SheetClose>
                <div className="px-2 py-2"><InstagramLink /></div>
                <SheetClose asChild><Link to="/login" className={`block px-2 py-2.5 ${linkClass("/login")}`}>Sign In</Link></SheetClose>
                <SheetClose asChild><Button asChild className="mt-2"><Link to="/register">Get Started</Link></Button></SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default PublicHeader;
