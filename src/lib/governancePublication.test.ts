import { describe, expect, it } from "vitest";
import { governanceDocuments } from "./governancePublication";

describe("approved public governance downloads", () => {
  it("publishes only the three approved version 1.0 documents dated 13 November 2026", () => {
    expect(governanceDocuments.map(document => document.filename)).toEqual([
      "01_Board_Rules_of_Procedure_v1.0_2026-11-13.pdf",
      "03_Operational_Responsibilities_Public_Extract_v1.0_2026-11-13.pdf",
      "04_Advisory_Board_Terms_of_Reference_v1.0_2026-11-13.pdf",
    ]);
  });
});