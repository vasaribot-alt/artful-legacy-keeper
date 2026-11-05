export interface PlanTask {
  id: string;
  label: string;
  /** Days before opening (negative = after opening). */
  offsetDays: number;
  done: boolean;
}

export interface BudgetLine {
  id: string;
  label: string;
  estimated: number;
  actual: number;
}

const t = (id: string, label: string, offsetDays: number): PlanTask => ({ id, label, offsetDays, done: false });

/** Default checklist, following the GARF Exhibition Planner phases. */
export const DEFAULT_TASKS: PlanTask[] = [
  t("agreement", "Venue agreement signed (dates, fees, insurance, sales terms)", 180),
  t("concept", "Exhibition concept and title agreed", 150),
  t("works-select", "Works selected and linked to this exhibition in GARF", 120),
  t("works-document", "All works documented in GARF (photo, year, medium, dimensions)", 90),
  t("budget", "Budget agreed with venue", 90),
  t("text", "Exhibition text / press release written", 60),
  t("transport", "Transport and insurance booked", 45),
  t("invites", "Invitations and press sent", 30),
  t("price-list", "Works list and price list ready", 14),
  t("install", "Installation completed", 2),
  t("install-views", "Installation views photographed and uploaded to GARF", -3),
  t("return", "Works returned and locations updated in GARF", -45),
];

export const freshTasks = (): PlanTask[] => DEFAULT_TASKS.map((x) => ({ ...x }));

export function dueDate(opening: string | null, offsetDays: number): Date | null {
  if (!opening) return null;
  const d = new Date(`${opening}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - offsetDays);
  return d;
}

export interface ReadinessArtwork {
  id: string;
  title: string | null;
  year: number | null;
  medium: string | null;
  height: number | null;
  width: number | null;
  hasImage: boolean;
}

/** Lists what is missing for an artwork to count as documented. */
export function missingDocumentation(a: ReadinessArtwork): string[] {
  const missing: string[] = [];
  if (!a.hasImage) missing.push("photo");
  if (!a.year) missing.push("year");
  if (!a.medium?.trim()) missing.push("medium");
  if (!a.height || !a.width) missing.push("dimensions");
  return missing;
}

export function budgetTotals(lines: BudgetLine[]) {
  return lines.reduce(
    (s, l) => ({ estimated: s.estimated + (Number(l.estimated) || 0), actual: s.actual + (Number(l.actual) || 0) }),
    { estimated: 0, actual: 0 },
  );
}
