const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Test mode — no real payment will be taken. Use card{" "}
      <span className="font-mono font-medium">4242 4242 4242 4242</span>, any future expiry, any CVC.
    </div>
  );
}
