import { ReactNode } from "react";
import { NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, User, Images, Layers, Warehouse, Briefcase, FileText, Calendar, BookOpen, ScrollText, Gavel, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveOwner } from "@/hooks/use-active-owner";

const navItems = [
  { label: "Profile", path: "profile", icon: User },
  { label: "Artworks", path: "artworks", icon: Images },
  { label: "Series", path: "series", icon: Layers },
  { label: "Inventory", path: "inventory", icon: Warehouse },
  { label: "Portfolios", path: "portfolios", icon: Briefcase },
  { label: "CV", path: "cv", icon: FileText },
  { label: "Exhibitions", path: "exhibitions", icon: Calendar },
  { label: "Catalogues", path: "catalogues", icon: BookOpen },
  { label: "Provenance", path: "provenance", icon: ScrollText },
  { label: "Research", path: "research", icon: Sparkles },
  { label: "Committee", path: "committee", icon: Gavel },
];


interface Props {
  children: ReactNode;
  headerActions?: ReactNode;
}

export function RegistrarWorkspaceLayout({ children, headerActions }: Props) {
  const navigate = useNavigate();
  const { ownerId } = useParams<{ ownerId: string }>();
  const location = useLocation();
  const { clientName, clientRole } = useActiveOwner();

  const base = `/registrar/client/${ownerId}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Acting on behalf banner */}
      <div className="bg-muted border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <span className="font-medium">Acting on behalf of</span>
            <span className="font-semibold">{clientName || "client"}</span>
            <span className="uppercase tracking-wider text-muted-foreground">· {clientRole}</span>
            <span className="text-muted-foreground">— changes will be marked pending the client's review</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/registrar")}
            className="gap-1.5 h-7"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Clients
          </Button>
        </div>
      </div>

      {/* Sub-nav */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-20">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-1 overflow-x-auto">
          <nav className="flex items-center gap-1 flex-1">
            {navItems.map((item) => {
              const fullPath = `${base}/${item.path}`;
              const isActive = location.pathname === fullPath
                || location.pathname.startsWith(fullPath + "/")
                || (item.path === "artworks" && location.pathname === base);
              return (
                <NavLink
                  key={item.path}
                  to={fullPath}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
