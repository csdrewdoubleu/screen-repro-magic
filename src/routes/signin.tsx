import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { EmailLinkForm } from "@/components/om/EmailLinkForm";
import { LoadingState, Page } from "@/components/om/Chrome";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in to your Operating Map" },
      {
        name: "description",
        content: "Get a one-time email link to return to your saved Operating Map profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Sign in to your Operating Map" },
      {
        property: "og:description",
        content: "Get a one-time email link to return to your saved Operating Map profiles.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        void navigate({ to: "/me", replace: true });
      } else {
        setReady(true);
      }
    });
  }, [navigate]);

  return (
    <Page>
      <h1 className="text-3xl">Sign in to your map</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Enter your email and we'll send you a link. No password to remember.
      </p>
      <div className="surface mt-8 p-5">
        {ready ? <EmailLinkForm /> : <LoadingState label="Checking your sign-in" />}
      </div>
    </Page>
  );
}
