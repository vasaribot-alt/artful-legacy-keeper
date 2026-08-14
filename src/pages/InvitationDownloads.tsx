import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LangEntry = {
  code: string;
  english: string;
  native: string;
  lead: string;
  cta: string;
  file: string;
};

const LANGUAGES: LangEntry[] = [
  {
    code: "EN",
    english: "English",
    native: "English",
    lead: "An invitation to artists — authoritative version.",
    cta: "Download PDF",
    file: "/invitation/GARF_Invitation_to_Artists_EN.pdf",
  },
  {
    code: "DE",
    english: "German",
    native: "Deutsch",
    lead: "Eine Einladung an Künstlerinnen und Künstler.",
    cta: "PDF herunterladen",
    file: "/invitation/GARF_Invitation_to_Artists_DE.pdf",
  },
  {
    code: "FR",
    english: "French",
    native: "Français",
    lead: "Une invitation adressée aux artistes.",
    cta: "Télécharger le PDF",
    file: "/invitation/GARF_Invitation_to_Artists_FR.pdf",
  },
  {
    code: "ES",
    english: "Spanish",
    native: "Español",
    lead: "Una invitación para artistas.",
    cta: "Descargar PDF",
    file: "/invitation/GARF_Invitation_to_Artists_ES.pdf",
  },
  {
    code: "IT",
    english: "Italian",
    native: "Italiano",
    lead: "Un invito rivolto agli artisti.",
    cta: "Scarica il PDF",
    file: "/invitation/GARF_Invitation_to_Artists_IT.pdf",
  },
  {
    code: "PL",
    english: "Polish",
    native: "Polski",
    lead: "Zaproszenie dla artystów.",
    cta: "Pobierz PDF",
    file: "/invitation/GARF_Invitation_to_Artists_PL.pdf",
  },
];

export default function InvitationDownloads() {
  const [confirmLang, setConfirmLang] = useState<LangEntry | null>(null);

  useEffect(() => {
    document.title = "Invitation to artists — download in your language | GARF";
    const desc =
      "Download the Global Artist Registry Foundation invitation to artists as a PDF in English, German, French, Spanish, Italian or Polish.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  const triggerDownload = (lang: LangEntry) => {
    const a = document.createElement("a");
    a.href = lang.file;
    a.download = lang.file.split("/").pop() || "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadClick = (lang: LangEntry) => {
    if (lang.code === "EN") {
      triggerDownload(lang);
      return;
    }
    setConfirmLang(lang);
  };

  const confirmDownload = () => {
    if (confirmLang) {
      triggerDownload(confirmLang);
      setConfirmLang(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Global Artist Registry Foundation
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">For artist organisations and their members</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Invitation to artists</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          This one-page invitation may be forwarded freely to members — by newsletter, members' area or email.
          Choose a language below. Registration in the registry is free for life for every ID-verified artist.
        </p>

        <section aria-labelledby="downloads" className="mt-12">
          <h2 id="downloads" className="text-sm uppercase tracking-widest text-muted-foreground">
            Download
          </h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {LANGUAGES.map((lang) => (
              <li key={lang.code} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-medium">{lang.native}</span>
                    {lang.native !== lang.english && (
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">{lang.english}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lang.lead}</p>
                </div>
                <Button variant="outline" className="shrink-0" onClick={() => handleDownloadClick(lang)}>
                  <Download className="mr-2 h-4 w-4" />
                  {lang.cta}
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Translations are provided for information. The English version is the authoritative one.
          </p>
        </section>

        <section className="mt-14 rounded-md border border-border p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-2 text-sm">
              <p className="font-medium">What we are asking — and what we are not asking</p>
              <p className="text-muted-foreground">
                We ask organisations only to forward this invitation to their members. We do not ask for member
                lists, email addresses or any personal data — membership data stays with the organisation.
                Registration is free for life for ID-verified artists, who own their archive and can export it at
                any time. GARF is not a marketplace, dealer or agent.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-12 text-sm text-muted-foreground">
          Questions? Write to{" "}
          <a className="underline" href="mailto:outreach@globalartistregistry.org">
            outreach@globalartistregistry.org
          </a>
          .
        </p>
      </main>

      <Dialog open={confirmLang !== null} onOpenChange={(open) => !open && setConfirmLang(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>English is the authoritative version</DialogTitle>
            <DialogDescription>
              You are about to download the {confirmLang?.english} translation of the artist invitation.
              Translations are provided for information only. The English version is the legally authoritative
              version and prevails in case of any discrepancy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLang(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDownload}>
              <Download className="mr-2 h-4 w-4" />
              I understand — download {confirmLang?.english}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
