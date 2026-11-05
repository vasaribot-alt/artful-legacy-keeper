import { Link } from "react-router-dom";
import { BookOpen, Database, FileArchive, FileSpreadsheet, Globe, Images, CalendarDays, ClipboardList, Files, Heart, Users, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const artistFeatures = [
  { icon: Database, title: "Artwork catalogue", description: "Document your body of work with images, dimensions, materials, editions, provenance and permanent GAWID artwork identifiers. Organise works into series." },
  { icon: ClipboardList, title: "Inventory and locations", description: "Keep track of available and sold works, their current locations and location history, alongside their documentation." },
  { icon: CalendarDays, title: "Exhibitions and planning", description: "Record solo and group exhibitions, venues, dates and curators. Link your works, add installation photographs and texts, and prepare with a checklist, budget and live documentation check." },
  { icon: BookOpen, title: "Exhibition catalogue PDFs", description: "Create a catalogue from an exhibition’s linked works. Choose one or two works per page, select and reorder works, edit text and captions, then preview before downloading." },
  { icon: FileArchive, title: "Archival documents", description: "Preserve letters, articles, certificates, notes, posters and photographs with individual archival references and contextual information. Documents are private unless you publish them." },
  { icon: BookOpen, title: "Sketchbooks", description: "Upload a PDF or combine ordered page photographs into a readable sketchbook while retaining the originals. Choose public or private visibility; public PDF downloads are off by default." },
  { icon: Globe, title: "Your own artist website", description: "Build and manage a website using your GARF records, with selected works, biography, exhibitions, contact information and published sketchbooks and documents." },
  { icon: IdCard, title: "Artist profile and CV", description: "Maintain your biography and professional history, import an existing CV and keep exhibition entries connected to your exhibition records. Share a public profile with selected content." },
  { icon: Images, title: "Portfolios and publications", description: "Group selected works into portfolios with shareable links, and record published catalogues and the pages on which your works appear." },
  { icon: FileSpreadsheet, title: "Import and export", description: "Import artwork records from Excel and add the corresponding images. Download your own artwork records as CSV or Excel, including image filenames and web addresses where available." },
  { icon: Files, title: "Files and archive storage", description: "Browse your stored images, PDFs and other archive files in one place, and see how much of your assigned storage allowance you are using." },
  { icon: Users, title: "Registrar assistance", description: "Invite a registrar to help manage your archive through authorised access, without giving up ownership or control of your records." },
  { icon: Heart, title: "Preservation and succession", description: "Name heirs or successors for your archive. GARF’s 100-year preservation plan is designed to keep your documentation accessible to future generations." },
];

export default function ArtistFeatureOverview() {
  return (
    <section id="artist-features" aria-labelledby="artist-features-title" className="scroll-mt-20 border-t border-border px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">For artists</p>
          <h2 id="artist-features-title" className="mb-5 text-3xl">Your artist archive, from studio to legacy</h2>
          <p className="text-base leading-relaxed text-muted-foreground">Artist accounts are free. Build your catalogue, preserve the records around your work and manage your own website. Your records remain yours, and you decide what to publish or share.</p>
        </div>
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {artistFeatures.map(({ icon: Icon, title, description }) => (
            <div key={title}>
              <Icon aria-hidden="true" className="mb-4 h-5 w-5 text-muted-foreground" />
              <h3 className="mb-2 text-xl">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-4">
          <Button asChild><Link to="/register">Create your artist account</Link></Button>
          <Button asChild variant="outline"><Link to="/tutorials">Tutorials and planning downloads</Link></Button>
        </div>
      </div>
    </section>
  );
}