import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileUp, FileText, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ExhibitionDoc {
  id: string;
  exhibition_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  created_at: string;
}

interface ExhibitionDocumentsProps {
  exhibitionId: string;
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const ExhibitionDocuments = ({ exhibitionId }: ExhibitionDocumentsProps) => {
  const [docs, setDocs] = useState<ExhibitionDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocs();
  }, [exhibitionId]);

  const loadDocs = async () => {
    const { data } = await supabase
      .from("exhibition_documents")
      .select("*")
      .eq("exhibition_id", exhibitionId)
      .order("created_at", { ascending: false });
    if (data) setDocs(data as ExhibitionDoc[]);
  };

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${exhibitionId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("exhibition-documents")
        .upload(path, file);
      if (uploadErr) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      await supabase.from("exhibition_documents").insert({
        exhibition_id: exhibitionId,
        storage_path: path,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
      });
    }

    setUploading(false);
    toast.success("Documents uploaded");
    loadDocs();
  };

  const handleDelete = async (doc: ExhibitionDoc) => {
    await supabase.storage.from("exhibition-documents").remove([doc.storage_path]);
    await supabase.from("exhibition_documents").delete().eq("id", doc.id);
    toast.success("Document removed");
    loadDocs();
  };

  const handleDownload = async (doc: ExhibitionDoc) => {
    const { data, error } = await supabase.storage
      .from("exhibition-documents")
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) { toast.error("Failed to generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-2">
      {docs.length > 0 && (
        <div className="space-y-1">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 group text-sm px-2 py-1.5 rounded-sm hover:bg-accent/50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 min-w-0">{doc.file_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(doc.file_size)}
              </span>
              <button
                onClick={() => handleDownload(doc)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-sm"
                title="Download"
              >
                <Download className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={() => handleDelete(doc)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-sm"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" asChild disabled={uploading} className="gap-1.5">
        <label className="cursor-pointer">
          <FileUp className="w-3.5 h-3.5" />
          {uploading ? "Uploading..." : "Add Document"}
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </label>
      </Button>
    </div>
  );
};
