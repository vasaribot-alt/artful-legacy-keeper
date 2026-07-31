import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { formatBytes } from "@/lib/storageQuota";

interface SharedDoc {
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
  created_at: string;
  url: string;
}

const SharedDocument = () => {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<SharedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data, error } = await supabase.functions.invoke("shared-document", {
        body: { token },
      });
      if (error || (data as any)?.error) {
        setError("This document is not available. The link may have been disabled.");
      } else {
        setDoc(data as SharedDoc);
      }
      setLoading(false);
    })();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg border border-border rounded-sm p-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Global Artist Registry Foundation
        </p>
        {loading && <p className="text-sm text-muted-foreground">Loading document…</p>}
        {!loading && error && <p className="text-sm text-muted-foreground">{error}</p>}
        {!loading && doc && (
          <>
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 mt-1 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold">{doc.title}</h1>
                {doc.description && (
                  <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-3 break-all">
                  {doc.file_name} · {formatBytes(Number(doc.file_size || 0))}
                </p>
              </div>
            </div>
            <Button asChild className="mt-8 w-full">
              <a href={doc.url} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4 mr-1" /> Open document
              </a>
            </Button>
          </>
        )}
      </div>
    </main>
  );
};

export default SharedDocument;
