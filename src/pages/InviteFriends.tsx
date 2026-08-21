import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Mail, X, UserPlus } from "lucide-react";

const BASE_INVITES = 5;

type PeerInvite = {
  id: string;
  invitee_name: string;
  invitee_email: string | null;
  personal_message: string | null;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  invite_codes: { code: string; is_active: boolean; used_by: string | null } | null;
};

export default function InviteFriends() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [bonus, setBonus] = useState(0);
  const [invites, setInvites] = useState<PeerInvite[]>([]);
  const [inviterName, setInviterName] = useState("");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, id_verified, bonus_invites")
      .eq("user_id", user.id)
      .maybeSingle();

    setVerified(!!profile?.id_verified);
    setBonus((profile as any)?.bonus_invites || 0);
    setInviterName(profile?.full_name || "");

    const { data } = await supabase
      .from("peer_invites")
      .select("id, invitee_name, invitee_email, personal_message, status, created_at, redeemed_at, invite_codes ( code, is_active, used_by )")
      .order("created_at", { ascending: false });

    setInvites((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const maxInvites = BASE_INVITES + bonus;
  const activeCount = invites.filter(i => i.status === "sent" || i.status === "redeemed").length;
  const remaining = Math.max(0, maxInvites - activeCount);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Friend's name is required"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_peer_invite", {
      _invitee_name: form.name.trim(),
      _invitee_email: form.email.trim() || null,
      _personal_message: form.message.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite created");
    setForm({ name: "", email: "", message: "" });
    load();
    // auto-copy draft for the freshly created one
    const code = (data as any)?.[0]?.code;
    if (code) {
      const draft = buildDraft(form.name.trim(), code, form.message.trim(), inviterName);
      navigator.clipboard.writeText(draft).catch(() => {});
      toast.success("Invitation message copied to clipboard");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this invite? The code will stop working.")) return;
    const { error } = await supabase.rpc("revoke_peer_invite", { _invite_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Invite revoked");
    load();
  };

  const inviteUrl = (code: string) =>
    `${window.location.origin}/register?invite=${code}`;

  const buildDraft = (name: string, code: string, message: string, sender: string) => {
    const url = inviteUrl(code);
    const intro = message ? `${message}\n\n` : "";
    return `Hi ${name},

${intro}I'd like to invite you to join the Global Artist Registry Foundation, a non-profit archival platform dedicated to documenting and preserving artists' work for the next 100 years. Verified artists receive a permanent profile and a secure archive of their oeuvre.

You can register using this personal invite:
${url}

Invite code: ${code}

The Foundation is based in the Netherlands and the registry is free for invited artists.

Warmly,
${sender || "A friend"}`;
  };

  const copyDraft = (inv: PeerInvite) => {
    if (!inv.invite_codes?.code) return;
    const draft = buildDraft(inv.invitee_name, inv.invite_codes.code, inv.personal_message || "", inviterName);
    navigator.clipboard.writeText(draft);
    toast.success("Invitation message copied");
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(inviteUrl(code));
    toast.success("Link copied");
  };

  const mailto = (inv: PeerInvite) => {
    if (!inv.invite_codes?.code) return;
    const draft = buildDraft(inv.invitee_name, inv.invite_codes.code, inv.personal_message || "", inviterName);
    const subject = encodeURIComponent("An invitation to the Global Artist Registry Foundation");
    const body = encodeURIComponent(draft);
    const to = encodeURIComponent(inv.invitee_email || "");
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return <AppLayout title="Invite Friends"><div className="p-8 text-muted-foreground">Loading…</div></AppLayout>;
  }

  if (!verified) {
    return (
      <AppLayout title="Invite Friends">
        <div className="max-w-2xl mx-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle>ID verification required</CardTitle>
              <CardDescription>
                Peer invitations are reserved for ID-verified artists. Once your Veriff verification is approved, you'll be able to invite up to {BASE_INVITES} fellow artists to join the registry, and earn one extra invite for every friend who also gets verified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/profile")}>Go to my profile</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Invite Friends">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-serif mb-2">Invite fellow artists</h2>
          <p className="text-muted-foreground">
            You can invite up to {maxInvites} peers ({BASE_INVITES} base{bonus > 0 ? ` + ${bonus} earned` : ""}). We'll generate a personal invite, you send it from your own email so it arrives as a note from a friend. Each invited artist who completes ID verification earns you one extra invite.
          </p>
          <p className="mt-3 text-sm flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{activeCount} of {maxInvites} used</Badge>
            <span className="text-muted-foreground">{remaining} remaining</span>
            {bonus > 0 && <Badge>+{bonus} earned via referrals</Badge>}
          </p>
        </div>

        {remaining > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> New invitation</CardTitle>
              <CardDescription>Generate a unique invite code and a ready-to-send draft message.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Artist's name *</Label>
                  <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jane Doe" required />
                </div>
                <div>
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="So you can use the 'Email' button later" />
                </div>
                <div>
                  <Label htmlFor="message">Personal note (optional)</Label>
                  <Textarea id="message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3} placeholder="A line or two about why you're inviting them" />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-medium">Your invitations</h3>
          {invites.length === 0 && (
            <p className="text-muted-foreground text-sm">No invitations yet.</p>
          )}
          {invites.map(inv => {
            const code = inv.invite_codes?.code;
            const isRedeemed = inv.status === "redeemed";
            const isRevoked = inv.status === "revoked";
            return (
              <Card key={inv.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium">{inv.invitee_name}</div>
                      {inv.invitee_email && <div className="text-sm text-muted-foreground truncate">{inv.invitee_email}</div>}
                      {code && (
                        <div className="text-xs font-mono mt-1 text-muted-foreground">Code: {code}</div>
                      )}
                    </div>
                    <Badge variant={isRedeemed ? "default" : isRevoked ? "destructive" : "secondary"}>
                      {isRedeemed ? "Redeemed" : isRevoked ? "Revoked" : "Sent"}
                    </Badge>
                  </div>
                  {!isRedeemed && !isRevoked && code && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyDraft(inv)}>
                        <Copy className="h-4 w-4 mr-1.5" /> Copy message
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyLink(code)}>
                        <Copy className="h-4 w-4 mr-1.5" /> Copy link
                      </Button>
                      {inv.invitee_email && (
                        <Button size="sm" variant="outline" onClick={() => mailto(inv)}>
                          <Mail className="h-4 w-4 mr-1.5" /> Open in email
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleRevoke(inv.id)}>
                        <X className="h-4 w-4 mr-1.5" /> Revoke
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
