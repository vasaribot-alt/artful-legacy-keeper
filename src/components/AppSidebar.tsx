import { User, Users, Images, FileText, Calendar, ScrollText, LogOut, Layers, Briefcase, BookOpen, Plus, ChevronDown, Award, Key, Warehouse } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppRole = "artist" | "collector" | "registrar" | "foundation";

const getNavItems = (role: AppRole) => {
  if (role === "foundation") {
    return [
      { title: "Foundation Dashboard", url: "/foundation", icon: Award },
      { title: "Founding Artists", url: "/founding-artists", icon: Users },
    ];
  }
  if (role === "registrar") {
    return [
      { title: "Profile", url: "/profile", icon: User },
      { title: "Clients", url: "/registrar", icon: Users },
    ];
  }
  if (role === "collector") {
    return [
      { title: "Collector Profile", url: "/profile", icon: User },
      { title: "Collection", url: "/dashboard", icon: Images },
      { title: "Inventory", url: "/inventory", icon: Warehouse },
      { title: "Portfolios", url: "/portfolios", icon: Briefcase },
    ];
  }
  return [
    { title: "Artist Profile", url: "/profile", icon: User },
    { title: "Artworks", url: "/dashboard", icon: Images },
    { title: "Series", url: "/series", icon: Layers },
    { title: "Inventory", url: "/inventory", icon: Warehouse },
    { title: "Portfolios", url: "/portfolios", icon: Briefcase },
    { title: "CV", url: "/cv", icon: FileText },
    { title: "Exhibitions", url: "/exhibitions", icon: Calendar },
    { title: "Catalogues", url: "/catalogues", icon: BookOpen },
    { title: "Provenance", url: "/provenance", icon: ScrollText },
  ];
};

const roleLabels: Record<AppRole, { nav: string; label: string }> = {
  artist: { nav: "Artist Registry", label: "Artist" },
  collector: { nav: "Collectors Register", label: "Collector" },
  registrar: { nav: "Registrar", label: "Registrar" },
  foundation: { nav: "Foundation", label: "Foundation" },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRole] = useState<AppRole>("artist");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (data && data.length > 0) {
          const userRoles = data.map(d => d.role) as AppRole[];
          setRoles(userRoles);
          // Restore last active role from localStorage, or default to first
          const saved = localStorage.getItem("activeRole") as AppRole | null;
          if (saved && userRoles.includes(saved)) {
            setActiveRole(saved);
          } else {
            setActiveRole(userRoles[0]);
          }
        }
      }
    };
    fetchRoles();
  }, []);

  const switchRole = (role: AppRole) => {
    setActiveRole(role);
    localStorage.setItem("activeRole", role);
    if (role === "registrar") navigate("/registrar");
    else if (role === "foundation") navigate("/foundation");
    else navigate("/dashboard");
  };

  const addCollectorRole = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "collector" as AppRole });
    if (error) {
      if (error.code === "23505") {
        toast.info("You already have a collector account");
      } else {
        toast.error("Failed to add collector role");
      }
      return;
    }
    setRoles(prev => [...prev, "collector"]);
    toast.success("Collector account added! You can now switch between roles.");
  };

  const isActive = (path: string) => location.pathname === path;
  const navItems = getNavItems(activeRole);
  const canAddCollector = !roles.includes("collector") && roles.includes("artist");

  const handleSignOut = async () => {
    localStorage.removeItem("activeRole");
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className={`px-3 py-4 ${collapsed ? "text-center" : ""}`}>
            {!collapsed && (
              <div>
                {roles.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full">
                      {roleLabels[activeRole].nav}
                      <ChevronDown className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {roles.map(role => (
                        <DropdownMenuItem
                          key={role}
                          onClick={() => switchRole(role)}
                          className={activeRole === role ? "bg-accent font-medium" : ""}
                        >
                          {roleLabels[role].nav}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {roleLabels[activeRole].nav}
                  </span>
                )}
              </div>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {canAddCollector && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={addCollectorRole}>
                <Plus className="mr-2 h-4 w-4" />
                {!collapsed && <span>Add Collector Account</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
