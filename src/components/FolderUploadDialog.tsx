import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Folder, FolderOpen, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadOptimizedImage } from "@/lib/uploadOptimizedImage";
import { QuotaExceededError, formatBytes } from "@/lib/storageQuota";

export interface PickedFile {
  file: File;
  /** Path relative to the chosen root, e.g. "1 - Harlem/front.jpg" */
  relativePath: string;
}

interface FolderGroup {
  /** Raw subfolder name, e.g. "1 - Harlem" */
  folderName: string;
  /** Leading line number, if the folder is named "12 - Title" */
  number: number | null;
  /** Title with the leading number stripped */
  label: string;
  files: PickedFile[];
  bytes: number;
}

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "tif", "tiff", "heic", "heif", "bmp"]);

const isImage = (f: File) => {
  if (f.type.startsWith("image/")) return true;
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  return IMAGE_EXT.has(ext);
};

const isJunk = (relativePath: string) => {
  const parts = relativePath.split("/");
  const name = parts[parts.length - 1];
  return (
    relativePath.includes("__MACOSX/") ||
    name.startsWith("._") ||
    name === ".DS_Store" ||
    name.startsWith(".")
  );
};

/** "1 - Harlem" → { number: 1, label: "Harlem" }; "Harlem" → { number: null, label: "Harlem" } */
export const parseFolderName = (folderName: string): { number: number | null; label: string } => {
  const m = folderName.match(/^\s*(\d+)\s*[-–—._)]\s*(.+)$/);
  if (m) return { number: parseInt(m[1], 10), label: m[2].trim() };
  const only = folderName.match(/^\s*(\d+)\s*$/);
  if (only) return { number: parseInt(only[1], 10), label: folderName.trim() };
  return { number: null, label: folderName.trim() };
};

/** Recursively read a dropped directory entry into a flat list of files with relative paths. */
async function readEntry(entry: any, prefix: string, out: PickedFile[]): Promise<void> {
  if (entry.isFile) {
    const file: File = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ file, relativePath: prefix ? `${prefix}/${file.name}` : file.name });
    return;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    const readBatch = (): Promise<any[]> => new Promise((res, rej) => reader.readEntries(res, rej));
    let batch = await readBatch();
    while (batch.length > 0) {
      for (const child of batch) {
        await readEntry(child, prefix ? `${prefix}/${entry.name}` : entry.name, out);
      }
      batch = await readBatch();
    }
  }
}

export async function readDroppedItems(dataTransfer: DataTransfer): Promise<PickedFile[]> {
  const items = Array.from(dataTransfer.items);
  const entries = items
    .map((i) => (typeof (i as any).webkitGetAsEntry === "function" ? (i as any).webkitGetAsEntry() : null))
    .filter(Boolean);
  if (entries.length === 0) {
    return Array.from(dataTransfer.files).map((file) => ({ file, relativePath: file.name }));
  }
  const out: PickedFile[] = [];
  for (const entry of entries) await readEntry(entry, "", out);
  return out;
}

export function groupByFolder(picked: PickedFile[]): FolderGroup[] {
  const keep = picked.filter((p) => !isJunk(p.relativePath) && isImage(p.file));
  const map = new Map<string, FolderGroup>();
  for (const p of keep) {
    const parts = p.relativePath.split("/").filter(Boolean);
    // Last segment is the file name; the segment before it is the artwork folder.
    const folderName = parts.length >= 2 ? parts[parts.length - 2] : "(root)";
    let g = map.get(folderName);
    if (!g) {
      const { number, label } = parseFolderName(folderName);
      g = { folderName, number, label, files: [], bytes: 0 };
      map.set(folderName, g);
    }
    g.files.push(p);
    g.bytes += p.file.size;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.number !== null && b.number !== null) return a.number - b.number;
    if (a.number !== null) return -1;
    if (b.number !== null) return 1;
    return a.folderName.localeCompare(b.folderName);
  });
}

const CONCURRENCY = 4;
const doneKey = (userId: string) => `garf.folderUpload.done.${userId}`;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  roleContext: string;
  /** Files already collected (from a drop). When empty the dialog shows the folder picker. */
  initialFiles?: PickedFile[];
  onComplete: () => void;
}

export const FolderUploadDialog = ({ open, onOpenChange, userId, roleContext, initialFiles, onComplete }: Props) => {
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [finished, setFinished] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    cancelRef.current = false;
    setUploading(false);
    setFinished(false);
    setDoneCount(0);
    setFailed([]);
    setSkipped(0);
    setPicked(initialFiles && initialFiles.length > 0 ? initialFiles : []);
  }, [open, initialFiles]);

  const groups = useMemo(() => groupByFolder(picked), [picked]);
  const totalFiles = useMemo(() => groups.reduce((n, g) => n + g.files.length, 0), [groups]);
  const totalBytes = useMemo(() => groups.reduce((n, g) => n + g.bytes, 0), [groups]);
  const alreadyDone: Set<string> = useMemo(() => {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(doneKey(userId)) || "[]"));
    } catch {
      return new Set<string>();
    }
  }, [userId, open]);

  const resumable = useMemo(
    () => groups.reduce((n, g) => n + g.files.filter((f) => alreadyDone.has(f.relativePath)).length, 0),
    [groups, alreadyDone],
  );

  const handlePick = (fileList: FileList) => {
    setScanning(true);
    const list: PickedFile[] = Array.from(fileList).map((file) => ({
      file,
      relativePath: (file as any).webkitRelativePath || file.name,
    }));
    setPicked(list);
    setScanning(false);
  };

  const persistDone = (paths: Set<string>) => {
    try {
      localStorage.setItem(doneKey(userId), JSON.stringify(Array.from(paths)));
    } catch {
      /* storage full — resume just won't be available */
    }
  };

  const start = async () => {
    if (totalFiles === 0) return;
    setUploading(true);
    setFinished(false);
    const done = new Set(alreadyDone);
    const failures: string[] = [];
    let completed = 0;
    let skippedLocal = 0;

    type Job = { group: FolderGroup; item: PickedFile };
    const jobs: Job[] = [];
    groups.forEach((g) => g.files.forEach((item) => jobs.push({ group: g, item })));

    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length && !cancelRef.current) {
        const job = jobs[cursor++];
        if (done.has(job.item.relativePath)) {
          skippedLocal++;
          setSkipped(skippedLocal);
          continue;
        }
        try {
          const res = await uploadOptimizedImage({
            file: job.item.file,
            userId,
            originalBucket: "artwork-images",
            webBucket: "artwork-images-web",
            pathPrefix: `${userId}/_unlinked`,
          });
          const { error } = await supabase.from("user_uploads").insert({
            user_id: userId,
            role_context: roleContext,
            storage_path: res.storage_path,
            web_storage_path: res.web_storage_path,
            file_name: job.item.file.name,
            file_size: res.file_size,
            original_size: res.original_size,
            mime_type: res.mime_type,
            width: res.width,
            height: res.height,
            folder_label: job.group.label,
            folder_number: job.group.number,
            folder_path: job.item.relativePath,
          });
          if (error) throw error;
          done.add(job.item.relativePath);
          completed++;
          setDoneCount(completed);
          if (completed % 10 === 0) persistDone(done);
        } catch (e) {
          if (e instanceof QuotaExceededError) {
            cancelRef.current = true;
            toast.error(
              `Storage quota reached — ${formatBytes(e.used)} of ${formatBytes(e.quota)} used. Upload stopped; upgrade your plan and resume.`,
            );
            break;
          }
          failures.push(job.item.relativePath);
          setFailed([...failures]);
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    persistDone(done);
    setUploading(false);
    setFinished(true);
    if (completed > 0) toast.success(`${completed} photo${completed === 1 ? "" : "s"} preserved`);
    onComplete();
  };

  const progressPct = totalFiles === 0 ? 0 : Math.round(((doneCount + skipped) / totalFiles) * 100);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cancelRef.current = true; onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload a folder of artwork photos</DialogTitle>
          <DialogDescription>
            Choose the parent folder once — every subfolder is read automatically, so nothing has to be moved or
            flattened first. Each subfolder name (for example “1 - Harlem”) is kept with its photos.
          </DialogDescription>
        </DialogHeader>

        {picked.length === 0 ? (
          <div className="rounded-sm border-2 border-dashed border-border px-6 py-10 text-center space-y-4">
            <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Select the folder that contains your ~700 artwork subfolders, or drag it onto the Files page.
            </p>
            <Button asChild disabled={scanning}>
              <label className="cursor-pointer">
                {scanning ? "Reading folder…" : "Choose folder"}
                <input
                  type="file"
                  className="hidden"
                  multiple
                  // @ts-expect-error non-standard but supported in all major browsers
                  webkitdirectory="true"
                  directory=""
                  onChange={(e) => e.target.files && handlePick(e.target.files)}
                />
              </label>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-sm border border-border py-3">
                <div className="text-lg font-medium">{groups.length}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Folders</div>
              </div>
              <div className="rounded-sm border border-border py-3">
                <div className="text-lg font-medium">{totalFiles}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Photos</div>
              </div>
              <div className="rounded-sm border border-border py-3">
                <div className="text-lg font-medium">{formatBytes(totalBytes)}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total size</div>
              </div>
            </div>

            {resumable > 0 && !uploading && !finished && (
              <div className="flex items-start gap-2 rounded-sm border border-border bg-accent/40 px-3 py-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  {resumable} of these photos were already uploaded in an earlier run — they will be skipped so the
                  upload continues where it stopped.
                </span>
              </div>
            )}

            {(uploading || finished) && (
              <div className="space-y-2">
                <Progress value={progressPct} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {doneCount} uploaded{skipped > 0 ? ` · ${skipped} already preserved` : ""}
                    {failed.length > 0 ? ` · ${failed.length} failed` : ""}
                  </span>
                  <span>{progressPct}%</span>
                </div>
                {failed.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      Some photos could not be uploaded. Reopen this dialog and choose the same folder — completed
                      files are skipped and only the missing ones are retried.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto rounded-sm border border-border divide-y divide-border">
              {groups.map((g) => (
                <div key={g.folderName} className="flex items-center gap-3 px-3 py-2">
                  <Folder className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">
                      {g.number !== null && <span className="text-muted-foreground mr-1.5">{g.number}</span>}
                      {g.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {g.files.length} {g.files.length === 1 ? "photo" : "photos"} · {formatBytes(g.bytes)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <Button variant="ghost" onClick={() => (uploading ? (cancelRef.current = true) : setPicked([]))}>
                {uploading ? "Stop" : "Choose another folder"}
              </Button>
              {finished && !uploading ? (
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              ) : (
                <Button onClick={start} disabled={uploading || totalFiles === 0}>
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  {uploading ? "Uploading…" : `Upload ${totalFiles} photos`}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
