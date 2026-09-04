import GarfLogo from "@/components/GarfLogo";
import installVideo from "@/assets/how-to-install.mp4.asset.json";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { InstagramLink } from "@/components/SocialLinks";
import { PlayCircle } from "lucide-react";

const walkthroughs = [
  { src: "/tutorials/how-to-register-mac-safe.mp4", title: "Register your account.", desc: "Create your account and complete identity verification." },
  { src: "/tutorials/how-to-profile-mac-safe.mp4", title: "Build your profile.", desc: "Biography, CV, exhibitions, and contact details." },
  { src: "/tutorials/how-to-bulk-mac-safe.mp4", title: "Import your entire catalogue.", desc: "Bring existing spreadsheets into the Registry." },
  { src: "/tutorials/how-to-capture-mac-safe.mp4", title: "Capture, from the studio.", desc: "Photograph and record new works on a phone." },
  { src: "/tutorials/how-to-exhibition-mac-safe.mp4", title: "Document the exhibition.", desc: "Installation views, texts, and linked works." },
  { src: "/tutorials/how-to-catalogues-mac-safe.mp4", title: "Build the publication record.", desc: "Catalogues, page references, and printed sources." },
];

const Tutorials = () => {
  useEffect(() => {
    document.title = "Video Tutorials | Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Short video tutorials showing how to register, build a profile, import a catalogue, document exhibitions, and add the Registry to your home screen.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <GarfLogo className="h-14" />
          </Link>
          <div className="flex items-center gap-6 overflow-x-auto">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              About
            </Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              FAQ
            </Link>
            <Link to="/news" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              News
            </Link>
            <InstagramLink />
          </div>
        </div>
      </nav>

      <header className="pt-36 pb-12 px-6 border-b border-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3 inline-flex items-center gap-2">
            <PlayCircle className="w-4 h-4" /> Video tutorials
          </p>
          <h1 className="text-4xl mb-4">See how it works</h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            Short walkthroughs covering the core workflows in the Registry, plus how to keep
            it one tap away on your phone.
          </p>
        </div>
      </header>

      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl mb-8">Using the Registry</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {walkthroughs.map((t) => (
              <article key={t.src}>
                <div className="aspect-video bg-secondary rounded-md overflow-hidden mb-4 ring-1 ring-border">
                  <video
                    src={t.src}
                    controls
                    preload="metadata"
                    playsInline
                    className="w-full h-full object-contain bg-background"
                  />
                </div>
                <h3 className="text-base font-medium mb-1">{t.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl mb-4">Add GARF to your home screen</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              On a phone the top menu slides sideways, so every section stays within reach.
              Sign in once, then add the Registry to your home screen and it opens full screen,
              without the browser bars.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              iPhone: in Safari, tap the share icon and choose Add to Home Screen.
              Android: in Chrome, open the three dot menu and choose Add to Home screen.
            </p>
          </div>
          <div className="mx-auto w-full max-w-[280px]">
            <div className="aspect-[9/16] bg-secondary rounded-md overflow-hidden ring-1 ring-border">
              <video
                src={installVideo.url}
                controls
                preload="metadata"
                playsInline
                className="w-full h-full object-contain bg-background"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <GarfLogo className="h-12" />
          <div className="flex items-center gap-6">
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Tutorials;
