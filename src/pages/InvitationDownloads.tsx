import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Copy, Download, ShieldCheck } from "lucide-react";
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

// Ready-to-forward notice organisations can paste into a newsletter, members'
// area or email, so members who read English with difficulty find translations.
const FORWARD_NOTICE: { code: string; native: string; text: string }[] = [
  {
    code: "EN",
    native: "English",
    text: "Invitation to artists — Global Artist Registry Foundation (GARF)\n\nGARF is a Dutch non-profit foundation building a permanent archival registry of artists' works, with a documented 100-year preservation plan. Registration is free for life for every ID-verified artist, and each artist owns their archive and can export it at any time.\n\nThe attached invitation is in English (the legally authoritative version). If you prefer to read it in your own language, translations in German, French, Spanish, Italian and Polish can be downloaded free of charge at https://globalartistregistry.org/invitation\n\nMore information: https://globalartistregistry.org",
  },
  {
    code: "DE",
    native: "Deutsch",
    text: "Einladung an Künstlerinnen und Künstler — Global Artist Registry Foundation (GARF)\n\nGARF ist eine niederländische Non-Profit-Stiftung, die ein dauerhaftes Archivregister für Werke von Künstlerinnen und Künstlern aufbaut, mit einem dokumentierten 100-Jahre-Erhaltungsplan. Die Registrierung ist für alle identitätsgeprüften Künstlerinnen und Künstler lebenslang kostenlos; das Archiv gehört der Künstlerin bzw. dem Künstler und kann jederzeit exportiert werden.\n\nDie beigefügte Einladung ist auf Englisch (rechtlich verbindliche Version). Übersetzungen in Deutsch, Französisch, Spanisch, Italienisch und Polnisch stehen kostenlos zum Download bereit: https://globalartistregistry.org/invitation\n\nWeitere Informationen: https://globalartistregistry.org",
  },
  {
    code: "FR",
    native: "Français",
    text: "Invitation aux artistes — Global Artist Registry Foundation (GARF)\n\nGARF est une fondation néerlandaise à but non lucratif qui constitue un registre d'archives permanent des œuvres d'artistes, avec un plan de conservation documenté sur 100 ans. L'inscription est gratuite à vie pour tout artiste dont l'identité est vérifiée ; chaque artiste est propriétaire de ses archives et peut les exporter à tout moment.\n\nL'invitation ci-jointe est en anglais (version juridiquement faisant foi). Des traductions en allemand, français, espagnol, italien et polonais peuvent être téléchargées gratuitement sur https://globalartistregistry.org/invitation\n\nPlus d'informations : https://globalartistregistry.org",
  },
  {
    code: "ES",
    native: "Español",
    text: "Invitación a artistas — Global Artist Registry Foundation (GARF)\n\nGARF es una fundación neerlandesa sin ánimo de lucro que construye un registro archivístico permanente de las obras de los artistas, con un plan de conservación documentado a 100 años. El registro es gratuito de por vida para todo artista con identidad verificada; cada artista es propietario de su archivo y puede exportarlo en cualquier momento.\n\nLa invitación adjunta está en inglés (versión jurídicamente vinculante). Las traducciones al alemán, francés, español, italiano y polaco pueden descargarse gratuitamente en https://globalartistregistry.org/invitation\n\nMás información: https://globalartistregistry.org",
  },
  {
    code: "IT",
    native: "Italiano",
    text: "Invito agli artisti — Global Artist Registry Foundation (GARF)\n\nGARF è una fondazione non profit olandese che costruisce un registro archivistico permanente delle opere degli artisti, con un piano di conservazione documentato di 100 anni. La registrazione è gratuita per tutta la vita per ogni artista con identità verificata; ogni artista è proprietario del proprio archivio e può esportarlo in qualsiasi momento.\n\nL'invito allegato è in inglese (versione giuridicamente valida). Le traduzioni in tedesco, francese, spagnolo, italiano e polacco possono essere scaricate gratuitamente su https://globalartistregistry.org/invitation\n\nMaggiori informazioni: https://globalartistregistry.org",
  },
  {
    code: "PL",
    native: "Polski",
    text: "Zaproszenie dla artystów — Global Artist Registry Foundation (GARF)\n\nGARF to holenderska fundacja non-profit tworząca stały rejestr archiwalny dzieł artystów, z udokumentowanym planem konserwacji na 100 lat. Rejestracja jest dożywotnio bezpłatna dla każdego artysty zweryfikowanego na podstawie tożsamości; archiwum należy do artysty i może być w każdej chwili wyeksportowane.\n\nZałączone zaproszenie jest w języku angielskim (wersja wiążąca prawnie). Tłumaczenia na język niemiecki, francuski, hiszpański, włoski i polski można bezpłatnie pobrać na stronie https://globalartistregistry.org/invitation\n\nWięcej informacji: https://globalartistregistry.org",
  },
];

export default function InvitationDownloads() {
  const [confirmLang, setConfirmLang] = useState<LangEntry | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [noticeLang, setNoticeLang] = useState("EN");


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

  const copyNotice = async (code: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      setCopied(null);
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

        <section aria-labelledby="forward" className="mt-16">
          <h2 id="forward" className="text-sm uppercase tracking-widest text-muted-foreground">
            For organisations — ready-to-forward text
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Attach the English PDF (or paste the text below) and send it to your members. Every PDF carries a
            footer pointing artists to this page, so members who find English difficult can download the
            invitation in their own language.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {FORWARD_NOTICE.map((n) => (
              <button
                key={n.code}
                type="button"
                onClick={() => setNoticeLang(n.code)}
                className={`border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                  noticeLang === n.code
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.native}
              </button>
            ))}
          </div>

          {FORWARD_NOTICE.filter((n) => n.code === noticeLang).map((n) => (
            <div key={n.code} className="mt-4 border border-border">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed">
                {n.text}
              </pre>
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                <span className="text-xs text-muted-foreground">
                  Paste into a newsletter, members' area or email.
                </span>
                <Button variant="outline" size="sm" onClick={() => copyNotice(n.code, n.text)}>
                  {copied === n.code ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy text
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
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
