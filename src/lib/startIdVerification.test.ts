import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
import { startIdVerification } from "./startIdVerification";

describe("ID verification launch", () => {
  const popup = { opener: {}, closed: false, close: vi.fn(), location: { replace: vi.fn() } };
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    mocks.invoke.mockResolvedValue({ data: { url: "https://magic.veriff.com/v/test" }, error: null });
  });
  it("opens synchronously before the asynchronous session request", async () => {
    mocks.invoke.mockImplementation(async () => {
      expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
      return { data: { url: "https://magic.veriff.com/v/test" }, error: null };
    });
    await startIdVerification();
    expect(popup.location.replace).toHaveBeenCalledWith("https://magic.veriff.com/v/test");
    expect(popup.opener).toBeNull();
  });
  it("closes the temporary window and exposes the service error", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: "Veriff not configured" })) } });
    await expect(startIdVerification()).rejects.toThrow("Veriff not configured");
    expect(popup.close).toHaveBeenCalled();
  });
  it("rejects unexpected links instead of navigating away", async () => {
    mocks.invoke.mockResolvedValue({ data: { url: "https://example.com" }, error: null });
    await expect(startIdVerification()).rejects.toThrow("invalid link");
    expect(popup.location.replace).not.toHaveBeenCalled();
  });
});