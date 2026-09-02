import GarfLogo from "@/components/GarfLogo";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Heart, ShieldCheck, ArrowRight } from "lucide-react";
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
          <GarfLogo className="h-7" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
        {!checkout ? (
          <>
            <div className="mb-10 text-center">
              <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Choose an amount you'd like to donate</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Your gift helps build a permanent, archival record of contemporary art, stewarded for the next century.
              </p>
            </div>

            <div className="mx-auto max-w-md">
              {/* Frequency toggle, green pill */}
              <div className="relative flex w-full overflow-hidden rounded-full border border-[#7ac143]/40 bg-white p-1">
                {(["one_off", "monthly"] as Frequency[]).map((f) => {
                  const active = frequency === f;
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        setFrequency(f);
                        setSelected(f === "one_off" ? 75 : 25);
                        setCustomAmount("");
                      }}
                      className={`relative flex-1 rounded-full px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
                        active ? "bg-[#7ac143] text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        {f === "monthly" && (
                          <Heart className={`h-4 w-4 ${active ? "fill-red-500 text-red-500" : "text-red-500"}`} />
                        )}
                        {f === "one_off" ? "One-off" : "Monthly"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Amount presets */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {presets.map((amt, idx) => {
                  const isSelected = selected === amt && !isCustom;
                  const isPopular = frequency === "one_off" && idx === 1;
                  return (
                    <div key={amt} className="relative">
                      {isPopular && isSelected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2 text-[10px] font-semibold text-[#7ac143]">
                          ★ Most Popular
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelected(amt);
                          setCustomAmount("");
                        }}
                        className={`w-full rounded-lg border-2 px-3 py-5 text-lg font-semibold transition ${
                          isSelected
                            ? "border-dashed border-[#7ac143] bg-[#7ac143]/15 text-[#3d6b1f]"
                            : "border-neutral-200 bg-white text-neutral-800 hover:border-[#7ac143]/60"
                        }`}
                      >
                        €{amt}
                        {frequency === "monthly" && (
                          <span className="ml-1 text-xs font-normal text-neutral-500">per month</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Custom amount */}
              <button
                onClick={() => setSelected(-1)}
                className={`mt-3 w-full rounded-lg border-2 px-4 py-4 text-sm font-medium transition ${
                  isCustom
                    ? "border-[#7ac143] bg-[#7ac143]/10 text-[#3d6b1f]"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-[#7ac143]/60"
                }`}
              >
                Choose your own amount
              </button>
              {isCustom && (
                <div className="relative mt-3">
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
                      Custom monthly amounts coming soon, please choose a preset above, or switch to one-off.
                    </p>
                  )}
                </div>
              )}

              <Button
                size="lg"
                onClick={handleContinue}
                disabled={
                  (frequency === "monthly" && isCustom) ||
                  (isCustom && customCents < 100) ||
                  (!isCustom && selected < 1)
                }
                className="mt-6 h-14 w-full rounded-lg bg-[#7ac143] text-base font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-[#6aab36] disabled:bg-neutral-300"
              >
                <span className="inline-flex w-full items-center justify-center gap-2">
                  Next
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Button>

              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                The Global Artist Registry Foundation is a Dutch <em>stichting</em>.
                Donations are gifts and not subject to VAT. A receipt will be emailed to you.
              </p>

              <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
                <p className="text-sm text-foreground">
                  Considering a gift of <strong>€10,000 or more</strong>?
                </p>
                <Link
                  to="/support"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium underline"
                >
                  Speak to the Foundation directly
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-[#7ac143]" />
                Secure payment processed by Stripe
              </div>

              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Prefer to pay by bank transfer?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  You can send your gift directly to the Foundation account. Please include your email as the payment reference so we can send a receipt.
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Account name</span>
                    <span className="font-medium text-foreground">Global Artist Registry Foundation</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">BIC</span>
                    <span className="font-mono font-medium text-foreground">ABNANL2AXXX</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">IBAN</span>
                    <span className="font-mono font-medium text-foreground">NL93ABNA0156379376</span>
                  </div>
                </div>
              </div>
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
