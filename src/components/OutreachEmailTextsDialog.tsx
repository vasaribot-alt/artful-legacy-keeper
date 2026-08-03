import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export interface OutreachEmailText {
  id: string;
  name: string;
  category: string | null;
  subject: string | null;
  body: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: OutreachEmailText[];
  categoryLabels: Record<string, string>;
  categories: string[];
  onChanged: () => void;
}

const PLACEHOLDER_HELP = [
  ["{{greeting}}", "Dear <person>, <title> of <organisation>,"],
  ["{{name}}", "Organisation / company name"],
  ["{{contact_person}}", "Recipient's name"],
  ["{{contact_title}}", "Recipient's title"],
  ["{{country}}", "Country / city"],
  ["{{signature}}", "Your saved signature block"],
];

export function OutreachEmailTextsDialog({
  open, onOpenChange, templates, categoryLabels, categories, onChanged,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("any");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setActiveId(null);
    setName("");
    setCategory("any");
    setSubject("");
    setBody("");
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const editTemplate = (t: OutreachEmailText) => {
    setActiveId(t.id);
    setName(t.name);
    setCategory(t.category || "any");
    setSubject(t.subject || "");
    setBody(t.body || "");
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Give the email text a name (e.g. “Founding Seed Partner Invitation 1”)"); return; }
    if (!body.trim()) { toast.error("The email text cannot be empty"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      category: category === "any" ? null : category,
      subject: subject.trim() || null,
      body,
    };
    const table = supabase.from("outreach_email_templates" as never);
    const { error } = activeId
      ? await (table as any).update(payload).eq("id", activeId)
      : await (table as any).insert(payload);
    setSaving(false);
    if (error) { toast.error("Could not save the email text"); return; }
    toast.success(activeId ? "Email text updated" : "Email text saved");
    onChanged();
    resetForm();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this email text?")) return;
    const { error } = await (supabase.from("outreach_email_templates" as never) as any)
      .delete().eq("id", id);
    if (error) { toast.error("Could not delete"); return; }
    if (activeId === id) resetForm();
    onChanged();
    toast.success("Deleted");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email texts</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Saved texts</Label>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New
              </Button>
            </div>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">No email texts yet.</p>
            )}
            <div className="space-y-1">
              {templates.map(t => (
                <div
                  key={t.id}
                  className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
                    activeId === t.id ? "border-foreground" : "border-border"
                  }`}
                >
                  <button className="text-left flex-1 min-w-0" onClick={() => editTemplate(t)}>
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {t.category ? (categoryLabels[t.category] || t.category) : "All categories"}
                      </Badge>
                    </div>
                  </button>
                  <Button size="icon" variant="ghost" onClick={() => remove(t.id)} aria-label="Delete email text">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Founding Seed Partner Invitation 1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">All categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Invitation to become a founding seed partner of the Global Artist Registry Foundation"
              />
            </div>
            <div>
              <Label>Email text</Label>
              <Textarea
                rows={16}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="font-mono text-xs"
                placeholder={`{{greeting}}\n\nWe are writing on behalf of the Global Artist Registry Foundation…\n\nWith kind regards,\n\n{{signature}}`}
              />
            </div>
            <div className="rounded-md border border-border p-3 text-xs space-y-1">
              <div className="font-medium">Placeholders the system fills in automatically</div>
              {PLACEHOLDER_HELP.map(([code, desc]) => (
                <div key={code} className="flex gap-2 text-muted-foreground">
                  <code className="font-mono text-foreground">{code}</code>
                  <span>— {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : activeId ? "Update email text" : "Save email text"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
