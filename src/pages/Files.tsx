import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Search, Download, FileText, Image as ImageIcon, LayoutGrid, List, ExternalLink, Filter } from "lucide-react";
import { toast } from "sonner";

type FileKind = "image" | "document";
type SourceType = "artwork-image" | "artwork-document" | "exhibition-image" | "exhibition-document" | "catalogue-cover" | "cv-image";

interface FileRow {
  id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  kind: FileKind;
  source: SourceType;
  // metadata for search/filter
  linked_id: string;            // entity id (artwork/exhibition/catalogue/cv)
  linked_title: string;         // human label
  linked_route?: string;        // navigation
  year: number | null;
  medium: string | null;
  series: string | null;
  artwork_type: string | null;
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
};

const PUBLIC_BUCKETS = new Set(["artwork-images", "exhibition-images", "catalogue-covers", "cv-images", "profile-photos"]);

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Files = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | SourceType>("all");
  const [kindFilter, setKindFilter] = useState<"all" | FileKind>("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "size" | "linked">("recent");
  const [view, setView] = useState<"grid" | "list">("list");
  const activeRole = localStorage.getItem("activeRole") || "artist";

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    // Fetch artworks (for both image + doc joins) scoped to active role
    const { data: artworks } = await supabase
      .from("artworks")
      .select("id, title, year, medium, series, artwork_type")
      .eq("owner_id", user.id)
      .eq("role_context", activeRole);

    const artworkIds = (artworks || []).map(a => a.id);
    const artworkMap = new Map((artworks || []).map(a => [a.id, a]));

    // Exhibitions are not role-scoped in schema; fetch all owned by user
    const { data: exhibitions } = await supabase
      .from("exhibitions")
      .select("id, title, opening_date, venue")
      .eq("user_id", user.id);
    const exhibitionMap = new Map((exhibitions || []).map(e => [e.id, e]));
    const exhibitionIds = (exhibitions || []).map(e => e.id);

    const { data: catalogues } = await supabase
      .from("catalogues")
      .select("id, title, publication_year, cover_image_path")
      .eq("user_id", user.id);

    // Profile + cv entries
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

    // Artwork images
    if (artworkIds.length) {
      const { data: imgs } = await supabase
        .from("artwork_images")
        .select("id, artwork_id, storage_path, created_at")
        .in("artwork_id", artworkIds);
      (imgs || []).forEach((r: any) => {
        const a: any = artworkMap.get(r.artwork_id);
        if (!a) return;
        rows.push({
          id: `ai-${r.id}`,
          bucket: "artwork-images",
          storage_path: r.storage_path,
          file_name: r.storage_path.split("/").pop() || "image",
          file_type: null,
          file_size: null,
          kind: "image",
          source: "artwork-image",
          linked_id: a.id,
          linked_title: a.title,
          linked_route: `/artwork/${a.id}`,
          year: a.year,
          medium: a.medium,
          series: a.series,
          artwork_type: a.artwork_type,
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
          caption: null,
          created_at: r.created_at,
        });
      });
    }

    // Exhibition images & docs
    if (exhibitionIds.length) {
      const { data: eimgs } = await supabase
        .from("exhibition_images")
        .select("id, exhibition_id, storage_path, caption, created_at")
        .in("exhibition_id", exhibitionIds);
      (eimgs || []).forEach((r: any) => {
        const e: any = exhibitionMap.get(r.exhibition_id);
        if (!e) return;
        rows.push({
          id: `ei-${r.id}`,
          bucket: "exhibition-images",
          storage_path: r.storage_path,
          file_name: r.storage_path.split("/").pop() || "image",
          file_type: null,
          file_size: null,
          kind: "image",
          source: "exhibition-image",
          linked_id: e.id,
          linked_title: e.title,
          linked_route: `/exhibitions`,
          year: e.opening_date ? new Date(e.opening_date).getFullYear() : null,
          medium: e.venue || null,
          series: null,
          artwork_type: null,
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
          caption: null,
          created_at: r.created_at,
        });
      });
    }

    // Catalogue covers
    (catalogues || []).forEach((c: any) => {
      if (!c.cover_image_path) return;
      rows.push({
        id: `cat-${c.id}`,
        bucket: "catalogue-covers",
        storage_path: c.cover_image_path,
        file_name: c.cover_image_path.split("/").pop() || "cover",
        file_type: null,
        file_size: null,
        kind: "image",
        source: "catalogue-cover",
        linked_id: c.id,
        linked_title: c.title,
        linked_route: `/catalogues`,
        year: c.publication_year,
        medium: null,
        series: null,
        artwork_type: null,
        caption: null,
        created_at: c.created_at || new Date().toISOString(),
      });
    });

    // CV images
    if (cvEntries.length) {
      const cvIds = cvEntries.map(c => c.id);
      const { data: cvImgs } = await supabase
        .from("cv_entry_images")
        .select("id, cv_entry_id, storage_path, caption, created_at")
        .in("cv_entry_id", cvIds);
      (cvImgs || []).forEach((r: any) => {
        const c: any = cvEntryMap.get(r.cv_entry_id);
        if (!c) return;
        rows.push({
          id: `cv-${r.id}`,
          bucket: "cv-images",
          storage_path: r.storage_path,
          file_name: r.storage_path.split("/").pop() || "image",
          file_type: null,
          file_size: null,
          kind: "image",
          source: "cv-image",
          linked_id: c.id,
          linked_title: `${c.section || "CV"}${c.year ? " · " + c.year : ""}`,
          linked_route: `/cv`,
          year: c.year ? Number(c.year) || null : null,
          medium: null,
          series: null,
          artwork_type: null,
          caption: r.caption,
          created_at: r.created_at,
        });
      });
    }

    setFiles(rows);

    // Build thumbnail URLs for image-kind rows in public buckets
    const thumbMap: Record<string, string> = {};
    rows.forEach(r => {
      if (r.kind === "image" && PUBLIC_BUCKETS.has(r.bucket)) {
        const { data } = supabase.storage.from(r.bucket).getPublicUrl(r.storage_path);
        thumbMap[r.id] = data.publicUrl;
      }
    });
    setThumbs(thumbMap);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = files.filter(f => {
      if (sourceFilter !== "all" && f.source !== sourceFilter) return false;
      if (kindFilter !== "all" && f.kind !== kindFilter) return false;
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
  }, [files, query, sourceFilter, kindFilter, sortBy]);

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

  const headerActions = (
    <div className="flex items-center gap-3">
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
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

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: files.length };
    files.forEach(f => { c[f.source] = (c[f.source] || 0) + 1; });
    return c;
  }, [files]);

  return (
    <AppLayout title="Files" headerActions={headerActions}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
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

        {/* Source filters as chips */}
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
          <div className="ml-auto">
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as any)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image">Images only</SelectItem>
                <SelectItem value="document">Documents only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-secondary animate-pulse rounded-sm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No files match your search.
          </div>
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
                    {f.medium && <><span>·</span><span className="truncate">{f.medium}</span></>}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{SOURCE_LABEL[f.source]}</Badge>
                {f.file_size != null && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{formatSize(f.file_size)}</span>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(f)} title="Open / download">
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
                  <div className="text-[10px] text-muted-foreground truncate">{SOURCE_LABEL[f.source]}{f.year ? ` · ${f.year}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Files;
