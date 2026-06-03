import { useUnitPreference } from "@/hooks/useUnitPreference";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";

/**
 * Lets the user choose whether artwork dimensions display in centimeters
 * or inches first. The other unit appears in brackets. Dimensions are
 * always stored in cm — this only affects display.
 */
export function UnitPreferenceSetting() {
  const { unit, setUnit } = useUnitPreference();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-2xl flex items-center gap-2">
          <Ruler className="w-5 h-5" /> Display Units
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your preferred unit for artwork dimensions. The other unit will
          still be shown in brackets.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setUnit("cm")}
          className={`flex-1 rounded-md border px-4 py-3 text-left transition ${
            unit === "cm"
              ? "border-foreground bg-foreground text-background"
              : "border-input hover:bg-muted"
          }`}
        >
          <div className="text-sm font-medium">Centimeters</div>
          <div className={`text-xs mt-0.5 ${unit === "cm" ? "opacity-80" : "text-muted-foreground"}`}>
            100 × 80 cm (39.37 × 31.5 in)
          </div>
        </button>
        <button
          type="button"
          onClick={() => setUnit("in")}
          className={`flex-1 rounded-md border px-4 py-3 text-left transition ${
            unit === "in"
              ? "border-foreground bg-foreground text-background"
              : "border-input hover:bg-muted"
          }`}
        >
          <div className="text-sm font-medium">Inches</div>
          <div className={`text-xs mt-0.5 ${unit === "in" ? "opacity-80" : "text-muted-foreground"}`}>
            39.37 × 31.5 in (100 × 80 cm)
          </div>
        </button>
      </div>
      <input type="hidden" aria-hidden value={unit} />
      <Label className="sr-only">Unit preference: {unit}</Label>
    </section>
  );
}
