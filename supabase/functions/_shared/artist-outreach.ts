export const NORWAY_ARTIST_BATCH = "Norway wider outreach 2026-10";

const englishNames = new Set(["Eamon O'Kane", "Bronwen Ackhurst Malcolm", "Mark Osborne", "Lap-See Lam & Kholod Hawash", "Tze Yeung Ho", "Yamile Calderon", "Verena Issel"]);
const locartoNames = new Set(["Ansgar Valbø", "Erik Skabo", "Fin Serck-Hanssen", "Mette Tronvoll", "Mark Osborne"]);
const knownNames = new Set(["Erle Kyllingmark", "Sverre Austad", "Eamon O'Kane", "Sverre Bjertnes", "Sebastian Helling", "Lars Morell", "Trude Viken"]);

export function artistOutreachDraft(input: { name: string; tag?: string | null; language?: string; senderName?: string; signature?: string }) {
  const norwegian = input.tag === NORWAY_ARTIST_BATCH
    ? !englishNames.has(input.name)
    : /norwegian|norsk/i.test(input.language || "");
  const greetingName = input.name === "Lap-See Lam & Kholod Hawash" ? "Lap-See og Kholod" : input.name.split(" ")[0];
  const opening = locartoNames.has(input.name)
    ? norwegian ? "Du kjenner meg fra Locarto. Jeg vil gjerne fortelle deg om Global Artist Registry Foundation (GARF), som jeg har startet for å beskytte kunstneres dokumentasjon på lang sikt." : "You know me from Locarto. I would like to tell you about the Global Artist Registry Foundation (GARF), which I have started to protect artists’ documentation for the long term."
    : knownNames.has(input.name)
      ? norwegian ? "Jeg vil gjerne fortelle deg om Global Artist Registry Foundation (GARF), som jeg har startet for å hjelpe kunstnere med å beskytte dokumentasjonen sin for fremtiden." : "I would like to tell you about the Global Artist Registry Foundation (GARF), which I have started to help artists protect their documentation for the future."
      : norwegian ? "Jeg skriver for å fortelle deg om Global Artist Registry Foundation (GARF), en uavhengig, ikke-kommersiell stiftelse i Nederland som hjelper kunstnere med å beskytte dokumentasjonen sin for fremtiden." : "I am writing to tell you about the Global Artist Registry Foundation (GARF), an independent, non-commercial Dutch foundation helping artists protect their documentation for the future.";
  const paragraphs = norwegian ? [
    `Hei ${greetingName},`, opening,
    "Mye av dokumentasjonen om kunstneres verk ligger hos gallerier, på private harddisker eller i leid digital lagringsplass. Når et galleri stenger permanent, kan utstillingshistorikk, fotografier og opplysninger om verk gå tapt. Derfor er det viktig at kunstneren selv har en samlet kopi som kan bevares videre.",
    "Hos GARF kan du registrere deg gratis, bygge en komplett katalog over verkene dine og opprette og administrere din egen nettside. Alt dette er gratis. Vi hjelper deg med å komme i gang og med å laste opp og organisere materialet ditt.",
    "For å gjøre katalogen så komplett som mulig kan du selv be gallerier og institusjoner du har arbeidet med, om kopier eller utdrag av dokumentasjonen de har om verkene og utstillingene dine. Vi hjelper deg med å legge materialet du mottar, inn i din egen profil. Deres arkiver forblir urørt.",
    "Du beholder eierskapet, opphavsretten og kontrollen over materialet ditt, bestemmer selv hva som skal være offentlig, og kan eksportere dokumentasjonen din. GARF arbeider etter en 100-årig bevaringsplan, og du kan utpeke hvem som skal overta forvaltningen av arkivet ditt senere.",
    "Du kan registrere deg gratis her:\nhttps://globalartistregistry.org/register",
    "Hvorfor dette er viktig:\nhttps://globalartistregistry.org/why-garf-matters\n\nOm stiftelsen:\nhttps://globalartistregistry.org/about",
    "Med vennlig hilsen,",
  ] : [
    `Dear ${input.name},`, opening,
    "Much of the documentation of artists’ work is held by galleries, on private hard drives or in rented digital storage. When a gallery closes permanently, exhibition histories, photographs and records of works can be lost. That is why it matters for artists to hold a complete copy that can be preserved for the future.",
    "With GARF, you can register free of charge, build a complete catalogue of your works, and create and administer your own website. All of this is free. We help you get started and upload and organise your material.",
    "To make your catalogue as complete as possible, you can ask the galleries and institutions you have worked with for copies or extracts of the documentation they hold about your works and exhibitions. We help you add the material you receive to your own profile. Their archives remain untouched.",
    "You retain ownership, copyright and control of your material, decide what is public, and can export your documentation. GARF works to a 100-year preservation plan, and you can name the person who will take over stewardship of your archive later.",
    "Register free of charge:\nhttps://globalartistregistry.org/register",
    "Why this matters:\nhttps://globalartistregistry.org/why-garf-matters\n\nAbout the foundation:\nhttps://globalartistregistry.org/about",
    "With kind regards,",
  ];
  paragraphs.push(input.signature?.trim() || `${input.senderName || "Jan S Kindem"}\nGlobal Artist Registry Foundation`);
  return { subject: norwegian ? "Beskytt dokumentasjonen din – gratis katalog og egen nettside hos GARF" : "Protect your documentation — a free catalogue and your own website with GARF", body: paragraphs.join("\n\n") };
}