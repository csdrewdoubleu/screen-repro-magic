import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/om/Chrome";
import { supabase } from "@/integrations/supabase/client";
import { INDUSTRIES, SIZE_BANDS, generateCode } from "@/lib/om";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start your Operating Map" },
      {
        name: "description",
        content: "Create your company map and invite the team with a six-character code.",
      },
      { property: "og:title", content: "Start your Operating Map" },
      {
        property: "og:description",
        content: "Create your company map and invite the team with a six-character code.",
      },
    ],
  }),
  component: StartPage,
});

function StartPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeBand, setSizeBand] = useState("");
  const [firstName, setFirstName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !industry || !sizeBand || !firstName.trim()) {
      setError("Fill in every field to create your map.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      let company: { id: string; code: string } | null = null;
      for (let attempt = 0; attempt < 5 && !company; attempt += 1) {
        const { data, error: insertError } = await supabase
          .from("companies")
          .insert({
            code: generateCode(),
            name: name.trim(),
            industry,
            size_band: sizeBand,
          })
          .select("id, code")
          .single();
        if (!insertError && data) company = data;
        else if (insertError && !insertError.message.includes("duplicate")) throw insertError;
      }
      if (!company) throw new Error("code");

      const { data: respondent, error: respondentError } = await supabase
        .from("respondents")
        .insert({ company_id: company.id, first_name: firstName.trim() })
        .select("id")
        .single();
      if (respondentError || !respondent) throw respondentError ?? new Error("respondent");

      navigate({
        to: "/survey/$code",
        params: { code: company.code },
        search: { r: respondent.id },
      });
    } catch {
      setBusy(false);
      setError("We could not create your map. Try again in a moment.");
    }
  };

  return (
    <Page>
      <h1 className="text-3xl">Create your company map</h1>
      <p className="mt-2 text-sm text-ink-soft">
        You go first. Everyone else joins with a code.
      </p>

      <div className="mt-8 grid gap-5">
        <label className="grid gap-2">
          <span className="eyebrow">Company name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Hollis & Vance Law"
            className="w-full rounded-xl border border-border bg-cream-deep px-4 py-3.5 text-[15px] outline-none focus:border-forest"
          />
        </label>

        <label className="grid gap-2">
          <span className="eyebrow">Industry</span>
          <select
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className="w-full rounded-xl border border-border bg-cream-deep px-4 py-3.5 text-[15px] outline-none focus:border-forest"
          >
            <option value="">Choose one</option>
            {INDUSTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="eyebrow">Team size</span>
          <select
            value={sizeBand}
            onChange={(event) => setSizeBand(event.target.value)}
            className="w-full rounded-xl border border-border bg-cream-deep px-4 py-3.5 text-[15px] outline-none focus:border-forest"
          >
            <option value="">Choose one</option>
            {SIZE_BANDS.map((option) => (
              <option key={option} value={option}>
                {option} people
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="eyebrow">Your first name</span>
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Marguerite"
            className="w-full rounded-xl border border-border bg-cream-deep px-4 py-3.5 text-[15px] outline-none focus:border-forest"
          />
        </label>

        {error ? <p className="text-sm text-terracotta-deep">{error}</p> : null}

        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="rounded-xl bg-terracotta px-5 py-4 text-[15px] font-medium text-cream transition-colors hover:bg-terracotta-deep disabled:opacity-60"
        >
          {busy ? "Creating your map" : "Create and start"}
        </button>
      </div>
    </Page>
  );
}
