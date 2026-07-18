import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OPTIONAL_VALUE_COLUMNS, type OptionalValueColumn } from "@/lib/insuranceExport";

export type TotalBasis =
  | "replacement_value"
  | "appraised_value"
  | "current_market_value"
  | "purchase_price"
  | "none";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: (opts: { columns: OptionalValueColumn[]; totalBasis: TotalBasis }) => void;
  loading?: boolean;
}

// Sensible default: only replacement value + appraisal metadata.
const DEFAULT_SELECTION: OptionalValueColumn[] = ["Replacement value"];

export const CollectionExportDialog = ({ open, onOpenChange, count, onConfirm, loading }: Props) => {
  const [selected, setSelected] = useState<Set<OptionalValueColumn>>(
    new Set(DEFAULT_SELECTION)
  );
  const [totalBasis, setTotalBasis] = useState<TotalBasis>("replacement_value");

  const toggle = (col: OptionalValueColumn) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(OPTIONAL_VALUE_COLUMNS));
  const clearAll = () => setSelected(new Set());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>GARF — full collection list (.xlsx)</DialogTitle>
          <DialogDescription>
            Choose which value columns to include for {count} work{count === 1 ? "" : "s"}.
            Identification, location and image URLs are always included.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Value columns</Label>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={selectAll} className="text-muted-foreground hover:text-foreground underline">
                Select all
              </button>
              <span className="text-muted-foreground">·</span>
              <button type="button" onClick={clearAll} className="text-muted-foreground hover:text-foreground underline">
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
            {OPTIONAL_VALUE_COLUMNS.map((col) => (
              <label
                key={col}
                className="flex items-center gap-2 text-sm cursor-pointer py-1"
              >
                <Checkbox
                  checked={selected.has(col)}
                  onCheckedChange={() => toggle(col)}
                />
                <span>{col}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">Totals row</Label>
            <Select value={totalBasis} onValueChange={(v) => setTotalBasis(v as TotalBasis)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replacement_value">Sum of Replacement value</SelectItem>
                <SelectItem value="appraised_value">Sum of Appraised value</SelectItem>
                <SelectItem value="current_market_value">Sum of Current market value</SelectItem>
                <SelectItem value="purchase_price">Sum of Purchase price</SelectItem>
                <SelectItem value="none">No totals row</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The totals row is only added when its column is included above.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                columns: Array.from(selected),
                totalBasis,
              })
            }
            disabled={loading}
          >
            {loading ? "Exporting…" : "Export .xlsx"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
