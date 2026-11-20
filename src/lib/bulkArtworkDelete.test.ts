import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }));
import { deleteSelectedArtworks } from "./bulkArtworkDelete";

describe("bulk artwork deletion", () => {
  let query: { delete: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; in: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn> };
  let batch: string[];
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
    query = { delete: vi.fn(), eq: vi.fn(), in: vi.fn(), select: vi.fn() };
    query.delete.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.in.mockImplementation((_column, ids) => { batch = ids; return query; });
    query.select.mockImplementation(async () => ({ data: batch.map(id => ({ id })), error: null }));
    mocks.from.mockReturnValue(query);
  });
  it("deletes the screenshot's 649 selections through 13 bounded requests", async () => {
    const ids = Array.from({ length: 649 }, (_, n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
    const progress = vi.fn();
    const result = await deleteSelectedArtworks(ids, "owner", "artist", progress);
    expect(result).toEqual({ deletedIds: ids, error: null });
    expect(query.in).toHaveBeenCalledTimes(13);
    expect(query.in.mock.calls.every(([, batchIds]) => batchIds.length <= 50)).toBe(true);
    expect(query.in.mock.calls[12][1]).toHaveLength(49);
    expect(progress).toHaveBeenLastCalledWith(649);
    expect(query.eq.mock.calls.filter(([key, value]) => key === "owner_id" && value === "owner")).toHaveLength(13);
    expect(query.eq.mock.calls.filter(([key, value]) => key === "role_context" && value === "artist")).toHaveLength(13);
  });
  it("reports completed deletions and stops after a later batch fails", async () => {
    query.select.mockImplementationOnce(async () => ({ data: batch.map(id => ({ id })), error: null }))
      .mockResolvedValueOnce({ data: null, error: { message: "Connection interrupted" } });
    const ids = Array.from({ length: 120 }, (_, n) => String(n));
    expect(await deleteSelectedArtworks(ids, "owner", "collector")).toEqual({ deletedIds: ids.slice(0, 50), error: "Connection interrupted" });
    expect(query.in).toHaveBeenCalledTimes(2);
    expect(query.eq).toHaveBeenCalledWith("role_context", "collector");
  });
  it("does not claim that inaccessible rows were deleted", async () => {
    query.select.mockResolvedValue({ data: [], error: null });
    const result = await deleteSelectedArtworks(["inaccessible"], "owner", "artist");
    expect(result.deletedIds).toEqual([]);
    expect(result.error).toContain("could not be deleted");
  });
  it("makes no deletion request if the account has changed", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "different-owner" } }, error: null });
    expect((await deleteSelectedArtworks(["art"], "owner", "artist")).error).toContain("sign in again");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});