import { describe, it, expect } from "vitest";
import { dueDate, missingDocumentation, budgetTotals } from "./exhibitionPlan";

describe("exhibition plan", () => {
  it("due date counts back from opening", () => {
    const d = dueDate("2027-03-01", 30)!;
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(30);
  });
  it("a work needs photo, year, medium and dimensions to be documented", () => {
    expect(missingDocumentation({ id: "1", title: "A", year: null, medium: "", height: 10, width: null, hasImage: false }))
      .toEqual(["photo", "year", "medium", "dimensions"]);
    expect(missingDocumentation({ id: "1", title: "A", year: 2020, medium: "Oil", height: 10, width: 20, hasImage: true })).toEqual([]);
  });
  it("sums budget lines", () => {
    expect(budgetTotals([{ id: "a", label: "x", estimated: 100, actual: 80 }, { id: "b", label: "y", estimated: 50, actual: 0 }]))
      .toEqual({ estimated: 150, actual: 80 });
  });
});
