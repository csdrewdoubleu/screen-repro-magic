import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState, Page } from "@/components/om/Chrome";
import { supabase } from "@/integrations/supabase/client";
import { archetypeByName } from "@/lib/om";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [
      { title: "Your saved Operating Map" },
      {
        name: "description",
        content: "Return to your saved working-style profiles and company maps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Your saved Operating Map" },
      {
        property: "og:description",
        content: "Return to your saved working-style profiles and company maps.",
      },
    ],
  }),
  component: MyMapPage,
});

type SavedProfile = {
  id: string;
  edit_token: string;
  archetype: string;
  company_id: string | null;
  companyName: string;
  companyCode: string | null;
};

function MyMapPage() {
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState("");
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await navigate({ to: "/signin", replace: true });
        return;
      }

      const { data: person, error: personError } = await supabase.rpc("ensure_person");
      if (personError) {
        setError(true);
        setLoading(false);
        return;
      }
      setEmail(person.email ?? sessionData.session.user.email ?? "");

      const { data: rows, error: profileError } = await supabase
        .from("respondents")
        .select("id, edit_token, archetype, company_id")
        .eq("person_id", sessionData.session.user.id)
        .order("created_at", { ascending: false });

      if (profileError) {
        setError(true);
        setLoading(false);
        return;
      }

      const companyIds = [...new Set((rows ?? []).flatMap((row) => row.company_id ? [row.company_id] : []))];
      const { data: companies, error: companyError } = companyIds.length
        ? await supabase.from("companies").select("id, name, code").in("id", companyIds)
        : { data: [], error: null };

      if (companyError) {
        setError(true);
        setLoading(false);
        return;
      }

      setProfiles(
        (rows ?? []).map((row) => {
          const company = companies.find((item) => item.id === row.company_id);
          return {
            ...row,
            companyName: company?.name ?? "Your company",
            companyCode: company?.code ?? null,
          };
        }),
      );
      setLoading(false);
    };

    void load().catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [navigate]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/signin", replace: true });
  };

  return (
    <Page>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl">Your map</h1>
          {email ? <p className="mt-2 break-all font-mono text-sm text-ink-soft">{email}</p> : null}
        </div>
        {email ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="shrink-0 font-mono text-xs text-ink-soft underline underline-offset-4"
          >
            Sign out
          </button>
        ) : null}
      </div>

      {loading ? <div className="mt-8"><LoadingState label="Loading your map" /></div> : null}
      {error ? (
        <div className="mt-8">
          <ErrorState message="We could not load your saved profiles. Refresh and try again." />
        </div>
      ) : null}

      {!loading && !error && profiles.length === 0 ? (
        <div className="surface mt-8 p-6 text-center">
          <p className="text-[15px] text-ink-soft">No saved map yet.</p>
          <Link
            to="/"
            className="mt-5 block rounded-xl bg-terracotta px-5 py-4 text-center text-[15px] font-medium text-cream"
          >
            Start one
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {profiles.map((profile) => {
          const archetype = archetypeByName(profile.archetype);
          return (
            <article key={profile.id} className="surface p-5">
              <p className="eyebrow">{profile.companyName}</p>
              <h2 className="mt-2 text-2xl">{archetype.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{archetype.description}</p>
              <div className="mt-5 grid gap-2">
                <Link
                  to="/edit/$editToken"
                  params={{ editToken: profile.edit_token }}
                  className="rounded-xl border border-forest px-4 py-3 text-center text-sm text-forest"
                >
                  Edit
                </Link>
                {profile.companyCode ? (
                  <Link
                    to="/c/$code"
                    params={{ code: profile.companyCode }}
                    className="rounded-xl bg-forest px-4 py-3 text-center text-sm text-cream"
                  >
                    See the company map
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </Page>
  );
}
