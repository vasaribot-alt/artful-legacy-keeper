/** 1 cm ≈ 0.393701 inches */
const CM_TO_INCH = 0.393701;

export type DimensionUnit = "cm" | "in";

const toInch = (cm: number) => +(cm * CM_TO_INCH).toFixed(2);

/**
 * Format dimensions with the primary unit first and the converted value in brackets.
 * Dimensions are always stored in cm. When `unit === "in"`, inches are shown first
 * and cm in brackets; otherwise cm first and inches in brackets.
 *
 * e.g. cm-first → "100 × 80 × 4 cm (39.37 × 31.5 × 1.57 in)"
 * e.g. in-first → "39.37 × 31.5 × 1.57 in (100 × 80 × 4 cm)"
 */
export const formatDimensions = (
  h: number | null,
  w: number | null,
  d: number | null,
  unit: DimensionUnit = "cm"
): string | null => {
  const parts = [h, w, d].filter((v): v is number => v != null);
  if (parts.length === 0) return null;
  const cmStr = parts.join(" × ") + " cm";
  const inStr = parts.map(toInch).join(" × ") + " in";
  return unit === "in" ? `${inStr} (${cmStr})` : `${cmStr} (${inStr})`;
};
