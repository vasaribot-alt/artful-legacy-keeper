import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Unsubscribing is handled by the link in the footer of every notification
// email, so this page only explains where to find it.
const Unsubscribe = () => (
  <main className="min-h-screen bg-background flex items-center justify-center p-6">
    <Card className="w-full max-w-md">
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Global Artist Registry Foundation
        </p>
        <CardTitle className="font-serif text-2xl font-normal">Unsubscribe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          To stop receiving notification emails from the foundation, use the unsubscribe link in
          the footer of the most recent email you received from us. It takes effect immediately.
        </p>
        <p>
          Sign in, password reset and other account emails will still reach you, and you can write
          to us at any time if you change your mind.
        </p>
      </CardContent>
    </Card>
  </main>
);

export default Unsubscribe;
