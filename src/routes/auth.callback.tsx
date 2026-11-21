import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EmailLinkForm } from "@/components/om/EmailLinkForm";
import { ErrorState, LoadingState, Page } from "@/components/om/Chrome";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    claim: typeof search["claim"] === "string" ? search["claim"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Opening your Operating Map" },
      {
        name: "description",
        content: "Complete your email sign-in and save your Operating Map profile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Opening your Operating Map" },
      {
        property: "og:description",
        content: "Complete your email sign-in and save your Operating Map profile.",
      },
    ],
  }),
  component: AuthCallbackPage,
});

type CallbackState = "working" | "expired" | "claimedByOther" | "error";

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { claim } = Route.useSearch();
  const [state, setState] = useState<CallbackState>("working");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const complete = async () => {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get("token_hash");

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });
        if (error) {
          setState("expired");
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setState("expired");
          return;
        }
      }

      const { error: personError } = await supabase.rpc("ensure_person");
      if (personError) {
        setState("error");
        return;
      }

      if (claim) {
        const { data, error } = await supabase.rpc("claim_respondent", {
          edit_token: claim,
        });
        if (error) {
          setState("error");
          return;
        }
        if (data[0]?.result === "claimed_by_other") {
          setState("claimedByOther");
          return;
        }
      }

      await navigate({ to: "/me", replace: true });
    };

    void complete().catch(() => setState("error"));
  }, [claim, navigate]);

  return (
    <Page>
      {state === "working" ? <LoadingState label="Signing you in" /> : null}

      {state === "expired" ? (
        <div>
          <h1 className="text-3xl">Your email link</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            That link has expired. Enter your email and we'll send a new one.
          </p>
          <div className="surface mt-6 p-5">
            <EmailLinkForm {...(claim ? { claim } : {})} />
          </div>
        </div>
      ) : null}

      {state === "claimedByOther" ? (
        <div>
          <ErrorState message="This profile is already saved to a different email." />
          <Link
            to="/me"
            className="mt-5 block rounded-xl bg-terracotta px-5 py-4 text-center text-[15px] font-medium text-cream"
          >
            Go to your map
          </Link>
        </div>
      ) : null}

      {state === "error" ? (
        <ErrorState message="We could not finish signing you in. Go back and request a new link." />
      ) : null}
    </Page>
  );
}
