import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Heart, ShieldCheck } from "lucide-react";
import { DonationCheckout } from "@/components/payments/DonationCheckout";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";

type Frequency = "one_off" | "monthly";

const ONE_OFF_PRESETS = [25, 75, 250];
const MONTHLY_PRESETS: { amount: number; priceId: string }[] = [
  { amount: 10, priceId: "donation_monthly_10" },
  { amount: 25, priceId: "donation_monthly_25" },
  { amount: 50, priceId: "donation_monthly_50" },
];

export default function Donate() {
  const [frequency, setFrequency] = useState<Frequency>("one_off");
  const [selected, setSelected] = useState<number>(75);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [checkout, setCheckout] = useState<{ priceId?: string; amountCents?: number; kind: "one_off" | "monthly" } | null>(null);

  const isCustom = selected === -1;
  const customCents = Math.round((parseFloat(customAmount) || 0) * 100);
  const presets = frequency === "one_off" ? ONE_OFF_PRESETS : MONTHLY_PRESETS.map((p) => p.amount);

  const handleContinue = () => {
    if (frequency === "one_off") {
      const cents = isCustom ? customCents : selected * 100;
      if (cents < 100) return;
      setCheckout({ amountCents: cents, kind: "one_off" });
      return;
    }
    // monthly
    if (isCustom) {
      // For custom monthly, fall back to one-off (Stripe needs a recurring price for subscriptions)
      // Direct users to a preset for now
      return;
    }
    const preset = MONTHLY_PRESETS.find((p) => p.amount === selected);
    if (!preset) return;
    setCheckout({ priceId: preset.priceId, kind: "monthly" });
  };

  const returnUrl = `${window.location.origin}/donate/thanks?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Global Artist Registry Foundation</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
        {!checkout ? (
          <>
            <div className="mb-12 text-center">
              <Heart className="mx-auto mb-6 h-8 w-8" strokeWidth={1.25} />
              <h1 className="font-serif text-4xl leading-tight sm:text-5xl">Support the 100-Year Preservation Plan</h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                Your gift helps build and maintain a permanent, archival record of contemporary art —
                free for artists, accessible to scholars, and stewarded for the next century.
              </p>
            </div>

            {/* Frequency toggle */}
            <div className="mx-auto mb-8 flex w-full max-w-md rounded-full border border-border p-1">
              {(["one_off", "monthly"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFrequency(f);
                    setSelected(f === "one_off" ? 75 : 25);
                    setCustomAmount("");
                  }}
                  className={`flex-1 rounded-full px-4 py-2 text-sm transition ${
                    frequency === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "one_off" ? "One-off gift" : "Monthly"}
                </button>
              ))}
            </div>

            {/* Amount presets */}
            <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
              {presets.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setSelected(amt);
                    setCustomAmount("");
                  }}
                  className={`rounded-md border px-4 py-4 text-lg transition ${
                    selected === amt && !isCustom
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  €{amt}
                  {frequency === "monthly" && <span className="ml-0.5 text-xs opacity-70">/mo</span>}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="mx-auto mt-3 max-w-md">
              <button
                onClick={() => setSelected(-1)}
                className={`mb-2 w-full rounded-md border px-4 py-3 text-sm transition ${
                  isCustom ? "border-foreground" : "border-border hover:border-foreground"
                }`}
              >
                Other amount
              </button>
              {isCustom && (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min="1"
                    inputMode="decimal"
                    autoFocus
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 text-lg"
                  />
                  {frequency === "monthly" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Custom monthly amounts coming soon — please choose a preset above, or switch to one-off.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mx-auto mt-8 max-w-md">
              <Button
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={
                  (frequency === "monthly" && isCustom) ||
                  (isCustom && customCents < 100) ||
                  (!isCustom && selected < 1)
                }
              >
                Continue
              </Button>
              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                The Global Artist Registry Foundation is a Dutch <em>stichting</em>.
                Donations are gifts and not subject to VAT.
                A receipt will be emailed to you for your records.
              </p>
            </div>

            {/* Trust footer */}
            <div className="mx-auto mt-16 flex max-w-md items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Secure payment processed by Stripe
            </div>
          </>
        ) : (
          <div>
            <button
              onClick={() => setCheckout(null)}
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Change amount
            </button>
            <div className="rounded-lg border border-border bg-card p-1 sm:p-4">
              <DonationCheckout
                priceId={checkout.priceId}
                amountCents={checkout.amountCents}
                kind={checkout.kind}
                returnUrl={returnUrl}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
