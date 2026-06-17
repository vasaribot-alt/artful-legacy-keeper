import { User, Users, Images, FileText, Calendar, ScrollText, LogOut, Layers, Briefcase, BookOpen, Plus, Award, Warehouse, Palette, Archive, FolderSearch, Camera, UserPlus } from "lucide-react";
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

type AppRole = "artist" | "collector" | "registrar" | "foundation";

const getNavItems = (role: AppRole) => {
  if (role === "foundation") {
    return [
      { title: "Foundation Dashboard", url: "/foundation/admin", icon: Award },
      { title: "Founding Artists", url: "/founding-artists", icon: Users },
    ];
  }
  if (role === "registrar") {
    return [
      { title: "Profile", url: "/profile", icon: User },
      { title: "Clients", url: "/registrar", icon: Users },
      { title: "Capture", url: "/capture", icon: Camera },
    ];
  }
  if (role === "collector") {
    return [
      { title: "Collector Profile", url: "/profile", icon: User },
      { title: "Collection", url: "/dashboard", icon: Images },
      { title: "Capture", url: "/capture", icon: Camera },
      { title: "Inventory", url: "/inventory", icon: Warehouse },
      { title: "Portfolios", url: "/portfolios", icon: Briefcase },
      { title: "Files", url: "/files", icon: FolderSearch },
    ];
  }
  return [
    { title: "Artist Profile", url: "/profile", icon: User },
    { title: "Artworks", url: "/dashboard", icon: Images },
    { title: "Capture", url: "/capture", icon: Camera },
    { title: "Series", url: "/series", icon: Layers },
    { title: "Inventory", url: "/inventory", icon: Warehouse },
    { title: "Portfolios", url: "/portfolios", icon: Briefcase },
    { title: "CV", url: "/cv", icon: FileText },
    { title: "Exhibitions", url: "/exhibitions", icon: Calendar },
    { title: "Catalogues", url: "/catalogues", icon: BookOpen },
    { title: "Provenance", url: "/provenance", icon: ScrollText },
    { title: "Files", url: "/files", icon: FolderSearch },
    { title: "Invite Friends", url: "/invite-friends", icon: UserPlus },
  ];
};

const roleIcons: Record<AppRole, typeof User> = {
  artist: Palette,
  collector: Archive,
  registrar: Users,
  foundation: Award,
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
    window.dispatchEvent(new Event("role-changed"));
    if (role === "registrar") navigate("/registrar");
    else if (role === "foundation") navigate("/foundation");
    else navigate("/dashboard");
  };

  const addRole = async (newRole: AppRole, label: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });
    if (error) {
      if (error.code === "23505") {
        toast.info(`You already have a ${label.toLowerCase()} account`);
      } else {
        toast.error(`Failed to add ${label.toLowerCase()} role`);
      }
      return;
    }
    setRoles(prev => [...prev, newRole]);
    toast.success(`${label} account added! Switching now.`);
    switchRole(newRole);
  };

  const isActive = (path: string) => location.pathname === path;
  const navItems = getNavItems(activeRole);
  const hasCollector = roles.includes("collector");
  const hasArtist = roles.includes("artist");
  const canAddCollector = roles.includes("artist") && !hasCollector;
  const canAddArtist = !hasArtist && !hasCollector;

  const handleSignOut = async () => {
    localStorage.removeItem("activeRole");
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className={`px-2 py-3 ${collapsed ? "flex flex-col items-center gap-1" : "flex flex-col gap-1"}`}>
            {roles.map(role => {
              const RoleIcon = roleIcons[role];
              const isRoleActive = activeRole === role;
              return (
                <button
                  key={role}
                  onClick={() => switchRole(role)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full text-left ${
                    isRoleActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <RoleIcon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{roleLabels[role].nav}</span>}
                </button>
              );
            })}
          </div>
          {!collapsed && <div className="mx-3 mb-2 h-px bg-border" />}
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
          {canAddArtist && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => addRole("artist", "Artist")}>
                <Plus className="mr-2 h-4 w-4" />
                {!collapsed && <span>Add Artist Account</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {canAddCollector && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => addRole("collector", "Collector")}>
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
