import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// The chosen workspace role is remembered per account, never shared between
// accounts on the same browser: when a different person signs in, reset it.
supabase.auth.onAuthStateChange((_event, session) => {
  const uid = session?.user?.id;
  if (!uid) return;
  if (localStorage.getItem("activeRoleUser") !== uid) {
    localStorage.removeItem("activeRole");
    localStorage.setItem("activeRoleUser", uid);
    window.dispatchEvent(new Event("role-changed"));
  }
});

createRoot(document.getElementById("root")!).render(<App />);
