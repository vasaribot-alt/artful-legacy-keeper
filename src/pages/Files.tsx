import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StorageUsageMeter } from "@/components/StorageUsageMeter";
import { Search, Download, FileText, Image as ImageIcon, LayoutGrid, List, ExternalLink, Filter, X, Folder, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { AddArtworkDialog, type ArtworkDuplicateData } from "@/components/AddArtworkDialog";

type FileKind = "image" | "document";
type SourceType = "artwork-image" | "artwork-document" | "exhibition-image" | "exhibition-document" | "catalogue-cover" | "cv-image" | "unlinked-upload";

interface FileRow {
  id: string;
  bucket: string;          // bucket holding the file used for download
  storage_path: string;    // path within that bucket
  thumb_bucket?: string;   // bucket for the lightweight web-derivative thumbnail (if available)
  thumb_path?: string;     // path of the web derivative
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  kind: FileKind;
  source: SourceType;
  // metadata for filtering
  linked_id: string;
  linked_title: string;
  linked_route?: string;
  year: number | null;
  medium: string | null;
  series: string | null;
  artwork_type: string | null;
  exhibition_type: "solo" | "group" | null;
  exhibition_id: string | null;
  extension: string;
  caption: string | null;
  created_at: string;
}

const SOURCE_LABEL: Record<SourceType, string> = {
  "artwork-image": "Artwork image",
  "artwork-document": "Artwork document",
  "exhibition-image": "Exhibition image",
  "exhibition-document": "Exhibition document",
  "catalogue-cover": "Catalogue cover",
  "cv-image": "CV image",
  "unlinked-upload": "Unlinked",
};

const PUBLIC_BUCKETS = new Set([
  "artwork-images", "artwork-images-web",
  "exhibition-images", "exhibition-images-web",
  "catalogue-covers", "cv-images", "profile-photos",
]);

// Suggested artwork types from the user's PDF
const ARTWORK_TYPE_OPTIONS = [
  "Collage", "Drawing", "Painting", "Photography", "Print",
  "Sculpture - 3D printed", "Sculpture - Assembled", "Sculpture - Carved",
  "Sculpture - Casted", "Sculpture - Modeled",
];

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extOf = (name: string) => {
  const e = (name.split(".").pop() || "").toLowerCase();
  return e.length > 0 && e.length <= 5 ? e : "";
};

const Files = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | SourceType>("all");
  const [kindFilter, setKindFilter] = useState<"all" | FileKind>("all");
  const [artworkType, setArtworkType] = useState<string>("all");
  const [series, setSeries] = useState<string>("all");
  const [exhibitionId, setExhibitionId] = useState<string>("all");
  const [exhibitionMode, setExhibitionMode] = useState<"all" | "solo" | "group">("all");
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
  const [extension, setExtension] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "size" | "linked">("recent");
  const [view, setView] = useState<"grid" | "list">("list");

  // Series folders
  const [seriesGroups, setSeriesGroups] = useState<{ id: string; name: string }[]>([]);
  const [dragOverSeries, setDragOverSeries] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingDropImages, setPendingDropImages] = useState<File[]>([]);
  const [pendingSeriesName, setPendingSeriesName] = useState<string>("");

  const activeRole = localStorage.getItem("activeRole") || "artist";

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    setUserId(user.id);

    const { data: sg } = await supabase
      .from("series_groups")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
    setSeriesGroups(sg || []);

    const { data: artworks } = await supabase
      .from("artworks")
      .select("id, title, year, medium, series, artwork_type")
      .eq("owner_id", user.id)
      .eq("role_context", activeRole);
    const artworkIds = (artworks || []).map(a => a.id);
    const artworkMap = new Map((artworks || []).map(a => [a.id, a]));

    const { data: exhibitions } = await supabase
      .from("exhibitions")
      .select("id, title, opening_date, venue, exhibition_type")
      .eq("user_id", user.id);
    const exhibitionMap = new Map((exhibitions || []).map(e => [e.id, e]));
    const exhibitionIds = (exhibitions || []).map(e => e.id);

    const { data: catalogues } = await supabase
      .from("catalogues")
      .select("id, title, publication_year, cover_image_path, cover_file_size, created_at")
      .eq("user_id", user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let cvEntries: any[] = [];
    if (profile?.id) {
      const { data } = await supabase
        .from("cv_entries")
        .select("id, year, section, entry_text")
        .eq("profile_id", profile.id);
      cvEntries = data || [];
    }
    const cvEntryMap = new Map(cvEntries.map(c => [c.id, c]));

    const rows: FileRow[] = [];

    if (artworkIds.length) {
      const { data: imgs } = await supabase
        .from("artwork_images")
        .select("id, artwork_id, storage_path, web_storage_path, file_size, original_size, mime_type, created_at")
        .in("artwork_id", artworkIds);
      (imgs || []).forEach((r: any) => {
        const a: any = artworkMap.get(r.artwork_id);
        if (!a) return;
        const fname = r.storage_path.split("/").pop() || "image";
        rows.push({
          id: `ai-${r.id}`,
          bucket: "artwork-images",
          storage_path: r.storage_path,
          thumb_bucket: r.web_storage_path ? "artwork-images-web" : "artwork-images",
          thumb_path: r.web_storage_path || r.storage_path,
          file_name: fname,
          file_type: r.mime_type || null,
          file_size: r.original_size ?? r.file_size ?? null,
          kind: "image",
          source: "artwork-image",
          linked_id: a.id,
          linked_title: a.title,
          linked_route: `/artwork/${a.id}`,
          year: a.year,
          medium: a.medium,
          series: a.series,
          artwork_type: a.artwork_type,
          exhibition_type: null,
          exhibition_id: null,
          extension: extOf(fname),
          caption: null,
          created_at: r.created_at,
        });
      });

      const { data: docs } = await supabase
        .from("artwork_documents")
        .select("id, artwork_id, storage_path, file_name, file_type, file_size, created_at")
        .in("artwork_id", artworkIds);
      (docs || []).forEach((r: any) => {
        const a: any = artworkMap.get(r.artwork_id);
        if (!a) return;
        rows.push({
          id: `ad-${r.id}`,
          bucket: "artwork-documents",
          storage_path: r.storage_path,
          file_name: r.file_name,
          file_type: r.file_type,
          file_size: r.file_size,
          kind: "document",
          source: "artwork-document",
          linked_id: a.id,
          linked_title: a.title,
          linked_route: `/artwork/${a.id}`,
          year: a.year,
          medium: a.medium,
          series: a.series,
          artwork_type: a.artwork_type,
          exhibition_type: null,
          exhibition_id: null,
          extension: extOf(r.file_name),
          caption: null,
          created_at: r.created_at,
        });
      });

      // Artwork-exhibition links → enrich artwork files with exhibition context
      const { data: artExh } = await supabase
        .from("artwork_exhibitions")
        .select("artwork_id, cv_entry_id")
        .in("artwork_id", artworkIds);
      // Build artwork→exhibition_id mapping (we use cv_entry_id as exhibition link in this schema)
      // Note: artwork_exhibitions.cv_entry_id can refer to cv_entries (legacy) — exhibition tagging happens via exhibition_artworks instead
      const { data: exArtLinks } = await supabase
        .from("exhibition_artworks")
        .select("exhibition_id, artwork_id")
        .in("artwork_id", artworkIds);
      const artworkExhibitionIds = new Map<string, string[]>();
      (exArtLinks || []).forEach((l: any) => {
        const list = artworkExhibitionIds.get(l.artwork_id) || [];
        list.push(l.exhibition_id);
        artworkExhibitionIds.set(l.artwork_id, list);
      });
      // Backfill exhibition_id on artwork rows when there's exactly one exhibition tied
      rows.forEach(row => {
        if (row.source === "artwork-image" || row.source === "artwork-document") {
          const exIds = artworkExhibitionIds.get(row.linked_id) || [];
          if (exIds.length > 0) {
            row.exhibition_id = exIds[0];
            const ex: any = exhibitionMap.get(exIds[0]);
            if (ex) row.exhibition_type = ex.exhibition_type === "group" ? "group" : "solo";
          }
        }
      });
    }

    if (exhibitionIds.length) {
      const { data: eimgs } = await supabase
        .from("exhibition_images")
        .select("id, exhibition_id, storage_path, web_storage_path, file_size, original_size, mime_type, caption, created_at")
        .in("exhibition_id", exhibitionIds);
      (eimgs || []).forEach((r: any) => {
        const e: any = exhibitionMap.get(r.exhibition_id);
        if (!e) return;
        const fname = r.storage_path.split("/").pop() || "image";
        rows.push({
          id: `ei-${r.id}`,
          bucket: "exhibition-images",
          storage_path: r.storage_path,
          thumb_bucket: r.web_storage_path ? "exhibition-images-web" : "exhibition-images",
          thumb_path: r.web_storage_path || r.storage_path,
          file_name: fname,
          file_type: r.mime_type || null,
          file_size: r.original_size ?? r.file_size ?? null,
          kind: "image",
          source: "exhibition-image",
          linked_id: e.id,
          linked_title: e.title,
          linked_route: `/exhibitions`,
          year: e.opening_date ? new Date(e.opening_date).getFullYear() : null,
          medium: e.venue || null,
          series: null,
          artwork_type: null,
          exhibition_type: e.exhibition_type === "group" ? "group" : "solo",
          exhibition_id: e.id,
          extension: extOf(fname),
          caption: r.caption,
          created_at: r.created_at,
        });
      });

      const { data: edocs } = await supabase
        .from("exhibition_documents")
        .select("id, exhibition_id, storage_path, file_name, file_type, file_size, created_at")
        .in("exhibition_id", exhibitionIds);
      (edocs || []).forEach((r: any) => {
        const e: any = exhibitionMap.get(r.exhibition_id);
        if (!e) return;
        rows.push({
          id: `ed-${r.id}`,
          bucket: "exhibition-documents",
          storage_path: r.storage_path,
          file_name: r.file_name,
          file_type: r.file_type,
          file_size: r.file_size,
          kind: "document",
          source: "exhibition-document",
          linked_id: e.id,
          linked_title: e.title,
          linked_route: `/exhibitions`,
          year: e.opening_date ? new Date(e.opening_date).getFullYear() : null,
          medium: e.venue || null,
          series: null,
          artwork_type: null,
          exhibition_type: e.exhibition_type === "group" ? "group" : "solo",
          exhibition_id: e.id,
          extension: extOf(r.file_name),
          caption: null,
          created_at: r.created_at,
        });
      });
    }

    (catalogues || []).forEach((c: any) => {
      if (!c.cover_image_path) return;
      const fname = c.cover_image_path.split("/").pop() || "cover";
      rows.push({
        id: `cat-${c.id}`,
        bucket: "catalogue-covers",
        storage_path: c.cover_image_path,
        file_name: fname,
        file_type: null,
        file_size: c.cover_file_size ?? null,
        kind: "image",
        source: "catalogue-cover",
        linked_id: c.id,
        linked_title: c.title,
        linked_route: `/catalogues`,
        year: c.publication_year,
        medium: null,
        series: null,
        artwork_type: null,
        exhibition_type: null,
        exhibition_id: null,
        extension: extOf(fname),
        caption: null,
        created_at: c.created_at || new Date().toISOString(),
      });
    });

    if (cvEntries.length) {
      const cvIds = cvEntries.map(c => c.id);
      const { data: cvImgs } = await supabase
        .from("cv_entry_images")
        .select("id, cv_entry_id, storage_path, file_size, original_size, mime_type, caption, created_at")
        .in("cv_entry_id", cvIds);
      (cvImgs || []).forEach((r: any) => {
        const c: any = cvEntryMap.get(r.cv_entry_id);
        if (!c) return;
        const fname = r.storage_path.split("/").pop() || "image";
        rows.push({
          id: `cv-${r.id}`,
          bucket: "cv-images",
          storage_path: r.storage_path,
          file_name: fname,
          file_type: r.mime_type || null,
          file_size: r.original_size ?? r.file_size ?? null,
          kind: "image",
          source: "cv-image",
          linked_id: c.id,
          linked_title: `${c.section || "CV"}${c.year ? " · " + c.year : ""}`,
          linked_route: `/cv`,
          year: c.year ? Number(c.year) || null : null,
          medium: null,
          series: null,
          artwork_type: null,
          exhibition_type: null,
          exhibition_id: null,
          extension: extOf(fname),
          caption: r.caption,
          created_at: r.created_at,
        });
      });
    }

    // Unlinked uploads (files not yet attached to any artwork)
    const { data: unlinked } = await supabase
      .from("user_uploads")
      .select("id, storage_path, web_storage_path, file_name, file_size, original_size, mime_type, series, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    (unlinked || []).forEach((r: any) => {
      rows.push({
        id: `up-${r.id}`,
        bucket: "artwork-images",
        storage_path: r.storage_path,
        thumb_bucket: r.web_storage_path ? "artwork-images-web" : "artwork-images",
        thumb_path: r.web_storage_path || r.storage_path,
        file_name: r.file_name,
        file_type: r.mime_type || null,
        file_size: r.original_size ?? r.file_size ?? null,
        kind: "image",
        source: "unlinked-upload",
        linked_id: r.id,
        linked_title: "Not yet attached",
        linked_route: undefined,
        year: null,
        medium: null,
        series: r.series || null,
        artwork_type: null,
        exhibition_type: null,
        exhibition_id: null,
        extension: extOf(r.file_name),
        caption: null,
        created_at: r.created_at,
      });
    });

    setFiles(rows);

    // Build thumbnails
    const thumbMap: Record<string, string> = {};
    rows.forEach(r => {
      if (r.kind !== "image") return;
      const bucket = r.thumb_bucket || r.bucket;
      const path = r.thumb_path || r.storage_path;
      if (PUBLIC_BUCKETS.has(bucket)) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        thumbMap[r.id] = data.publicUrl;
      }
    });
    setThumbs(thumbMap);
    setLoading(false);
  };

  // Derived filter option lists
  const seriesOptions = useMemo(() => {
    const s = new Set<string>();
    files.forEach(f => { if (f.series) s.add(f.series); });
    return Array.from(s).sort();
  }, [files]);

  const exhibitionOptions = useMemo(() => {
    const m = new Map<string, { id: string; title: string; type: "solo" | "group" | null }>();
    files.forEach(f => {
      if (f.exhibition_id && !m.has(f.exhibition_id)) {
        m.set(f.exhibition_id, { id: f.exhibition_id, title: f.linked_title, type: f.exhibition_type });
      }
    });
    return Array.from(m.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [files]);

  const extensionOptions = useMemo(() => {
    const s = new Set<string>();
    files.forEach(f => { if (f.extension) s.add(f.extension); });
    return Array.from(s).sort();
  }, [files]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const yFrom = yearFrom ? Number(yearFrom) : null;
    const yTo = yearTo ? Number(yearTo) : null;
    let arr = files.filter(f => {
      if (sourceFilter !== "all" && f.source !== sourceFilter) return false;
      if (kindFilter !== "all" && f.kind !== kindFilter) return false;
      if (artworkType !== "all" && f.artwork_type !== artworkType) return false;
      if (series !== "all" && f.series !== series) return false;
      if (exhibitionMode !== "all" && f.exhibition_type !== exhibitionMode) return false;
      if (exhibitionId !== "all" && f.exhibition_id !== exhibitionId) return false;
      if (extension !== "all" && f.extension !== extension) return false;
      if (yFrom !== null && (f.year == null || f.year < yFrom)) return false;
      if (yTo !== null && (f.year == null || f.year > yTo)) return false;
      if (!q) return true;
      return (
        (f.file_name || "").toLowerCase().includes(q) ||
        (f.linked_title || "").toLowerCase().includes(q) ||
        (f.medium || "").toLowerCase().includes(q) ||
        (f.series || "").toLowerCase().includes(q) ||
        (f.caption || "").toLowerCase().includes(q) ||
        (f.year ? String(f.year).includes(q) : false)
      );
    });
    arr = [...arr].sort((a, b) => {
      if (sortBy === "name") return (a.file_name || "").localeCompare(b.file_name || "");
      if (sortBy === "size") return (b.file_size || 0) - (a.file_size || 0);
      if (sortBy === "linked") return (a.linked_title || "").localeCompare(b.linked_title || "");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return arr;
  }, [files, query, sourceFilter, kindFilter, artworkType, series, exhibitionId, exhibitionMode, extension, yearFrom, yearTo, sortBy]);

  const handleDownload = async (f: FileRow) => {
    try {
      if (PUBLIC_BUCKETS.has(f.bucket)) {
        const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.storage_path);
        window.open(data.publicUrl, "_blank");
      } else {
        const { data, error } = await supabase.storage.from(f.bucket).createSignedUrl(f.storage_path, 60);
        if (error || !data?.signedUrl) throw error;
        window.open(data.signedUrl, "_blank");
      }
    } catch {
      toast.error("Failed to open file");
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: files.length };
    files.forEach(f => { c[f.source] = (c[f.source] || 0) + 1; });
    return c;
  }, [files]);

  const activeFilterCount = [
    sourceFilter !== "all", kindFilter !== "all", artworkType !== "all",
    series !== "all", exhibitionId !== "all", exhibitionMode !== "all",
    extension !== "all", !!yearFrom, !!yearTo,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSourceFilter("all"); setKindFilter("all"); setArtworkType("all");
    setSeries("all"); setExhibitionId("all"); setExhibitionMode("all");
    setExtension("all"); setYearFrom(""); setYearTo("");
  };

  // Series-folder counts (only image files belonging to artworks)
  const seriesCounts = useMemo(() => {
    const m: Record<string, number> = {};
    files.forEach(f => {
      if (f.source === "artwork-image" && f.series) {
        m[f.series] = (m[f.series] || 0) + 1;
      }
    });
    return m;
  }, [files]);

  const handleFolderDrop = (e: React.DragEvent, seriesName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSeries(null);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (dropped.length === 0) {
      toast.error("Drop image files only");
      return;
    }
    setPendingDropImages(dropped);
    setPendingSeriesName(seriesName);
    setAddDialogOpen(true);
  };

  const openSeriesFolder = (seriesName: string) => {
    setSeries(seriesName);
    setSourceFilter("artwork-image");
  };

  const headerActions = (
    <div className="flex items-center gap-3">
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
        <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most recent</SelectItem>
          <SelectItem value="name">File name</SelectItem>
          <SelectItem value="linked">Linked entry</SelectItem>
          <SelectItem value="size">File size</SelectItem>
        </SelectContent>
      </Select>
      <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)} size="sm">
        <ToggleGroupItem value="list" aria-label="List view"><List className="w-3.5 h-3.5" /></ToggleGroupItem>
        <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid className="w-3.5 h-3.5" /></ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  return (
    <AppLayout title="Files" headerActions={headerActions}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Storage usage meter */}
        {userId && <StorageUsageMeter userId={userId} />}

        {/* Series folders — drag-and-drop image files to add artworks to a series */}
        {seriesGroups.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Series folders</h3>
              <span className="text-[11px] text-muted-foreground">Drop image files into a folder to add a new artwork to that series</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {seriesGroups.map((s) => {
                const isOver = dragOverSeries === s.name;
                const count = seriesCounts[s.name] || 0;
                return (
                  <div
                    key={s.id}
                    onClick={() => openSeriesFolder(s.name)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverSeries(s.name); }}
                    onDragLeave={() => setDragOverSeries((cur) => (cur === s.name ? null : cur))}
                    onDrop={(e) => handleFolderDrop(e, s.name)}
                    className={`group cursor-pointer rounded-sm border px-3 py-3 transition-colors ${
                      isOver
                        ? "border-foreground bg-accent ring-2 ring-foreground/30"
                        : "border-border border-dashed hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isOver ? (
                        <FolderOpen className="w-4 h-4 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium truncate">{s.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {count} {count === 1 ? "image" : "images"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file name, artwork title, exhibition, year, medium, caption…"
            className="pl-9"
          />
        </div>

        {/* Source chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <button
            onClick={() => setSourceFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sourceFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            All <span className="opacity-60">({counts.all || 0})</span>
          </button>
          {(Object.keys(SOURCE_LABEL) as SourceType[]).map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sourceFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
            >
              {SOURCE_LABEL[s]} <span className="opacity-60">({counts[s] || 0})</span>
            </button>
          ))}
        </div>

        {/* Metadata filters row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="File type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All file types</SelectItem>
              <SelectItem value="image">Images only</SelectItem>
              <SelectItem value="document">Documents only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={extension} onValueChange={setExtension}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Extension" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All extensions</SelectItem>
              {extensionOptions.map(e => (
                <SelectItem key={e} value={e}>.{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={artworkType} onValueChange={setArtworkType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Artwork type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All artwork types</SelectItem>
              {ARTWORK_TYPE_OPTIONS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={series} onValueChange={setSeries}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Series" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All series</SelectItem>
              {seriesOptions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={exhibitionMode} onValueChange={(v) => setExhibitionMode(v as any)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Solo / Group" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Solo & Group</SelectItem>
              <SelectItem value="solo">Solo only</SelectItem>
              <SelectItem value="group">Group only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={exhibitionId} onValueChange={setExhibitionId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Exhibition" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exhibitions</SelectItem>
              {exhibitionOptions.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year range + clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Year</span>
          <Input
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="from"
            className="h-8 text-xs w-20"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="to"
            className="h-8 text-xs w-20"
          />
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 ml-auto" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear filters ({activeFilterCount})
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? "file" : "files"}
          </span>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-secondary animate-pulse rounded-sm" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">No files match your search.</div>
        ) : view === "list" ? (
          <div className="border border-border rounded-sm divide-y divide-border">
            {filtered.map(f => (
              <div key={f.id} className="flex items-center gap-4 px-3 py-2.5 hover:bg-accent/50 transition-colors">
                <div className="w-10 h-10 bg-secondary rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                  {f.kind === "image" && thumbs[f.id] ? (
                    <img src={thumbs[f.id]} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : f.kind === "image" ? (
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.file_name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{f.linked_title}</span>
                    {f.year && <><span>·</span><span>{f.year}</span></>}
                    {f.artwork_type && <><span>·</span><span className="truncate">{f.artwork_type}</span></>}
                    {f.series && <><span>·</span><span className="truncate">{f.series}</span></>}
                    {f.exhibition_type && <><span>·</span><span className="capitalize">{f.exhibition_type}</span></>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{SOURCE_LABEL[f.source]}</Badge>
                {f.extension && <span className="text-[10px] text-muted-foreground uppercase shrink-0">.{f.extension}</span>}
                {f.file_size != null && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{formatSize(f.file_size)}</span>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(f)} title="Open / download original">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                {f.linked_route && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(f.linked_route!)} title="Go to entry">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(f => (
              <div key={f.id} className="group border border-border rounded-sm overflow-hidden hover:shadow-sm transition-all">
                <div className="aspect-square bg-secondary relative">
                  {f.kind === "image" && thumbs[f.id] ? (
                    <img src={thumbs[f.id]} alt={f.file_name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleDownload(f)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {f.linked_route && (
                      <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => navigate(f.linked_route!)}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{f.linked_title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {SOURCE_LABEL[f.source]}{f.year ? ` · ${f.year}` : ""}{f.extension ? ` · .${f.extension}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddArtworkDialog
        open={addDialogOpen}
        onOpenChange={(o) => {
          setAddDialogOpen(o);
          if (!o) {
            setPendingDropImages([]);
            setPendingSeriesName("");
          }
        }}
        onSuccess={() => {
          fetchAll();
        }}
        userRole={activeRole}
        initialData={pendingSeriesName ? ({ series: pendingSeriesName } as ArtworkDuplicateData) : null}
        initialImages={pendingDropImages}
      />
    </AppLayout>
  );
};

export default Files;
