import { lazy, Suspense, useEffect, useState } from "react";
import type { Respondent } from "@/lib/om";
import { rekeyHours, round } from "@/lib/om-insights";

const PeopleGraph = lazy(() => import("./PeopleGraph"));

type View = "cards" | "graph";

export function PersonCard({ person, extended }: { person: Respondent; extended?: boolean }) {
  return (
    <div className="surface p-4">
      <p className="font-display text-lg text-forest">{person.first_name}</p>
      <p className="text-xs text-ink-soft">{person.role_title || person.function}</p>
      <p className="eyebrow mt-2">{person.archetype}</p>
      <ul className="mt-3 grid gap-1 text-xs text-ink-soft">
        <li>Routine: {person.channel_routine}</li>
        <li>Same day: {person.channel_sameday}</li>
        <li>Urgent: {person.channel_urgent}</li>
      </ul>
      {rekeyHours(person) > 0 ? (
        <p className="mt-2 text-xs text-ink-soft">
          {round(rekeyHours(person))} hours a week re-keying
        </p>
      ) : null}
      {extended ? (
        <div className="mt-3 grid gap-1 border-t pt-3 text-xs text-ink-soft">
          <p>Hard rule: {person.hard_rule || "None given"}</p>
          <p>Re-keying: {person.rekey_hours ?? "0"} hours a week</p>
        </div>
      ) : null}
    </div>
  );
}

export function PeopleSection({ code, respondents }: { code: string; respondents: Respondent[] }) {
  const [view, setView] = useState<View>("cards");
  const [hydrated, setHydrated] = useState(false);
  const key = `om-people-view-${code}`;

  useEffect(() => {
    const saved = window.localStorage.getItem(key);
    if (saved === "cards" || saved === "graph") setView(saved);
    else setView(window.innerWidth >= 1024 ? "graph" : "cards");
    setHydrated(true);
  }, [key]);

  const choose = (v: View) => {
    setView(v);
    window.localStorage.setItem(key, v);
  };

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border bg-cream-deep p-1" role="tablist">
        {(["cards", "graph"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => choose(v)}
            className={`rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
              view === v ? "bg-forest text-cream" : "text-ink-soft"
            }`}
          >
            {v === "cards" ? "Cards" : "Graph"}
          </button>
        ))}
      </div>
      {view === "graph" && hydrated ? (
        <Suspense
          fallback={<div className="h-[420px] rounded-xl bg-forest-deep lg:h-[560px]" />}
        >
          <PeopleGraph respondents={respondents} />
        </Suspense>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {respondents.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}
