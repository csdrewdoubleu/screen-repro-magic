import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CHANNELS,
  DIMENSIONS,
  FUNCTIONS,
  REKEY_HOURS,
  SENIORITIES,
  TENURES,
  TOOL_GROUPS,
  WORK_MODES,
  computeArchetype,
  type Respondent,
  type Scores,
} from "@/lib/om";

type Draft = {
  role_title: string;
  function: string;
  seniority: string;
  tenure_band: string;
  work_mode: string;
  tools: string[];
  rekey_pair: string[];
  rekey_hours: string;
  channel_routine: string;
  channel_sameday: string;
  channel_urgent: string;
  hours_window: string;
  hard_rule: string;
  waits_on: string;
  waited_on_by: string;
  annoying_task: string;
  scores: Scores;
};

const SECTIONS = ["About you", "Tools you live in", "How to reach you", "Working style", "Hand-offs"];

function OptionList({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`w-full rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors ${
              active
                ? "border-forest bg-forest text-cream"
                : "border-border bg-cream-deep text-ink hover:border-forest"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
        active
          ? "border-forest bg-forest text-cream"
          : disabled
            ? "border-border bg-cream-deep/50 text-ink-soft/50"
            : "border-border bg-cream-deep text-ink hover:border-forest"
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <p className="mb-2 font-display text-lg text-forest">{label}</p>
      {hint ? <p className="mb-3 text-sm text-ink-soft">{hint}</p> : null}
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-cream-deep px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft/60 focus:border-forest"
    />
  );
}

function PoleSlider({
  left,
  right,
  value,
  onChange,
}: {
  left: string;
  right: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const steps = [0, 25, 50, 75, 100];
  return (
    <div className="surface p-4">
      <div className="mb-3 grid grid-cols-2 gap-3 text-xs leading-snug text-ink-soft">
        <span>{left}</span>
        <span className="text-right">{right}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {steps.map((step) => {
          const active = value === step;
          return (
            <button
              key={step}
              type="button"
              aria-label={`${left} to ${right}, position ${step / 25 + 1} of 5`}
              onClick={() => onChange(step)}
              className="flex h-12 flex-1 items-center justify-center"
            >
              <span
                className={`block rounded-full transition-all ${
                  active
                    ? "h-7 w-7 bg-terracotta"
                    : "h-4 w-4 bg-cream ring-1 ring-border"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SurveyFlow({
  respondent,
  teammates,
  submitLabel = "Finish",
  onComplete,
}: {
  respondent: Respondent;
  teammates: string[];
  submitLabel?: string;
  onComplete: (editToken: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTool, setCustomTool] = useState("");
  const [draft, setDraft] = useState<Draft>({
    role_title: respondent.role_title ?? "",
    function: respondent.function ?? "",
    seniority: respondent.seniority ?? "",
    tenure_band: respondent.tenure_band ?? "",
    work_mode: respondent.work_mode ?? "",
    tools: respondent.tools ?? [],
    rekey_pair: respondent.rekey_pair ?? [],
    rekey_hours: respondent.rekey_hours ?? "",
    channel_routine: respondent.channel_routine ?? "",
    channel_sameday: respondent.channel_sameday ?? "",
    channel_urgent: respondent.channel_urgent ?? "",
    hours_window: respondent.hours_window ?? "",
    hard_rule: respondent.hard_rule ?? "",
    waits_on: respondent.waits_on ?? "",
    waited_on_by: respondent.waited_on_by ?? "",
    annoying_task: respondent.annoying_task ?? "",
    scores: { ...respondent.scores },
  });

  const groupedTools = useMemo(() => {
    const known = new Set(TOOL_GROUPS.flatMap((group) => group.tools));
    const custom = draft.tools.filter((tool) => !known.has(tool));
    return { custom };
  }, [draft.tools]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleTool = (tool: string) => {
    setDraft((current) => {
      const has = current.tools.includes(tool);
      const tools = has ? current.tools.filter((t) => t !== tool) : [...current.tools, tool];
      const rekey_pair = current.rekey_pair.filter((t) => tools.includes(t));
      return { ...current, tools, rekey_pair };
    });
  };

  const togglePair = (tool: string) => {
    setDraft((current) => {
      const has = current.rekey_pair.includes(tool);
      if (has) return { ...current, rekey_pair: current.rekey_pair.filter((t) => t !== tool) };
      if (current.rekey_pair.length >= 2) return current;
      return { ...current, rekey_pair: [...current.rekey_pair, tool] };
    });
  };

  const sectionValid = (): boolean => {
    if (step === 0)
      return Boolean(draft.function && draft.seniority && draft.tenure_band && draft.work_mode);
    if (step === 2)
      return Boolean(draft.channel_routine && draft.channel_sameday && draft.channel_urgent);
    return true;
  };

  const payloadForStep = (index: number): Record<string, unknown> => {
    switch (index) {
      case 0:
        return {
          role_title: draft.role_title || null,
          function: draft.function,
          seniority: draft.seniority,
          tenure_band: draft.tenure_band,
          work_mode: draft.work_mode,
        };
      case 1:
        return {
          tools: draft.tools,
          rekey_pair: draft.rekey_pair.length === 2 ? draft.rekey_pair : null,
          rekey_hours: draft.rekey_hours || null,
        };
      case 2:
        return {
          channel_routine: draft.channel_routine,
          channel_sameday: draft.channel_sameday,
          channel_urgent: draft.channel_urgent,
          hours_window: draft.hours_window || null,
          hard_rule: draft.hard_rule || null,
        };
      case 3:
        return { scores: draft.scores, archetype: computeArchetype(draft.scores) };
      default:
        return {
          waits_on: draft.waits_on || null,
          waited_on_by: draft.waited_on_by || null,
          annoying_task: draft.annoying_task || null,
          scores: draft.scores,
          archetype: computeArchetype(draft.scores),
        };
    }
  };

  const handleContinue = async () => {
    if (!sectionValid()) {
      setError("Pick an option for each question before you continue.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: saveError } = await supabase
      .from("respondents")
      .update(payloadForStep(step) as never)
      .eq("id", respondent.id);
    setSaving(false);
    if (saveError) {
      setError("That did not save. Check your connection and try again.");
      return;
    }
    if (step === SECTIONS.length - 1) {
      onComplete(respondent.edit_token);
      return;
    }
    setStep(step + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const progress = ((step + (saving ? 0.5 : 0)) / SECTIONS.length) * 100;

  return (
    <div className="pb-28">
      <div className="fixed inset-x-0 top-0 z-10 h-1.5 bg-cream-deep">
        <div
          className="h-full bg-terracotta transition-all duration-300"
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>

      <p className="eyebrow mb-1">
        Section {step + 1} of {SECTIONS.length}
      </p>
      <h1 className="mb-6 text-2xl">{SECTIONS[step]}</h1>

      {step === 0 ? (
        <div>
          <Field label="What is your role title?">
            <TextInput
              value={draft.role_title}
              onChange={(value) => set("role_title", value)}
              placeholder="Managing partner"
            />
          </Field>
          <Field label="Which function are you closest to?">
            <OptionList
              options={FUNCTIONS}
              value={draft.function}
              onChange={(value) => set("function", value)}
            />
          </Field>
          <Field label="Where do you sit?">
            <OptionList
              options={SENIORITIES}
              value={draft.seniority}
              onChange={(value) => set("seniority", value)}
            />
          </Field>
          <Field label="Time with the company">
            <OptionList
              options={TENURES}
              value={draft.tenure_band}
              onChange={(value) => set("tenure_band", value)}
            />
          </Field>
          <Field label="How do you work?">
            <OptionList
              options={WORK_MODES}
              value={draft.work_mode}
              onChange={(value) => set("work_mode", value)}
            />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <Field label="Which tools do you live in?" hint="Tap everything you open most weeks.">
            <div className="grid gap-4">
              {TOOL_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="eyebrow mb-2">{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.tools.map((tool) => (
                      <Chip
                        key={tool}
                        label={tool}
                        active={draft.tools.includes(tool)}
                        onClick={() => toggleTool(tool)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <p className="eyebrow mb-2">Other</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {groupedTools.custom.map((tool) => (
                    <Chip key={tool} label={tool} active onClick={() => toggleTool(tool)} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <TextInput
                    value={customTool}
                    onChange={setCustomTool}
                    placeholder="Add another tool"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const name = customTool.trim();
                      if (!name || draft.tools.includes(name)) return;
                      set("tools", [...draft.tools, name]);
                      setCustomTool("");
                    }}
                    className="shrink-0 rounded-xl border border-forest px-4 text-sm text-forest"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </Field>

          <Field
            label="Which two tools do you copy information between by hand most often?"
            hint="Pick exactly two, or skip this one."
          >
            {draft.tools.length === 0 ? (
              <p className="text-sm text-ink-soft">Choose your tools above first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {draft.tools.map((tool) => (
                  <Chip
                    key={tool}
                    label={tool}
                    active={draft.rekey_pair.includes(tool)}
                    disabled={!draft.rekey_pair.includes(tool) && draft.rekey_pair.length >= 2}
                    onClick={() => togglePair(tool)}
                  />
                ))}
              </div>
            )}
          </Field>

          <Field label="About how many hours a week go to re-keying or copy-paste?">
            <OptionList
              options={REKEY_HOURS}
              value={draft.rekey_hours}
              onChange={(value) => set("rekey_hours", value)}
            />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <Field label="Routine things, reach me by">
            <OptionList
              options={CHANNELS}
              value={draft.channel_routine}
              onChange={(value) => set("channel_routine", value)}
            />
          </Field>
          <Field label="Same-day things, reach me by">
            <OptionList
              options={CHANNELS}
              value={draft.channel_sameday}
              onChange={(value) => set("channel_sameday", value)}
            />
          </Field>
          <Field label="Urgent things, reach me by">
            <OptionList
              options={CHANNELS}
              value={draft.channel_urgent}
              onChange={(value) => set("channel_urgent", value)}
            />
          </Field>
          <Field label="Your working hours">
            <TextInput
              value={draft.hours_window}
              onChange={(value) => set("hours_window", value)}
              placeholder="8am to 6pm ET"
            />
          </Field>
          <Field label="One hard rule">
            <TextInput
              value={draft.hard_rule}
              onChange={(value) => set("hard_rule", value)}
              placeholder="Never text me after 7pm"
            />
          </Field>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4">
          <p className="mb-1 text-sm text-ink-soft">
            Tap where you sit between the two ends. There are no right answers.
          </p>
          {DIMENSIONS.map((dimension) => (
            <PoleSlider
              key={dimension.key}
              left={dimension.left}
              right={dimension.right}
              value={draft.scores[dimension.key] ?? 50}
              onChange={(value) =>
                set("scores", { ...draft.scores, [dimension.key]: value })
              }
            />
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <div>
          <Field label="Who do you most often wait on?">
            <div className="mb-3 flex flex-wrap gap-2">
              {teammates.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  active={draft.waits_on === name}
                  onClick={() => set("waits_on", draft.waits_on === name ? "" : name)}
                />
              ))}
            </div>
            <TextInput
              value={draft.waits_on}
              onChange={(value) => set("waits_on", value)}
              placeholder="Or type a name"
            />
          </Field>
          <Field label="Who most often waits on you?">
            <div className="mb-3 flex flex-wrap gap-2">
              {teammates.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  active={draft.waited_on_by === name}
                  onClick={() => set("waited_on_by", draft.waited_on_by === name ? "" : name)}
                />
              ))}
            </div>
            <TextInput
              value={draft.waited_on_by}
              onChange={(value) => set("waited_on_by", value)}
              placeholder="Or type a name"
            />
          </Field>
          <Field label="The most annoying repeated task in your week" hint="Optional.">
            <TextInput
              value={draft.annoying_task}
              onChange={(value) => set("annoying_task", value)}
              placeholder="Retyping intake notes"
            />
          </Field>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-terracotta-deep">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-cream/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-3">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => {
              setStep(Math.max(0, step - 1));
              if (typeof window !== "undefined") window.scrollTo({ top: 0 });
            }}
            className="rounded-xl border border-forest px-5 py-3.5 text-sm text-forest disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleContinue}
            className="flex-1 rounded-xl bg-terracotta px-5 py-3.5 text-[15px] font-medium text-cream transition-colors hover:bg-terracotta-deep disabled:opacity-60"
          >
            {saving
              ? "Saving"
              : step === SECTIONS.length - 1
                ? submitLabel
                : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
