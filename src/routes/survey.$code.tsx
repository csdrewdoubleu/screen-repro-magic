import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState, Page } from "@/components/om/Chrome";
import { SurveyFlow } from "@/components/om/SurveyFlow";
import { supabase } from "@/integrations/supabase/client";
import type { Respondent } from "@/lib/om";

export const Route = createFileRoute("/survey/$code")({
  validateSearch: (search: Record<string, unknown>) => ({ r: String(search["r"] ?? "") }),
  head: () => ({
    meta: [
      { title: "Your Operating Map intake" },
      {
        name: "description",
        content: "Twenty quick questions about how you work, how to reach you, and where work waits.",
      },
      { property: "og:title", content: "Your Operating Map intake" },
      {
        property: "og:description",
        content: "Twenty quick questions about how you work, how to reach you, and where work waits.",
      },
    ],
  }),
  component: SurveyPage,
});

function SurveyPage() {
  const { code } = useParams({ from: "/survey/$code" });
  const { r } = useSearch({ from: "/survey/$code" });
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["survey", code, r],
    queryFn: async () => {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, name, code")
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

      const respondents = (people ?? []) as unknown as Respondent[];
      const me = respondents.find((person) => person.id === r) ?? null;
      return { company, me, respondents };
    },
  });

  if (query.isLoading) {
    return (
      <Page>
        <LoadingState label="Opening your intake" />
      </Page>
    );
  }

  if (query.isError || !query.data || !query.data.me) {
    return (
      <Page>
        <ErrorState message="We could not find this intake. Ask for the join link again." />
      </Page>
    );
  }

  const { me, respondents } = query.data;
  const teammates = respondents
    .filter((person) => person.id !== me.id)
    .map((person) => person.first_name);

  return (
    <Page header={false}>
      <div className="pt-2">
        <SurveyFlow
          respondent={me}
          teammates={teammates}
          onComplete={(editToken) =>
            navigate({ to: "/done/$editToken", params: { editToken } })
          }
        />
      </div>
    </Page>
  );
}
