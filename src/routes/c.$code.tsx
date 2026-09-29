import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState, Page } from "@/components/om/Chrome";
import { Dashboard } from "@/components/om/Dashboard";
import { supabase } from "@/integrations/supabase/client";
import type { Company, Respondent } from "@/lib/om";

export const Route = createFileRoute("/c/$code")({
  head: () => ({
    meta: [
      { title: "Your company operating map" },
      {
        name: "description",
        content:
          "Working styles, reach preferences, tool stack, hand-offs, and automation opportunities for your team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Your company operating map" },
      {
        property: "og:description",
        content:
          "Working styles, reach preferences, tool stack, hand-offs, and automation opportunities for your team.",
      },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { code } = useParams({ from: "/c/$code" });

  const query = useQuery({
    queryKey: ["dashboard", code],
    queryFn: async () => {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, code, name, industry, size_band")
        .eq("code", code.toUpperCase())
        .maybeSingle();
      if (companyError) throw companyError;
      if (!company) return null;

      const { data: people, error: peopleError } = await supabase
        .from("respondents")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: true });
      if (peopleError) throw peopleError;

      return {
        company: company as Company,
        respondents: (people ?? []) as unknown as Respondent[],
      };
    },
  });

  return (
    <Page wide>
      {query.isLoading ? <LoadingState label="Drawing your map" /> : null}
      {query.isError ? (
        <ErrorState message="We could not load this map. Check your connection and refresh." />
      ) : null}
      {!query.isLoading && !query.isError && !query.data ? (
        <ErrorState message={`No company matches the code ${code.toUpperCase()}.`} />
      ) : null}
      {query.data ? (
        <Dashboard
          company={query.data.company}
          respondents={query.data.respondents}
          onRefresh={() => void query.refetch()}
        />
      ) : null}
    </Page>
  );
}
