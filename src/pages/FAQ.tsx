import GarfLogo from "@/components/GarfLogo";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { InstagramLink } from "@/components/SocialLinks";
import { Search, Download, ArrowRight } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqSection = {
  id: string;
  label: string;
  items: FaqItem[];
};

const faqData: FaqSection[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        question: "What is the Global Artist Registry Foundation?",
        answer:
          "The Global Artist Registry Foundation (GARF) is an independent Dutch stichting that preserves the documentation of contemporary art. Artists, collectors and estates can build an archival record of artworks, exhibitions, provenance and professional history, protected by verified identity and designed to last at least 100 years.",
      },
      {
        question: "Is GARF free to use?",
        answer:
          "Registration and lifetime use are free for every artist who completes ID verification. Collectors, estates and some professional users choose a storage tier that matches the size and needs of their collection. The core cultural mission is funded by donations, supporters and institutional partnerships.",
      },
      {
        question: "What does the 100 year preservation plan mean?",
        answer:
          "Every verified record is stored with redundant, archival grade infrastructure and open metadata standards. The Foundation is structured to outlast single institutions, markets or platforms, so the documentation remains accessible to scholars, families and catalogues raisonnés for generations.",
      },
      {
        question: "Is GARF an art marketplace or dealer?",
        answer:
          "No. GARF does not sell artworks, represent artists or take commissions. It is a neutral, non profit record keeper. The database exists to protect information, not to facilitate transactions.",
      },
      {
        question: "How is GARF governed?",
        answer:
          "GARF is a stichting under Dutch law, registered with KvK 42024490. It has no commercial owners and is overseen by a board, with the support of advisers in collections management, art history and archival practice.",
      },
    ],
  },
  {
    id: "artists",
    label: "Artists",
    items: [
      {
        question: "How do I register as an artist?",
        answer:
          "Create an account, complete your profile and go through ID verification. Once verified, your artist status is confirmed and you can begin documenting your catalogue raisonné.",
      },
      {
        question: "Why do I need ID verification?",
        answer:
          "Verified identity is what makes the registry trustworthy. It confirms that the artist is the real source of the record, protects against impersonation and gives museums, collectors and researchers confidence in the data.",
      },
      {
        question: "What can I record about each artwork?",
        answer:
          "You can add images, title, year, dimensions, medium, edition details, provenance, exhibition history, catalogues, condition notes, location history and related documents. Every work receives a permanent GAWID identifier.",
      },
      {
        question: "Can I import an existing catalogue or spreadsheet?",
        answer:
          "Yes. The bulk import tool accepts Excel files and analyses the columns automatically. It also supports a gallery handover template designed for transfers from gallery systems.",
      },
      {
        question: "What is a catalogue raisonné?",
        answer:
          "A catalogue raisonné is a comprehensive, scholarly record of an artist's entire body of work. GARF gives artists the tools to build and maintain this record over a lifetime, with committee review options for formal publication.",
      },
      {
        question: "Can I share my artist profile publicly?",
        answer:
          "Yes. Verified artists can publish a public profile with selected artworks, exhibitions and CV. You control what is visible and what remains private.",
      },
      {
        question: "What happens if my registrar adds a record I do not recognise?",
        answer:
          "You receive a verification request. You can approve the record if it is correct, or decline it with a reason. Declined records do not appear in your public catalogue.",
      },
      {
        question: "Do I keep ownership of my data?",
        answer:
          "Yes. You retain control of your content. The Foundation holds it in trust for preservation, and you decide what is public, shared or private.",
      },
    ],
  },
  {
    id: "collectors",
    label: "Collectors",
    items: [
      {
        question: "What can I record in a collector account?",
        answer:
          "A collector account is a collection management system. You can record artworks, acquisitions, provenance, current location, value history, condition reports, insurance details and loan availability.",
      },
      {
        question: "How do I track provenance and value?",
        answer:
          "Each artwork has dedicated provenance and valuation sections. You can add purchase details, appraisals, sale history and notes, with full audit trails.",
      },
      {
        question: "Can I record where each work is located?",
        answer:
          "Yes. The location history tracks the physical place of each work over time, including storage, loans, exhibitions and private residences. Hierarchical locations make large collections easy to organise.",
      },
      {
        question: "What does 'willing to lend' mean?",
        answer:
          "When you mark a work as willing to lend, museums and accredited institutions can discover it through controlled channels and reach out to request a loan for an exhibition. You always approve each request individually.",
      },
      {
        question: "Can I invite a registrar to help catalogue my collection?",
        answer:
          "Yes. You can grant registrar access to a verified professional from the public directory. They can help document works while your ownership and privacy settings remain under your control.",
      },
      {
        question: "Can I export my collection data?",
        answer:
          "Yes. You can export collection reports and insurance documentation from your collection, and use the ArtLogic compatible CSV export when transferring data to gallery systems.",
      },
    ],
  },
  {
    id: "registrars",
    label: "Registrars",
    items: [
      {
        question: "How do I join the registrar directory?",
        answer:
          "Apply through /registrar/apply. The Foundation reviews your credentials, references and professional background against ARCS aligned vetting standards. Approved registrars appear in the public directory.",
      },
      {
        question: "How do client accounts work?",
        answer:
          "Once approved, a registrar can be invited by an artist or collector. This opens a client scoped workspace where you can add and edit records on their behalf, subject to their approval.",
      },
      {
        question: "Can I import existing data for a client?",
        answer:
          "Yes. The bulk import and folder upload tools accept spreadsheets, image folders and nested archive structures. The system analyses spreadsheets automatically and matches images by filename or title.",
      },
      {
        question: "What exports are available?",
        answer:
          "You can export catalogue reports, insurance documents and an ArtLogic compatible CSV. This makes it easy to move structured data between GARF and gallery management systems.",
      },
      {
        question: "Can an artist decline a record I add?",
        answer:
          "Yes. Records you create on behalf of a client enter a pending verification state. The artist or collector approves or declines them. This protects the integrity of the catalogue.",
      },
      {
        question: "Is my registrar listing public?",
        answer:
          "Your public profile is visible in the registrar directory only when you choose to list it. You control availability, specialities and contact preferences.",
      },
    ],
  },
  {
    id: "organisations",
    label: "Organisations",
    items: [
      {
        question: "What is the GARF Global Alliance?",
        answer:
          "The Global Alliance connects artist organisations, museums, galleries, universities, corporate collections, foundations and registrars around a shared infrastructure for art documentation. Partners help spread awareness without handing over member data.",
      },
      {
        question: "How can our organisation partner with GARF?",
        answer:
          "Contact the Foundation or use the partner join link. We create a branded member landing page and, when appropriate, an aggregate dashboard that shows how many members have registered through your network.",
      },
      {
        question: "Do we have to share member lists or contact details?",
        answer:
          "No. GARF never requests member lists, emails or personal data from partner organisations. You simply forward the invitation or embed the member link, and members register directly.",
      },
      {
        question: "What does the partner dashboard show?",
        answer:
          "The dashboard displays aggregate counts only, such as how many members have started registration. It never shows names, emails or individual records unless a member explicitly connects with you through the platform.",
      },
      {
        question: "Can universities or museums use GARF for research?",
        answer:
          "Yes. Verified public artist profiles and the Catalogue Raisonné directory are designed for scholarly use. Researchers can cite permanent GAWID identifiers and rely on authenticated, structured metadata.",
      },
      {
        question: "How do galleries support the Alliance?",
        answer:
          "Supporting galleries help invite artists to register and can share documentation with artists so they can build their own archival records. GARF is not a competitor to gallery systems; it preserves the artist's independent master record.",
      },
    ],
  },
];

export default function FAQ() {
  useEffect(() => {
    document.title = "Frequently Asked Questions | Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Answers for artists, collectors, registrars and organisations about the Global Artist Registry Foundation, verification, preservation and data ownership."
      );
    }
  }, []);

  const [search, setSearch] = useState("");

  const filtered = faqData.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase())
    ),
  }));

  const hasResults = filtered.some((section) => section.items.length > 0);
  const initialTab = "general";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/">
            <GarfLogo className="h-20" />
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
            <InstagramLink />
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-32 pb-12 px-6 border-b border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Help centre
          </p>
          <h1 className="text-4xl md:text-5xl leading-[1.05] mb-5 text-balance">
            Frequently asked questions
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Quick answers for artists, collectors, registrars and organisations.
          </p>
        </div>
      </header>

      {/* Search + download */}
      <section className="py-10 px-6 border-b border-border bg-muted/30">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="pl-9"
            />
          </div>
          <a href="/GARF_FAQ.pdf" download>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </a>
        </div>
      </section>

      {/* FAQ tabs */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          {hasResults ? (
            <Tabs defaultValue={initialTab} className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto justify-start gap-1 bg-transparent p-0 mb-8">
                {filtered.map((section) => (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    disabled={section.items.length === 0}
                    className="rounded-full border border-border px-4 py-2 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:border-foreground disabled:opacity-40"
                  >
                    {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {filtered.map((section) => (
                <TabsContent key={section.id} value={section.id}>
                  <Accordion type="multiple" className="w-full">
                    {section.items.map((item, idx) => (
                      <AccordionItem key={idx} value={`${section.id}-${idx}`}>
                        <AccordionTrigger className="text-left text-base font-medium">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">No questions matched your search.</p>
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Still need help */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            If you cannot find the answer you need, contact us directly. We normally reply within two business days.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/contact">
              <Button className="gap-2">
                Contact us <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/support">
              <Button variant="outline">Support the Foundation</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-3 text-sm text-muted-foreground">
          <div>
            <div className="font-medium text-foreground mb-2">Global Artist Registry Foundation</div>
            <div>Jan Pieterszoon Coenstraat 7</div>
            <div>2595 WP 's-Gravenhage</div>
            <div>The Hague, Netherlands</div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-2">Contact</div>
            <div>
              <a href="mailto:contact@globalartistregistry.org" className="hover:text-foreground">
                contact@globalartistregistry.org
              </a>
            </div>
            <div className="mt-2">
              <InstagramLink variant="inline" />
            </div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-2">Registration</div>
            <div>KvK 42024490</div>
            <div>Stichting under Dutch law</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
