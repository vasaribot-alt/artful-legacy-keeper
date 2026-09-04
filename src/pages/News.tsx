import GarfLogo from "@/components/GarfLogo";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { InstagramLink } from "@/components/SocialLinks";
import { Newspaper } from "lucide-react";

type NewsItem = {
  date: string;
  title: string;
  body: string[];
  image?: { src: string; alt: string };
};

const news: NewsItem[] = [
  {
    date: "4 September 2026",
    title: "Cooperation with IAA/USA",
    body: [
      "The Global Artist Registry Foundation and the International Association of Art, United States, are working together to make free, lifetime registration available to artists across the association's membership.",
      "A joint announcement follows shortly.",
    ],
    image: { src: "/iaa-usa-logo.png", alt: "International Association of Art, United States" },
  },
];

const News = () => {
  useEffect(() => {
    document.title = "News | Global Artist Registry Foundation";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        "content",
        "Announcements and updates from the Global Artist Registry Foundation, including partnerships with artist organisations and institutions.",
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
            <Link to="/tutorials" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              Tutorials
            </Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
              FAQ
            </Link>
            <InstagramLink />
          </div>
        </div>
      </nav>

      <header className="pt-36 pb-12 px-6 border-b border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3 inline-flex items-center gap-2">
            <Newspaper className="w-4 h-4" /> News
          </p>
          <h1 className="text-4xl mb-4">Announcements and updates</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            News from the Foundation, its partner organisations, and the growing registry.
          </p>
        </div>
      </header>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-14">
          {news.map((item) => (
            <article key={item.title} className="border-b border-border pb-14 last:border-0 last:pb-0">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{item.date}</p>
              <h2 className="text-2xl mb-4">{item.title}</h2>
              {item.image && (
                <img
                  src={item.image.src}
                  alt={item.image.alt}
                  loading="lazy"
                  className="h-16 w-auto mb-6"
                />
              )}
              <div className="space-y-4">
                {item.body.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <GarfLogo className="h-12" />
          <div className="flex items-center gap-6">
            <Link to="/tutorials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Tutorials
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

export default News;
