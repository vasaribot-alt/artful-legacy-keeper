import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { prepareArtistWebsiteDirectory, type ArtistWebsiteEntry } from "@/lib/artistWebsiteDirectory";

const ArtistWebsiteDirectory = () => {
  const [artists, setArtists] = useState<ArtistWebsiteEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("list_public_artist_websites");
        if (!active) return;
        if (error) { setStatus("error"); return; }
        setArtists(prepareArtistWebsiteDirectory(data || []));
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    };
    void load();
    return () => { active = false; };
  }, [attempt]);

  return (
    <section id="artist-websites" aria-labelledby="artist-websites-heading" className="border-b border-border px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 id="artist-websites-heading" className="mb-8 text-2xl">Artist websites</h2>
        {status === "loading" && <p role="status" className="text-sm text-muted-foreground">Loading artist websites…</p>}
        {status === "error" && <div className="space-y-3"><p role="alert" className="text-sm text-muted-foreground">Artist websites could not be loaded.</p><Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Try again</Button></div>}
        {status === "ready" && (artists.length === 0 ? <p className="text-sm text-muted-foreground">No artist websites have been published yet.</p> : (
          <ul className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((artist) => (
              <li key={artist.slug} className="min-w-0">
                {artist.external ? (
                  <a href={artist.href} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full break-words text-base underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{artist.full_name}</a>
                ) : (
                  <Link to={artist.href} className="inline-block max-w-full break-words text-base underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{artist.full_name}</Link>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
};

export default ArtistWebsiteDirectory;