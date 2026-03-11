import { User, Images, FileText, Calendar, ScrollText, LogOut, Layers } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
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

const getNavItems = (role: string | null) => [
  { title: role === "collector" ? "Collector Profile" : "Artist Profile", url: "/profile", icon: User },
  { title: "Artworks", url: "/dashboard", icon: Images },
  ...(role !== "collector" ? [{ title: "Series", url: "/series", icon: Layers }] : []),
  { title: "CV", url: "/cv", icon: FileText },
  { title: "Exhibitions", url: "/exhibitions", icon: Calendar },
  { title: "Provenance", url: "/provenance", icon: ScrollText },
];

const getRegistryLabel = (role: string | null) =>
  role === "collector" ? "Collectors Register" : "Artist Registry";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setUserRole(data.role);
      }
    };
    fetchRole();
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const navItems = getNavItems(userRole);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className={`px-3 py-4 ${collapsed ? "text-center" : ""}`}>
            {!collapsed && (
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {getRegistryLabel(userRole)}
              </span>
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
