import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  artist_user_id: string;
  name: string;
  email: string | null;
  role: string;
  affiliation: string | null;
  sort_order: number;
}

const ROLE_LABEL: Record<string, string> = {
  author: "Author",
  committee_chair: "Committee Chair",
  committee_member: "Committee Member",
};

export function CrCommitteeManager({ artistUserId }: { artistUserId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cr_committee_members")
      .select("*")
      .eq("artist_user_id", artistUserId)
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setMembers((data as Member[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistUserId]);

  const addMember = async (role: string) => {
    setSaving(true);
    const nextOrder =
      members.length === 0
        ? 0
        : Math.max(...members.map((m) => m.sort_order)) + 1;
    const { error } = await supabase.from("cr_committee_members").insert({
      artist_user_id: artistUserId,
      name: "",
      role,
      sort_order: nextOrder,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
  };

  const updateMember = async (id: string, patch: Partial<Member>) => {
    setMembers((p) => p.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const persistMember = async (m: Member) => {
    const { error } = await supabase
      .from("cr_committee_members")
      .update({
        name: m.name,
        email: m.email,
        role: m.role,
        affiliation: m.affiliation,
        sort_order: m.sort_order,
      })
      .eq("id", m.id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("cr_committee_members")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMembers((p) => p.filter((m) => m.id !== id));
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = members.findIndex((m) => m.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= members.length) return;
    const a = members[idx];
    const b = members[swap];
    const newOrder = [...members];
    newOrder[idx] = { ...b, sort_order: a.sort_order };
    newOrder[swap] = { ...a, sort_order: b.sort_order };
    setMembers(newOrder);
    await Promise.all([
      supabase
        .from("cr_committee_members")
        .update({ sort_order: a.sort_order })
        .eq("id", b.id),
      supabase
        .from("cr_committee_members")
        .update({ sort_order: b.sort_order })
        .eq("id", a.id),
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading committee…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {members.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No committee members yet. Add the author first, then any chair and
          members.
        </p>
      )}

      <ul className="space-y-3">
        {members.map((m, i) => (
          <li
            key={m.id}
            className="border rounded-md p-4 space-y-3 bg-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {ROLE_LABEL[m.role] || m.role}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(m.id, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(m.id, 1)}
                  disabled={i === members.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(m.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={m.name}
                  onChange={(e) => updateMember(m.id, { name: e.target.value })}
                  onBlur={() => persistMember({ ...m, name: m.name })}
                  placeholder="e.g. Haugsbø, Tove"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={m.email ?? ""}
                  onChange={(e) =>
                    updateMember(m.id, { email: e.target.value })
                  }
                  onBlur={() => persistMember(m)}
                  placeholder="name@institution.org"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select
                  value={m.role}
                  onValueChange={(v) => {
                    updateMember(m.id, { role: v });
                    persistMember({ ...m, role: v });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="committee_chair">
                      Committee Chair
                    </SelectItem>
                    <SelectItem value="committee_member">
                      Committee Member
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Affiliation (optional)</Label>
                <Input
                  value={m.affiliation ?? ""}
                  onChange={(e) =>
                    updateMember(m.id, { affiliation: e.target.value })
                  }
                  onBlur={() => persistMember(m)}
                  placeholder="e.g. KODE Art Museums"
                  autoComplete="off"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addMember("author")}
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add author
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addMember("committee_chair")}
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add chair
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addMember("committee_member")}
          disabled={saving}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add committee member
        </Button>
      </div>
    </div>
  );
}
