import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  BudgetLine, PlanTask, ReadinessArtwork, budgetTotals, dueDate, freshTasks, missingDocumentation,
} from "@/lib/exhibitionPlan";

interface Props {
  exhibitionId: string;
  ownerId: string;
  openingDate: string | null;
  artworkIds: string[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const ExhibitionPlanner = ({ exhibitionId, ownerId, openingDate, artworkIds }: Props) => {
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [budget, setBudget] = useState<BudgetLine[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [works, setWorks] = useState<ReadinessArtwork[]>([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("exhibition_plans").select("*").eq("exhibition_id", exhibitionId).maybeSingle();
      if (data) {
        setExists(true);
        setTasks((data.tasks as unknown as PlanTask[]) || []);
        setBudget((data.budget as unknown as BudgetLine[]) || []);
        setNotes(data.notes || "");
      }
      setLoading(false);
    })();
  }, [exhibitionId]);

  const idsKey = artworkIds.join(",");
  useEffect(() => {
    (async () => {
      if (!artworkIds.length) { setWorks([]); return; }
      const [{ data: arts }, { data: imgs }] = await Promise.all([
        supabase.from("artworks").select("id, title, year, medium, height, width, image_url").in("id", artworkIds),
        supabase.from("artwork_images").select("artwork_id").in("artwork_id", artworkIds),
      ]);
      const withImg = new Set((imgs || []).map((i) => i.artwork_id));
      setWorks((arts || []).map((a: any) => ({
        id: a.id, title: a.title, year: a.year, medium: a.medium,
        height: a.height, width: a.width, hasImage: !!a.image_url || withImg.has(a.id),
      })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const totals = useMemo(() => budgetTotals(budget), [budget]);
  const incomplete = works.filter((w) => missingDocumentation(w).length > 0);

  const save = async (next?: { tasks?: PlanTask[]; budget?: BudgetLine[]; notes?: string }) => {
    setSaving(true);
    const row = {
      exhibition_id: exhibitionId, owner_id: ownerId,
      tasks: (next?.tasks ?? tasks) as any, budget: (next?.budget ?? budget) as any, notes: next?.notes ?? notes,
    };
    const { error } = await supabase.from("exhibition_plans").upsert(row, { onConflict: "exhibition_id" });
    setSaving(false);
    if (error) { toast.error("Could not save plan"); return; }
    setExists(true); setDirty(false);
  };

  const start = async () => { const t = freshTasks(); setTasks(t); setBudget([]); await save({ tasks: t, budget: [] }); };

  if (loading) return <p className="text-xs text-muted-foreground">Loading plan…</p>;

  if (!exists) {
    return (
      <div className="border border-border rounded-md p-4 space-y-2">
        <p className="text-sm">Plan this exhibition in GARF: checklist with dates counted back from the opening, budget, and a check that every work is documented before it opens.</p>
        <Button size="sm" variant="outline" onClick={start}>Start exhibition plan</Button>
      </div>
    );
  }

  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="border border-border rounded-md p-4 space-y-5">
      {/* Documentation readiness */}
      <section className="space-y-2">
        <h4 className="text-sm font-medium">Works documented before opening</h4>
        {works.length === 0 ? (
          <p className="text-xs text-muted-foreground">No works linked yet. Select works above and save.</p>
        ) : incomplete.length === 0 ? (
          <p className="text-xs flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> All {works.length} works are documented.</p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> {works.length - incomplete.length} of {works.length} works documented. Missing:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 pl-5">
              {incomplete.map((w) => (
                <li key={w.id}>
                  <a href={`/artwork/${w.id}`} target="_blank" rel="noreferrer" className="underline">{w.title || "Untitled"}</a> — {missingDocumentation(w).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Checklist */}
      <section className="space-y-2">
        <h4 className="text-sm font-medium">Checklist <span className="text-muted-foreground font-normal">({done}/{tasks.length})</span></h4>
        {!openingDate && <p className="text-xs text-muted-foreground">Add an opening date to see due dates.</p>}
        <ul className="space-y-1.5">
          {[...tasks].sort((a, b) => b.offsetDays - a.offsetDays).map((task) => {
            const due = dueDate(openingDate, task.offsetDays);
            const overdue = due && !task.done && due < new Date();
            return (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={task.done}
                  onCheckedChange={(v) => { const n = tasks.map((x) => x.id === task.id ? { ...x, done: !!v } : x); setTasks(n); save({ tasks: n }); }}
                  className="mt-0.5"
                />
                <span className={`flex-1 ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.label}</span>
                {due && <span className={`text-xs whitespace-nowrap ${overdue ? "font-medium" : "text-muted-foreground"}`}>{overdue ? "Overdue · " : ""}{format(due, "d MMM yyyy")}</span>}
                <button type="button" aria-label="Remove task" onClick={() => { const n = tasks.filter((x) => x.id !== task.id); setTasks(n); save({ tasks: n }); }} className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <Input autoComplete="off" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a task" className="h-8 text-sm" />
          <Button type="button" size="sm" variant="outline" disabled={!newTask.trim()} onClick={() => {
            const n = [...tasks, { id: uid(), label: newTask.trim(), offsetDays: 0, done: false }];
            setTasks(n); setNewTask(""); save({ tasks: n });
          }}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
      </section>

      {/* Budget */}
      <section className="space-y-2">
        <h4 className="text-sm font-medium">Budget</h4>
        {budget.length > 0 && (
          <div className="grid grid-cols-[1fr_90px_90px_20px] gap-1.5 text-xs text-muted-foreground"><span>Item</span><span>Estimated</span><span>Actual</span><span /></div>
        )}
        {budget.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_90px_90px_20px] gap-1.5 items-center">
            <Input autoComplete="off" className="h-8 text-sm" value={l.label} onChange={(e) => { setBudget(budget.map((x) => x.id === l.id ? { ...x, label: e.target.value } : x)); setDirty(true); }} />
            <Input autoComplete="off" type="number" className="h-8 text-sm" value={l.estimated || ""} onChange={(e) => { setBudget(budget.map((x) => x.id === l.id ? { ...x, estimated: Number(e.target.value) } : x)); setDirty(true); }} />
            <Input autoComplete="off" type="number" className="h-8 text-sm" value={l.actual || ""} onChange={(e) => { setBudget(budget.map((x) => x.id === l.id ? { ...x, actual: Number(e.target.value) } : x)); setDirty(true); }} />
            <button type="button" aria-label="Remove line" onClick={() => { const n = budget.filter((x) => x.id !== l.id); setBudget(n); save({ budget: n }); }} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {budget.length > 0 && (
          <div className="grid grid-cols-[1fr_90px_90px_20px] gap-1.5 text-sm font-medium"><span>Total</span><span>{totals.estimated.toLocaleString()}</span><span>{totals.actual.toLocaleString()}</span><span /></div>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => { setBudget([...budget, { id: uid(), label: "", estimated: 0, actual: 0 }]); setDirty(true); }} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add budget line
        </Button>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Notes</h4>
        <Textarea value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} placeholder="Contacts, agreements, ideas…" className="min-h-[70px] text-sm" />
      </section>

      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => save()} disabled={saving || !dirty}>
          {saving ? "Saving…" : dirty ? "Save plan •" : "Saved ✓"}
        </Button>
      </div>
    </div>
  );
};
