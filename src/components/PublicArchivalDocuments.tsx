import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArchivalDocumentViewer, type ArchivalDocument } from "./ArchivalDocumentViewer";
import { FileText } from "lucide-react";
export function PublicArchivalDocuments({ documents }: { documents: ArchivalDocument[] }) {
  const [selected, setSelected] = useState<ArchivalDocument | null>(null);
  const [search, setSearch] = useState("");
  return <div className="space-y-4"><Input autoComplete="off" aria-label="Search archival documents" placeholder="Search archival documents" value={search} onChange={e => setSearch(e.target.value)} />
    {documents.filter(d => `${d.title} ${d.reference_number} ${d.context ?? ""} ${d.document_type} ${d.document_date ?? ""}`.toLowerCase().includes(search.toLowerCase())).map(d => <article key={d.id} className="border-b border-border py-5 space-y-2">
      <p className="font-mono text-xs text-muted-foreground">{d.reference_number}</p><h3 className="font-serif text-xl break-words">{d.title}</h3><p className="text-xs text-muted-foreground">{d.document_type}{d.document_date ? ` · ${d.document_date}` : ""}</p>{d.context && <p className="text-sm whitespace-pre-wrap break-words">{d.context}</p>}<Button variant="outline" onClick={() => setSelected(d)}><FileText className="h-4 w-4 mr-2" />View document</Button>
    </article>)}<ArchivalDocumentViewer document={selected} onClose={() => setSelected(null)} />
  </div>;
}