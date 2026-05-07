import { Link, useSearchParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DonateThanks() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <Heart className="mx-auto mb-8 h-10 w-10" strokeWidth={1.25} />
        <h1 className="font-serif text-4xl sm:text-5xl">Thank you for your gift.</h1>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
          Your support helps secure the long-term preservation of contemporary art.
          A receipt has been emailed to you. As gifts to a Dutch <em>stichting</em>, donations are not subject to VAT.
        </p>
        {sessionId && (
          <p className="mt-6 text-xs text-muted-foreground">Reference: {sessionId.slice(-12)}</p>
        )}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">Return home</Link>
          </Button>
          <Button asChild>
            <Link to="/founding-artists">Explore the registry</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
