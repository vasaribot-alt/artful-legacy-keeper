import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, Save, Wallet } from "lucide-react";
import { toast } from "sonner";

interface Props {
  artworkId: string;
  currency: string;
}

const FIELDS: { key: string; label: string; group: string; hint?: string }[] = [
  { key: "purchase_price", label: "Purchase price", group: "Cost", hint: "Actual amount paid" },
  { key: "original_retail_price", label: "Original retail (MSRP)", group: "Cost", hint: "Price at launch" },
  { key: "acquisition_cost", label: "Acquisition cost", group: "Cost", hint: "Total incl. tax, shipping, premiums" },
  { key: "current_market_value", label: "Current market value", group: "Market" },
  { key: "estimated_value", label: "Estimated value", group: "Market", hint: "Personal or expert estimate" },
  { key: "appraised_value", label: "Appraised value", group: "Market", hint: "Certified appraisal" },
  { key: "last_sold_price", label: "Last sold price", group: "Market", hint: "Most recent identical sale" },
  { key: "replacement_value", label: "Replacement value", group: "Insurance" },
  { key: "reserve_price", label: "Reserve price", group: "Sale", hint: "Minimum accepted if selling" },
  { key: "restoration_cost", label: "Restoration cost", group: "Restoration" },
];

export const CollectorValuationSection = ({ artworkId, currency }: Props) => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [appraisedAt, setAppraisedAt] = useState("");
  const [appraisedBy, setAppraisedBy] = useState("");
  const [lastSoldAt, setLastSoldAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("artworks")
        .select(
          "purchase_price, original_retail_price, acquisition_cost, current_market_value, estimated_value, appraised_value, appraised_at, appraised_by, last_sold_price, last_sold_at, replacement_value, reserve_price, restoration_cost"
        )
        .eq("id", artworkId)
        .maybeSingle();
      if (!data) return;
      const v: Record<string, string> = {};
      FIELDS.forEach((f) => {
        const val = (data as any)[f.key];
        v[f.key] = val != null ? String(val) : "";
      });
      setValues(v);
      setAppraisedAt((data as any).appraised_at || "");
      setAppraisedBy((data as any).appraised_by || "");
      setLastSoldAt((data as any).last_sold_at || "");
    })();
  }, [artworkId]);

  const setValue = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload: Record<string, any> = {};
    FIELDS.forEach((f) => {
      const raw = values[f.key];
      payload[f.key] = raw && raw.trim() !== "" ? parseFloat(raw) : null;
    });
    payload.appraised_at = appraisedAt || null;
    payload.appraised_by = appraisedBy.trim() || null;
    payload.last_sold_at = lastSoldAt || null;
    const { error } = await supabase.from("artworks").update(payload as any).eq("id", artworkId);
    setSaving(false);
    if (error) toast.error("Failed to save valuation");
    else toast.success("Valuation saved");
  };

  const groups = Array.from(new Set(FIELDS.map((f) => f.group)));
  const totalFilled = Object.values(values).filter((v) => v && v.trim() !== "").length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <Label className="text-base font-medium cursor-pointer">Valuation & costs</Label>
            {totalFilled > 0 && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-medium">
                {totalFilled} recorded
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-5">
        <p className="text-xs text-muted-foreground">
          All amounts in {currency}. Leave blank to skip.
        </p>

        {groups.map((g) => (
          <div key={g}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{g}</div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.filter((f) => f.group === g).map((f) => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValue(f.key, e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                  {f.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>}
                </div>
              ))}
            </div>

            {g === "Market" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-xs">Appraisal date</Label>
                  <Input type="date" value={appraisedAt} onChange={(e) => setAppraisedAt(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Appraiser</Label>
                  <Input value={appraisedBy} onChange={(e) => setAppraisedBy(e.target.value)} placeholder="Name of appraiser" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Last sold date</Label>
                  <Input type="date" value={lastSoldAt} onChange={(e) => setLastSoldAt(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}
          </div>
        ))}

        <Separator />
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={save} disabled={saving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save valuation"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
