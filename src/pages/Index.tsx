import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Database, Users, Clock, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Database,
    title: "Catalogue Raisonné",
    description: "Build a definitive, archival-grade record of an artist's complete body of work. Structured metadata, provenance tracking, and exhibition history.",
  },
  {
    icon: Users,
    title: "Collection Management",
    description: "Collectors manage their holdings with full provenance, condition reports, and loan tracking. Grant registrar access for professional cataloguing.",
  },
  {
    icon: Shield,
    title: "Verified Identity",
    description: "Every artist and collector undergoes government-approved ID verification. Ensuring authenticity and trust in every database entry.",
  },
  {
    icon: Clock,
    title: "100-Year Preservation",
    description: "Data integrity guaranteed across generations. Redundant archival storage, immutable records, and long-term digital preservation standards.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Global Artist Registry Foundation</span>
          <div className="flex items-center gap-6">
            <Link to="/founding-artists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Founding Artists
            </Link>
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">
            Archival-Grade Art Database
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 text-balance">
            The permanent record for art
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Catalogue raisonné for artists. Collection management for collectors. 
            Verified identity. Built to last 100 years.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Create Your Vault <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {features.map((feature) => (
              <div key={feature.title} className="group">
                <feature.icon className="w-5 h-5 text-muted-foreground mb-4" />
                <h3 className="text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-surface border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl mb-12 text-center">How it works</h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "Verify your identity", desc: "Complete government-approved ID verification to establish your authenticated presence." },
              { step: "02", title: "Create your database", desc: "Artists build their catalogue raisonné. Collectors create their collection inventory." },
              { step: "03", title: "Invite registrars", desc: "Grant access to professional registrars who help catalogue and document artworks." },
              { step: "04", title: "Preserve for generations", desc: "Your data is archived with 100-year preservation standards. Immutable and permanent." },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <span className="text-sm text-muted-foreground font-mono mt-1 shrink-0">{item.step}</span>
                <div>
                  <h4 className="text-lg mb-1 font-sans font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl mb-8">Built for permanence</h2>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {[
              "Government ID verification",
              "Immutable audit trails",
              "Redundant archival storage",
              "Open metadata standards",
              "Provenance chain tracking",
              "Condition report management",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 Global Artist Registry Foundation</span>
          <span>Archival-grade art documentation</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
