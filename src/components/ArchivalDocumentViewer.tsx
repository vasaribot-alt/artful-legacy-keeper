import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SketchbookReader } from "@/components/SketchbookReader";
import type { Tables } from "@/integrations/supabase/types";
export type ArchivalDocument = Tables<"archival_documents">;

export function ArchivalDocumentViewer({ document, onClose }: { document: ArchivalDocument | null; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    setUrl(""); setError(false); let cancelled = false;
    if (document) void supabase.storage.from("archival-documents").createSignedUrl(document.storage_path, 3600).then(({ data, error }) => { if (!cancelled) { setUrl(data?.signedUrl ?? ""); setError(!!error); } });
    return () => { cancelled = true; };
  }, [document]);
  return <Dialog open={!!document} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="pr-6 break-words">{document?.title}</DialogTitle></DialogHeader>{document && <>
    <p className="text-xs text-muted-foreground font-mono">{document.reference_number} · {document.document_type}{document.document_date ? ` · ${document.document_date}` : ""}</p>
    {document.context && <p className="whitespace-pre-wrap text-sm break-words">{document.context}</p>}
    {document.creator && <p className="text-sm text-muted-foreground">Creator / source: {document.creator}</p>}
    {document.rights_note && <p className="text-xs text-muted-foreground">{document.rights_note}</p>}
    {error ? <p role="alert" className="text-destructive">This document is unavailable or no longer public.</p> : !url ? <p role="status">Loading…</p> : document.file_type === "application/pdf" ? <SketchbookReader key={document.id} url={url} title={document.title} /> : <><img src={url} alt={document.title} className="max-h-[60vh] w-full object-contain" /><Button variant="outline" asChild><a href={url} target="_blank" rel="noreferrer">Open original</a></Button></>}
  </>}</DialogContent></Dialog>;
}