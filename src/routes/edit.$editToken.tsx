import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState, Page } from "@/components/om/Chrome";
import { SurveyFlow } from "@/components/om/SurveyFlow";
import { supabase } from "@/integrations/supabase/client";
import type { Respondent } from "@/lib/om";

export const Route = createFileRoute("/edit/$editToken")({
  head: () => ({
    meta: [
      { title: "Update your Operating Map profile" },
      {
        name: "description",
        content: "Change how you work or how to reach you, and your company map updates with it.",
      },
      { property: "og:title", content: "Update your Operating Map profile" },
      {
        property: "og:description",
        content: "Change how you work or how to reach you, and your company map updates with it.",
      },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { editToken } = useParams({ from: "/edit/$editToken" });
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["edit", editToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respondents")
        .select("*")
        .eq("edit_token", editToken)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const me = data as unknown as Respondent;

      const { data: people } = await supabase
        .from("respondents")
        .select("id, first_name")
        .eq("company_id", me.company_id ?? "");

      return {
        me,
        teammates: (people ?? [])
          .filter((person) => person.id !== me.id)
          .map((person) => person.first_name),
      };
    },
  });

  if (query.isLoading) {
    return (
      <Page>
        <LoadingState label="Loading your answers" />
      </Page>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Page>
        <ErrorState message="That edit link does not match a profile. Check the link and try again." />
      </Page>
    );
  }

  return (
    <Page header={false}>
      <div className="pt-2">
        <SurveyFlow
          respondent={query.data.me}
          teammates={query.data.teammates}
          submitLabel="Save changes"
          onComplete={(token) => navigate({ to: "/done/$editToken", params: { editToken: token } })}
        />
      </div>
    </Page>
  );
}
