import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface ViewNavItem {
  label: string;
  path: string;
}

const viewNavItems: ViewNavItem[] = [
  { label: "Profile", path: "/profile/view" },
  { label: "Artworks", path: "/dashboard/view" },
  { label: "CV", path: "/profile/cv" },
];

interface ViewLayoutProps {
  children: React.ReactNode;
  editPath?: string;
}

export function ViewLayout({ children, editPath }: ViewLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-1">
          <nav className="flex items-center gap-1 flex-1">
            {viewNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                  isActive(item.path)
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {editPath && (
            <Button variant="outline" size="sm" onClick={() => navigate(editPath)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
