import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState, LoadingState, Page } from "@/components/om/Chrome";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join/$code")({
  head: () => ({
    meta: [
      { title: "Join your team's Operating Map" },
      {
        name: "description",
        content: "Add your working style to your company's operating map in under five minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Join your team's Operating Map" },
      {
        property: "og:description",
        content: "Add your working style to your company's operating map in under five minutes.",
      },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = useParams({ from: "/join/$code" });
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyQuery = useQuery({
    queryKey: ["company", code],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("companies")
        .select("id, name, code")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (queryError) throw queryError;
      return data;
    },
  });

  const submit = async () => {
    const company = companyQuery.data;
    if (!company) return;
    if (!firstName.trim()) {
      setError("Add your first name to continue.");
      return;
    }
    setError(null);
    setBusy(true);
    const { data, error: insertError } = await supabase
      .from("respondents")
      .insert({ company_id: company.id, first_name: firstName.trim() })
      .select("id")
      .single();
    if (insertError || !data) {
      setBusy(false);
      setError("We could not add you just now. Try again.");
      return;
    }
    navigate({ to: "/survey/$code", params: { code: company.code }, search: { r: data.id } });
  };

  return (
    <Page>
      {companyQuery.isLoading ? <LoadingState label="Checking your code" /> : null}
      {companyQuery.isError ? (
        <ErrorState message="We could not reach the map. Check your connection and refresh." />
      ) : null}
      {!companyQuery.isLoading && !companyQuery.isError && !companyQuery.data ? (
        <ErrorState message={`No company matches the code ${code.toUpperCase()}. Check it with whoever invited you.`} />
      ) : null}

      {companyQuery.data ? (
        <div>
          <p className="eyebrow">Joining</p>
          <h1 className="mt-1 text-3xl">{companyQuery.data.name}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            About twenty questions, most of them a single tap.
          </p>

          <label className="mt-8 grid gap-2">
            <span className="eyebrow">Your first name</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="Dana"
              className="w-full rounded-xl border border-border bg-cream-deep px-4 py-3.5 text-[15px] outline-none focus:border-forest"
            />
          </label>

          {error ? <p className="mt-3 text-sm text-terracotta-deep">{error}</p> : null}

          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="mt-5 w-full rounded-xl bg-terracotta px-5 py-4 text-[15px] font-medium text-cream transition-colors hover:bg-terracotta-deep disabled:opacity-60"
          >
            {busy ? "Getting set up" : "Start the intake"}
          </button>
        </div>
      ) : null}
    </Page>
  );
}
