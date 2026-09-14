import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

export interface NewsPost {
  id: string;
  title: string;
  body: string | null;
  news_date: string;
  is_published: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export const WebsiteNewsManager = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(today());

  const load = async () => {
    const { data } = await supabase
      .from("artist_news")
      .select("id, title, body, news_date, is_published")
      .eq("user_id", userId)
      .order("news_date", { ascending: false });
    setPosts((data as NewsPost[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const add = async () => {
    if (!title.trim()) {
      toast({ title: "Add a heading", description: "Your news item needs a short heading.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("artist_news").insert({
      user_id: userId,
      title: title.trim(),
      body: body.trim() || null,
      news_date: date || today(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setTitle(""); setBody(""); setDate(today());
    toast({ title: "News added ✓" });
    load();
  };

  const togglePublished = async (post: NewsPost) => {
    await supabase.from("artist_news").update({ is_published: !post.is_published }).eq("id", post.id);
    load();
  };

  const remove = async (post: NewsPost) => {
    await supabase.from("artist_news").delete().eq("id", post.id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Heading, for example: New studio in Oslo" autoComplete="off" />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} autoComplete="off" />
      </div>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Write the news text visitors will read…" />
      <Button onClick={add} disabled={saving} variant="outline" size="sm">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add news</>}
      </Button>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No news items yet.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {posts.map((post) => (
            <li key={post.id} className="flex items-start gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{post.title}</p>
                <p className="text-xs text-muted-foreground">{post.news_date}</p>
                {post.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.body}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{post.is_published ? "Visible" : "Hidden"}</span>
                <Switch checked={post.is_published} onCheckedChange={() => togglePublished(post)} />
                <button type="button" onClick={() => remove(post)} aria-label="Delete news item" className="text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
