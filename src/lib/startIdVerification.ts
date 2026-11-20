import { supabase } from "@/integrations/supabase/client";

export async function startIdVerification(): Promise<void> {
  // Open during the click, before awaiting the server: Safari blocks later popups.
  const verificationWindow = window.open("about:blank", "_blank");
  if (verificationWindow) verificationWindow.opener = null;
  try {
    const { data, error } = await supabase.functions.invoke("veriff-session");
    if (error) {
      let message = "Could not start ID verification. Please try again.";
      if (error.context instanceof Response) {
        const body = await error.context.clone().json().catch(() => null);
        if (typeof body?.error === "string") message = body.error;
      }
      throw new Error(message);
    }
    if (typeof data?.url !== "string") throw new Error("The verification service did not return a link. Please try again.");
    const url = new URL(data.url);
    if (url.protocol !== "https:" || !(url.hostname === "veriff.com" || url.hostname.endsWith(".veriff.com"))) {
      throw new Error("The verification service returned an invalid link. Please try again.");
    }
    if (verificationWindow && !verificationWindow.closed) verificationWindow.location.replace(url.href);
    else window.location.assign(url.href);
  } catch (error) {
    verificationWindow?.close();
    throw error;
  }
}