import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState, LoadingState, Page } from "@/components/om/Chrome";
import { supabase } from "@/integrations/supabase/client";
import { DIMENSIONS, archetypeByName, type Respondent } from "@/lib/om";

export const Route = createFileRoute("/done/$editToken")({
  head: () => ({
    meta: [
      { title: "Your working-style profile" },
      {
        name: "description",
        content: "Your archetype, how you like to be reached, and your private edit link.",
      },
      { property: "og:title", content: "Your working-style profile" },
      {
        property: "og:description",
        content: "Your archetype, how you like to be reached, and your private edit link.",
      },
    ],
  }),
  component: DonePage,
});

function DonePage() {
  const { editToken } = useParams({ from: "/done/$editToken" });
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ["done", editToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respondents")
        .select("*")
        .eq("edit_token", editToken)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const me = data as unknown as Respondent;
      const { data: company } = await supabase
        .from("companies")
        .select("code, name")
        .eq("id", me.company_id ?? "")
        .maybeSingle();
      return { me, company };
    },
  });

  if (query.isLoading) {
    return (
      <Page>
        <LoadingState label="Building your profile" />
      </Page>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Page>
        <ErrorState message="We could not find that profile. Check your link." />
      </Page>
    );
  }

  const { me, company } = query.data;
  const archetype = archetypeByName(me.archetype);
  const editUrl =
    typeof window === "undefined" ? `/edit/${editToken}` : `${window.location.origin}/edit/${editToken}`;

  return (
    <Page>
      <div className="surface overflow-hidden">
        <div className="bg-forest px-5 py-6 text-cream">
          <p className="eyebrow text-cream/70">{me.first_name}'s archetype</p>
          <h1 className="mt-1 font-display text-3xl text-cream">{archetype.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream/85">{archetype.description}</p>
        </div>
        <div className="grid gap-4 px-5 py-5">
          <div>
            <p className="eyebrow">Works best with</p>
            <p className="text-[15px]">{archetype.worksBestWith}</p>
          </div>
          <div>
            <p className="eyebrow">Watch out for</p>
            <p className="text-[15px]">{archetype.watchOutFor}</p>
          </div>

          <div className="mt-2 grid gap-3">
            {DIMENSIONS.map((dimension) => (
              <div key={dimension.key}>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-soft">
                  <span>{dimension.left}</span>
                  <span className="text-right">{dimension.right}</span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-cream">
                  <span
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta"
                    style={{ left: `${me.scores?.[dimension.key] ?? 50}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface mt-5 p-5">
        <h2 className="text-xl">How to reach {me.first_name}</h2>
        <dl className="mt-3 grid gap-2 text-[15px]">
          {[
            ["Routine", me.channel_routine],
            ["Same day", me.channel_sameday],
            ["Urgent", me.channel_urgent],
            ["Hours", me.hours_window || "Not set"],
            ["Hard rule", me.hard_rule || "None given"],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
              <dt className="eyebrow pt-1">{label}</dt>
              <dd className="min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="surface mt-5 p-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          This is your private edit link. Save it to update your profile whenever the way you work
          changes.
        </p>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <p className="truncate rounded-xl border border-border bg-cream px-3 py-3 text-xs text-ink-soft">
            {editUrl}
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(editUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 rounded-xl border border-forest px-4 text-sm text-forest"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {company ? (
        <Link
          to="/c/$code"
          params={{ code: company.code }}
          className="mt-5 block rounded-xl bg-terracotta px-5 py-4 text-center text-[15px] font-medium text-cream transition-colors hover:bg-terracotta-deep"
        >
          See the company map
        </Link>
      ) : null}
    </Page>
  );
}
