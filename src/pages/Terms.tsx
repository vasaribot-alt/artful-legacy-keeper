import PublicHeader from "@/components/PublicHeader";
import PublicPageHero from "@/components/PublicPageHero";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Who we are",
    body: [
      "The Global Artist Registry Foundation (GARF) is an independent, non-commercial foundation (stichting) registered in the Netherlands. Our mission is to preserve the documentation of contemporary art for the long term — a 100-year commitment.",
      "These terms govern your use of your GARF account and the services connected to it. They are written in plain language on purpose. If anything is unclear, ask us before accepting.",
    ],
  },
  {
    title: "2. Your records belong to you",
    body: [
      "You own the content you place in your archive: artwork records, images, documents, texts, and all other material. GARF claims no ownership and no rights over your work or your documentation beyond what is needed to store, display, and preserve it for you.",
      "You control your records. You may edit, export, or delete them at any time. You decide what is private, what is shared, and with whom.",
      "Nothing is added to an artist's catalogue by anyone else without that artist's explicit approval. Documentation received from third parties (for example galleries or museums) is held separately and is only used to invite the artist — it is never published or placed in a profile under the artist's name without consent, and it is deleted if the artist declines.",
    ],
  },
  {
    title: "3. Free for artists, non-commercial by charter",
    body: [
      "Artist accounts are free. GARF does not sell, rent, or trade your data, and does not use your records for advertising or any commercial purpose.",
      "Our non-commercial character is not just a policy — it is part of the foundation's legal structure as a Dutch stichting.",
    ],
  },
  {
    title: "4. Using the service responsibly",
    body: [
      "You are responsible for the accuracy of what you record and for having the right to upload the material you upload.",
      "You must not use GARF to store or distribute unlawful material, to misrepresent authorship or provenance, or to access records that are not yours.",
      "We may suspend or close an account that is misused, after giving notice where reasonably possible. We will never remove or alter an artist's records as a form of penalty — suspension concerns access and behaviour, not ownership.",
    ],
  },
  {
    title: "5. Preservation and succession",
    body: [
      "GARF exists to preserve your archive for the long term. We maintain redundant archival storage and preservation standards designed around a 100-year horizon.",
      "You may name heirs or successors for your archive. On your death, custodianship of your archive passes according to your recorded wishes; where no successor is named and applicable, the foundation may hold the archive in public estate custodianship, preserving it without taking ownership of the works or rights.",
      "If the foundation were ever to dissolve, its charter requires the archives to be transferred to another non-profit institution with a similar preservation mission — never sold or dispersed commercially.",
    ],
  },
  {
    title: "6. Privacy",
    body: [
      "We process personal data in line with the GDPR. Your data is used to run your account and archive, nothing else. You may request a copy or deletion of your personal data at any time, subject to the archival commitments you have explicitly chosen to make.",
    ],
  },
  {
    title: "7. Changes to these terms",
    body: [
      "If we change these terms, we will notify account holders in advance and ask for renewed acceptance where the change is material. Changes will never weaken the core commitments in sections 2, 3, and 5: your ownership, the non-commercial guarantee, and the preservation promise.",
    ],
  },
  {
    title: "8. Contact",
    body: [
      "Questions about these terms: use the contact page. These terms are governed by Dutch law.",
    ],
  },
];

const Terms = () => {
  useEffect(() => {
    document.title = "User Agreement — Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "The GARF user agreement: you own your records, artists use the registry free, no commercial use of your data, and a 100-year preservation and succession commitment.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <PublicPageHero
        eyebrow="User Agreement"
        title="Plain-language terms for everyone who uses GARF"
        description="What you own, what we promise, and the few rules that keep the registry trustworthy."
      />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pb-24">
        <div className="border border-border rounded-sm p-4 mb-10 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Draft version 0.1 — October 2026. This agreement is currently in plain-language draft form and will be
            reviewed by a legal adviser before it becomes binding. It reflects the commitments the foundation already
            operates by.
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-medium mb-3">{s.title}</h2>
              <div className="space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mt-14">
          Questions? <Link to="/contact" className="text-foreground underline">Contact the foundation</Link>.
        </p>
      </main>
    </div>
  );
};

export default Terms;
