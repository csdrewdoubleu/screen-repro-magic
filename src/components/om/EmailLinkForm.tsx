import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export function EmailLinkForm({ claim }: { claim?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sent || cooldown === 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sent, cooldown]);

  const sendLink = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!email.trim() || busy || (sent && cooldown > 0)) return;
    setBusy(true);
    setError(null);

    const redirect = new URL(`${window.location.origin}/auth/callback`);
    if (claim) redirect.searchParams.set("claim", claim);

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirect.toString() },
    });

    setBusy(false);
    if (sendError) {
      setError("We could not send the link. Check the email and try again.");
      return;
    }
    setSent(true);
    setCooldown(60);
  };

  if (sent) {
    return (
      <div>
        <p className="text-[15px] leading-relaxed text-ink">
          Check your email. The link signs you in and saves this profile to you.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || cooldown > 0}
            onClick={() => void sendLink()}
            className="rounded-xl border border-forest px-4 py-3 text-sm text-forest disabled:opacity-40"
          >
            {busy
              ? "Sending"
              : cooldown > 0
                ? `Send it again in ${cooldown}s`
                : "Send it again"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCooldown(0);
              setError(null);
            }}
            className="rounded-xl px-3 py-3 text-sm text-ink-soft underline underline-offset-4"
          >
            Use a different email
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-terracotta-deep">{error}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void sendLink(event)}>
      <label className="grid gap-2">
        <span className="eyebrow">Email address</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="w-full min-w-0 rounded-xl border border-border bg-cream px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft/50 focus:border-forest"
        />
      </label>
      {error ? <p className="mt-3 text-sm text-terracotta-deep">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-terracotta px-5 py-4 text-[15px] font-medium text-cream transition-colors hover:bg-terracotta-deep disabled:opacity-60"
      >
        {busy ? "Sending your link" : "Email me a link"}
      </button>
    </form>
  );
}
