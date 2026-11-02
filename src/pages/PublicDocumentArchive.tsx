import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicArchivalDocuments } from "@/components/PublicArchivalDocuments";
import type { ArchivalDocument } from "@/components/ArchivalDocumentViewer";
import GarfLogo from "@/components/GarfLogo";
export default function PublicDocumentArchive() {
  const { id } = useParams();
  const [documents, setDocuments] = useState<ArchivalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) return;
      let ownerId = id;
      if (/^\d+$/.test(id)) { const { data } = await supabase.from("profiles").select("user_id").eq("global_artist_id", Number(id)).maybeSingle(); if (!data) { setError(true); setLoading(false); return; } ownerId = data.user_id; }
      const { data, error } = await supabase.from("archival_documents").select("*").eq("owner_id", ownerId).eq("role_context", "artist").eq("is_public", true).order("document_date", { ascending: false, nullsFirst: false });
      if (!cancelled) { setDocuments(data ?? []); setError(!!error); setLoading(false); }
    })(); return () => { cancelled = true; };
  }, [id]);
  return <div className="min-h-screen bg-background text-foreground"><header className="border-b border-border px-6 py-4"><Link to="/"><GarfLogo /></Link></header><main className="max-w-3xl mx-auto px-6 py-12"><Link to={`/artist/${id}`} className="text-sm text-muted-foreground">Artist profile</Link><h1 className="font-serif text-3xl my-6">Archival Documents</h1>{loading ? <p role="status">Loading…</p> : error ? <p role="alert">This archive is unavailable.</p> : !documents.length ? <p className="text-muted-foreground">No public documents.</p> : <PublicArchivalDocuments documents={documents} />}</main></div>;
}