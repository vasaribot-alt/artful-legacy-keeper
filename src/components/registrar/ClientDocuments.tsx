import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, FileText, Trash2, Upload } from "lucide-react";

interface DocRow {
  id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  note: string | null;
  created_at: string;
}

const BUCKET_IMAGES = "artwork-images";
const BUCKET_DOCS = "artwork-documents";

const prettySize = (bytes: number | null) => {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
};

/**
 * Client-scoped document library for the registrar workspace.
 * Files are stored against the client's own account, so they appear in the
 * client's Files page as well and stay with the archive if access ends.
 */
export function ClientDocuments({
  ownerId,
  clientRole,
}: {
  ownerId: string;
  clientRole: "artist" | "collector";
}) {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_uploads")
      .select("id, storage_path, file_name, file_size, original_size, mime_type, note, created_at")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load documents");
    setRows(
      ((data as any[]) || []).map((r) => ({
        id: r.id,
        storage_path: r.storage_path,
        file_name: r.file_name,
        file_size: r.original_size ?? r.file_size ?? null,
        mime_type: r.mime_type,
        note: r.note,
        created_at: r.created_at,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const bucketFor = (mime: string | null) =>
    (mime || "").startsWith("image/") ? BUCKET_IMAGES : BUCKET_DOCS;

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "bin";
      const bucket = bucketFor(file.type);
      const path = `${ownerId}/registrar/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
      if (upErr) {
        toast.error(`Could not upload ${file.name}`);
        continue;
      }
      const { error: dbErr } = await supabase.from("user_uploads").insert({
        user_id: ownerId,
        role_context: clientRole,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        original_size: file.size,
        mime_type: file.type || null,
        note: note.trim() || null,
      } as any);
      if (dbErr) {
        toast.error(`Could not record ${file.name}`);
        continue;
      }
      ok += 1;
    }
    setUploading(false);
    setNote("");
    if (ok > 0) {
      toast.success(`${ok} file${ok === 1 ? "" : "s"} added to the archive`);
      fetchRows();
    }
  };

  const download = async (row: DocRow) => {
    const bucket = bucketFor(row.mime_type);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(row.storage_path, 60);
    if (error || !data?.signedUrl) {
      const pub = supabase.storage.from(bucket).getPublicUrl(row.storage_path).data.publicUrl;
      window.open(pub, "_blank");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (row: DocRow) => {
    const { error } = await supabase.from("user_uploads").delete().eq("id", row.id);
    if (error) {
      toast.error("Could not delete the file");
      return;
    }
    await supabase.storage.from(bucketFor(row.mime_type)).remove([row.storage_path]);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("File deleted");
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl">Documents</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Certificates, condition reports, invoices, correspondence and scans. Everything you add
          here is stored in the client's own archive, so it stays with them permanently.
        </p>
      </header>

      <div className="border border-border rounded-sm p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Note for these files (optional)</Label>
          <Input
            autoComplete="off"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Condition reports, Oslo inventory 2026"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload documents"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="text-xs text-muted-foreground">
            PDF, Word, spreadsheets, scans and images
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 bg-secondary animate-pulse rounded-sm" />
          <div className="h-12 bg-secondary animate-pulse rounded-sm" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border rounded-sm p-6">
          No documents in this archive yet.
        </p>
      ) : (
        <div className="divide-y divide-border border border-border rounded-sm">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-4 p-4">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{row.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    new Date(row.created_at).toLocaleDateString(),
                    prettySize(row.file_size),
                    row.note,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => download(row)}>
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => remove(row)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
