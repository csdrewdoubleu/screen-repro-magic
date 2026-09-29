import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  DIMENSIONS,
  FUNCTIONS,
  SENIORITIES,
  TENURES,
  WORK_MODES,
  sizeBandUpper,
  type Company,
  type Respondent,
} from "@/lib/om";
import {
  allTools,
  buildOpportunities,
  countBy,
  pairKey,
  rekeyHours,
  round,
  splitSentence,
  teamMean,
  totalRekeyHours,
  waitsOnCounts,
} from "@/lib/om-insights";

const CHART_COLORS = [
  "var(--color-forest)",
  "var(--color-terracotta)",
  "var(--color-peach)",
  "var(--color-forest-deep)",
  "var(--color-ink-soft)",
  "var(--color-cream-deep)",
];

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
      <h2 className="mb-4 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function BarRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3">
      <span className="min-w-0 truncate text-sm text-ink-soft">{label}</span>
      <span className="h-3 rounded-full bg-cream">
        <span
          className="block h-3 rounded-full bg-forest"
          style={{ width: `${Math.max(pct, value > 0 ? 6 : 0)}%` }}
        />
      </span>
      <span className="text-sm tabular-nums text-ink-soft">{value}</span>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="surface min-w-0 p-5">
      {title ? <h3 className="mb-3 font-display text-lg text-forest">{title}</h3> : null}
      {children}
    </div>
  );
}

export function Dashboard({
  company,
  respondents,
  onRefresh,
}: {
  company: Company;
  respondents: Respondent[];
  onRefresh: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const joinUrl =
    typeof window === "undefined"
      ? `https://cascadestudios.co/join/${company.code}`
      : `${window.location.origin}/join/${company.code}`;

  const opportunities = useMemo(() => buildOpportunities(respondents), [respondents]);
  const tools = useMemo(() => allTools(respondents), [respondents]);
  const waits = useMemo(() => waitsOnCounts(respondents), [respondents]);

  const functionCounts = countBy(respondents, (r) => r.function);
  const donutData = FUNCTIONS.filter((f) => (functionCounts.get(f) ?? 0) > 0).map((f) => ({
    name: f,
    value: functionCounts.get(f) ?? 0,
  }));

  const archetypeCounts = countBy(respondents, (r) => r.archetype);
  const archetypeData = [...archetypeCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const seniorityCounts = countBy(respondents, (r) => r.seniority);
  const tenureCounts = countBy(respondents, (r) => r.tenure_band);
  const workModeCounts = countBy(respondents, (r) => r.work_mode);

  const soloTools = tools.filter(
    (tool) => respondents.filter((r) => r.tools.includes(tool)).length === 1,
  );

  const pairCounts = new Map<string, number>();
  for (const r of respondents) {
    const key = pairKey(r.rekey_pair);
    if (key) pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  const topPair = [...pairCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const rekeyTotal = totalRekeyHours(respondents);

  const deciders = respondents.filter(
    (r) =>
      (r.seniority === "Founder or partner" || r.seniority === "Lead or manager") &&
      (r.channel_urgent === "Phone call" || r.channel_urgent === "Text message"),
  );
  const decidersTotal = respondents.filter(
    (r) => r.seniority === "Founder or partner" || r.seniority === "Lead or manager",
  ).length;

  const annoying = respondents
    .map((r) => ({ name: r.first_name, task: (r.annoying_task ?? "").trim() }))
    .filter((item) => item.task.length > 0);

  return (
    <div>
      <div className="rounded-2xl bg-forest p-5 text-cream">
        <p className="eyebrow text-cream/70">Operating map</p>
        <h1 className="mt-1 font-display text-3xl text-cream">{company.name}</h1>
        <p className="mt-1 text-sm text-cream/80">
          {company.industry} · {company.size_band} people
        </p>
        <p className="mt-3 text-sm text-cream/90">
          {respondents.length} of about {sizeBandUpper(company.size_band)} mapped
        </p>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-cream/70">Join code</p>
            <p className="code-text mt-1 text-3xl text-cream">{company.code}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-3 rounded-xl border border-cream/40 px-4 py-2.5 text-sm text-cream"
            >
              {copied ? "Link copied" : "Copy join link"}
            </button>
          </div>
          <div className="shrink-0 rounded-xl bg-cream p-2">
            <QRCodeSVG value={joinUrl} size={96} bgColor="transparent" fgColor="#2D4A2B" />
          </div>
        </div>
        <p className="mt-4 text-sm text-cream/80">Everyone who joins makes the map sharper.</p>
      </div>

      {respondents.length === 0 ? (
        <div className="surface mt-8 p-6 text-center">
          <p className="text-sm text-ink-soft">
            No one has answered yet. Share the code above and the map fills in as people finish.
          </p>
        </div>
      ) : null}

      <Section title="Who is here" eyebrow="Work demographics">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Functions">
            {donutData.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing to show yet.</p>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3">
                <div className="h-40 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="90%"
                        stroke="none"
                      >
                        {donutData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="grid min-w-0 gap-1.5">
                  {donutData.map((entry, index) => (
                    <li key={entry.name} className="flex min-w-0 items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="min-w-0 truncate text-ink-soft">{entry.name}</span>
                      <span className="tabular-nums text-ink-soft">{entry.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Seniority">
            <div className="grid gap-2">
              {SENIORITIES.map((label) => (
                <BarRow
                  key={label}
                  label={label}
                  value={seniorityCounts.get(label) ?? 0}
                  total={respondents.length}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Time with the company">
            <div className="grid gap-2">
              {TENURES.map((label) => (
                <BarRow
                  key={label}
                  label={label}
                  value={tenureCounts.get(label) ?? 0}
                  total={respondents.length}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Work mode">
            <div className="flex h-10 overflow-hidden rounded-xl">
              {WORK_MODES.map((mode, index) => {
                const count = workModeCounts.get(mode) ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={mode}
                    className="grid place-items-center text-[11px] text-cream"
                    style={{
                      width: `${(count / Math.max(respondents.length, 1)) * 100}%`,
                      background: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {WORK_MODES.map((mode, index) => (
                <span key={mode} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  {mode}
                </span>
              ))}
            </div>
          </Panel>
        </div>
      </Section>

      <Section title="How this team works" eyebrow="Working style">
        <div className="grid gap-4">
          <Panel title="Archetypes">
            {archetypeData.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing to show yet.</p>
            ) : (
              <div style={{ height: archetypeData.length * 44 + 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={archetypeData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--color-ink-soft)", fontSize: 12 }}
                    />
                    <Bar dataKey="value" fill="var(--color-forest)" radius={[0, 6, 6, 0]} label={{ position: "right", fill: "var(--color-ink-soft)", fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel title="The spread">
            <div className="grid gap-5">
              {DIMENSIONS.map((dimension) => {
                const mean = teamMean(respondents, dimension.key);
                const sentence = splitSentence(respondents, dimension.key);
                return (
                  <div key={dimension.key}>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-soft">
                      <span>{dimension.left}</span>
                      <span className="text-right">{dimension.right}</span>
                    </div>
                    <div className="relative mt-2 h-8">
                      <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-cream" />
                      {respondents.map((person) => (
                        <span
                          key={person.id}
                          title={`${person.first_name}`}
                          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-forest ring-2 ring-cream-deep"
                          style={{ left: `${person.scores?.[dimension.key] ?? 50}%` }}
                        />
                      ))}
                      <span
                        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-terracotta ring-2 ring-cream-deep"
                        title={`Team average: ${mean}`}
                        style={{ left: `${mean}%` }}
                      />
                    </div>
                    {sentence ? (
                      <p className="mt-1 text-xs text-ink-soft">{sentence}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </Section>

      <Section title="Tool stack" eyebrow="What the team runs on">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            {tools.length === 0 ? (
              <p className="text-sm text-ink-soft">No tools named yet.</p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-cream-deep pr-3 text-left font-normal text-ink-soft">
                        Tool
                      </th>
                      {respondents.map((person) => (
                        <th
                          key={person.id}
                          className="px-1 pb-2 text-center font-normal text-ink-soft"
                        >
                          {person.first_name.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tools.map((tool) => (
                      <tr key={tool}>
                        <td className="sticky left-0 whitespace-nowrap bg-cream-deep py-1 pr-3 text-ink">
                          {tool}
                        </td>
                        {respondents.map((person) => (
                          <td key={person.id} className="px-1 py-1">
                            <span
                              className={`mx-auto block h-4 w-4 rounded ${
                                person.tools.includes(tool) ? "bg-forest" : "bg-cream"
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid gap-4">
            <Panel title="Tools used by only one person">
              <p className="font-display text-3xl text-terracotta">{soloTools.length}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {soloTools.length > 0 ? soloTools.join(", ") : "Every tool has at least two people."}
              </p>
            </Panel>
            <Panel title="Most common manual bridge">
              <p className="font-display text-xl text-forest">{topPair ? topPair[0] : "None yet"}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {topPair
                  ? `${topPair[1]} ${topPair[1] === 1 ? "person" : "people"} named this pair.`
                  : "Nobody has named a copy-paste pair."}
              </p>
            </Panel>
            <Panel title="Hours a week lost to re-keying">
              <p className="font-display text-3xl text-terracotta">{round(rekeyTotal)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                Summed across {respondents.length} {respondents.length === 1 ? "person" : "people"}.
              </p>
            </Panel>
          </div>
        </div>
      </Section>

      <Section title="Reach map" eyebrow="Who to contact how">
        <p className="mb-3 text-sm text-ink-soft">
          {decidersTotal === 0
            ? "No decision-makers have been mapped yet."
            : `${deciders.length} of ${decidersTotal} decision-makers are phone-first. Anything that needs their sign-off should reach them by text, not email.`}
        </p>
        <div className="surface overflow-x-auto p-1">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left">
                {["Person", "Routine", "Same day", "Urgent", "Hours", "Hard rule"].map((head) => (
                  <th key={head} className="px-3 py-2 text-xs font-normal text-ink-soft">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {respondents.map((person) => {
                const flagged = deciders.some((d) => d.id === person.id);
                return (
                  <tr
                    key={person.id}
                    className={`border-t border-border ${flagged ? "bg-peach/50" : ""}`}
                  >
                    <td className="px-3 py-2.5">
                      <span className="block text-ink">{person.first_name}</span>
                      <span className="block text-xs text-ink-soft">
                        {person.role_title || person.function}
                      </span>
                      {flagged ? (
                        <span className="eyebrow mt-1 block text-terracotta-deep">
                          Phone-first decider
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">{person.channel_routine}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{person.channel_sameday}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{person.channel_urgent}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{person.hours_window || "-"}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{person.hard_rule || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Where work waits" eyebrow="Hand-offs">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Most waited on">
            {waits.length === 0 ? (
              <p className="text-sm text-ink-soft">No hand-offs named yet.</p>
            ) : (
              <div className="grid gap-2">
                {waits.map(([name, count]) => (
                  <BarRow key={name} label={name} value={count} total={respondents.length} />
                ))}
              </div>
            )}
          </Panel>
          <Panel title="The annoying repeats">
            {annoying.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing named yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {annoying.map((item) => (
                  <span
                    key={`${item.name}-${item.task}`}
                    className="rounded-full border border-border bg-cream px-3 py-2 text-xs text-ink-soft"
                  >
                    "{item.task}" · {item.name}
                  </span>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </Section>

      <Section title="Automation opportunities" eyebrow="Drawn from your answers">
        <div className="grid gap-4 lg:grid-cols-2">
          {opportunities.map((card) => (
            <div key={card.title} className="surface border-l-4 border-l-terracotta p-5">
              <h3 className="font-display text-xl text-forest">{card.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{card.evidence}</p>
              <p className="mt-3 font-display text-2xl text-terracotta">
                {round(card.hours)} hours a week
              </p>
              <p className="eyebrow mt-3">What Cascade would build</p>
              <p className="text-sm text-ink">{card.build}</p>
            </div>
          ))}
        </div>
      </Section>

      <LeadBand
        company={company}
        topOpportunity={opportunities[0]?.title ?? ""}
        onSaved={onRefresh}
      />

      <Section title="People" eyebrow="The team so far">
        <PeopleSection code={company.code} respondents={respondents} />
      </Section>
    </div>
  );
}

function LeadBand({
  company,
  topOpportunity,
  onSaved,
}: {
  company: Company;
  topOpportunity: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState(company.name);
  const [automate, setAutomate] = useState(topOpportunity);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setState("error");
      return;
    }
    setState("saving");
    const { error } = await supabase.from("leads").insert({
      company_id: company.id,
      name: name.trim(),
      email: email.trim(),
      company_name: companyName.trim() || null,
      automate_first: automate.trim() || null,
    });
    if (error) {
      setState("error");
      return;
    }
    setState("done");
    onSaved();
  };

  const inputClass =
    "w-full rounded-xl border border-cream/30 bg-cream/10 px-4 py-3.5 text-[15px] text-cream outline-none placeholder:text-cream/50 focus:border-cream";

  return (
    <section className="mt-12 rounded-2xl bg-terracotta p-5 text-cream">
      <h2 className="font-display text-2xl text-cream">Talk to Cascade</h2>
      <p className="mt-2 text-sm text-cream/90">
        Want this map turned into working software? Cascade builds it in two weeks.
      </p>

      {state === "done" ? (
        <p className="mt-5 text-[15px] text-cream">
          Thanks. We'll reach out within two business days.
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className={inputClass}
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className={inputClass}
          />
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Company"
            className={inputClass}
          />
          <input
            value={automate}
            onChange={(event) => setAutomate(event.target.value)}
            placeholder="What would you automate first?"
            className={inputClass}
          />
          {state === "error" ? (
            <p className="text-sm text-cream">Add your name and email, then try again.</p>
          ) : null}
          <button
            type="button"
            disabled={state === "saving"}
            onClick={submit}
            className="rounded-xl bg-cream px-5 py-4 text-[15px] font-medium text-terracotta-deep transition-colors hover:bg-cream-deep disabled:opacity-60"
          >
            {state === "saving" ? "Sending" : "Send it over"}
          </button>
        </div>
      )}
    </section>
  );
}
