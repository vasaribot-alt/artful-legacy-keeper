import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Search, Users } from "lucide-react";

interface ProfileRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

const roleColors: Record<string, string> = {
  artist: "bg-primary/10 text-primary",
  collector: "bg-secondary text-secondary-foreground",
  registrar: "bg-accent text-accent-foreground",
  foundation: "bg-muted text-muted-foreground",
};

export default function RegisteredUsersOverview() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, email, city, country, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);

      if (rolesRes.data) {
        const map: Record<string, string[]> = {};
        (rolesRes.data as RoleRow[]).forEach((r) => {
          if (!map[r.user_id]) map[r.user_id] = [];
          map[r.user_id].push(r.role);
        });
        setRoles(map);
      }

      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = profiles.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.country?.toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    const rows = filtered.map((p) =>
      [
        p.full_name || "",
        p.email || "",
        p.city || "",
        p.country || "",
        (roles[p.user_id] || []).join(", "),
        new Date(p.created_at).toLocaleDateString(),
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = ["Name,Email,City,Country,Roles,Joined", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registered-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading users…</p>;

  return (
    <section>
      <div className="flex items-center gap-3 mb-1">
        <Users className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Registered Users ({profiles.length})</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        All users who have created a profile in the system.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="border border-border rounded-sm overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.user_id}>
                  <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{p.email || "—"}</TableCell>
                  <TableCell className="text-sm">{p.city || "—"}</TableCell>
                  <TableCell className="text-sm">{p.country || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(roles[p.user_id] || []).map((r) => (
                        <Badge
                          key={r}
                          variant="outline"
                          className={`text-xs capitalize ${roleColors[r] || ""}`}
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
