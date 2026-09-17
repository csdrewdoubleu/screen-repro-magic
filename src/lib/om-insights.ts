import { DIMENSIONS, REKEY_MIDPOINT, type DimensionKey, type Respondent } from "./om";

export type Opportunity = {
  title: string;
  evidence: string;
  hours: number;
  build: string;
};

export function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function rekeyHours(respondent: Respondent): number {
  return REKEY_MIDPOINT[respondent.rekey_hours ?? "0"] ?? 0;
}

export function totalRekeyHours(respondents: Respondent[]): number {
  return respondents.reduce((sum, r) => sum + rekeyHours(r), 0);
}

export function allTools(respondents: Respondent[]): string[] {
  const set = new Set<string>();
  for (const r of respondents) for (const t of r.tools) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function pairKey(pair: string[] | null): string | null {
  if (!pair || pair.length !== 2 || !pair[0] || !pair[1]) return null;
  return [...pair].sort((a, b) => a.localeCompare(b)).join(" ↔ ");
}

export function dimensionSplit(
  respondents: Respondent[],
  key: DimensionKey,
): { low: number; high: number; split: boolean } {
  let low = 0;
  let high = 0;
  for (const r of respondents) {
    const value = r.scores?.[key] ?? 50;
    if (value <= 25) low += 1;
    if (value >= 75) high += 1;
  }
  return { low, high, split: low >= 2 && high >= 2 };
}

export function waitsOnCounts(respondents: Respondent[]): [string, number][] {
  const map = new Map<string, number>();
  for (const r of respondents) {
    const name = (r.waits_on ?? "").trim();
    if (!name) continue;
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const GENERIC: Opportunity[] = [
  {
    title: "A shared intake form so requests arrive complete",
    evidence: "Requests arrive in different channels with different details each time.",
    hours: 1.5,
    build: "One form that routes to the right owner with everything needed to start.",
  },
  {
    title: "One weekly written status instead of status meetings",
    evidence: "Status lives in people's heads and gets repeated in meetings.",
    hours: 1,
    build: "A short written update assembled from the tools the team already uses.",
  },
  {
    title: "A reach map everyone can see, so urgent things go to the right channel",
    evidence: "Channel preferences are known by habit, not written down anywhere.",
    hours: 1,
    build: "A live directory of how to reach each person, by urgency.",
  },
];

export function buildOpportunities(respondents: Respondent[]): Opportunity[] {
  const cards: Opportunity[] = [];
  if (respondents.length === 0) return GENERIC.slice(0, 3);

  // Rule 1: manual bridge
  const pairGroups = new Map<string, Respondent[]>();
  for (const r of respondents) {
    const key = pairKey(r.rekey_pair);
    if (!key) continue;
    pairGroups.set(key, [...(pairGroups.get(key) ?? []), r]);
  }
  for (const [key, people] of pairGroups) {
    if (people.length < 2) continue;
    const [a, b] = key.split(" ↔ ");
    cards.push({
      title: `Automate the ${a} to ${b} hand-off`,
      evidence: `${people.length} people copy between ${a} and ${b} by hand.`,
      hours: people.reduce((sum, p) => sum + rekeyHours(p), 0),
      build: `A sync that moves records between ${a} and ${b} on a trigger, with a review queue for exceptions.`,
    });
  }

  const waits = waitsOnCounts(respondents);

  // Rule 2: phone-first decider
  for (const [name, count] of waits) {
    if (count < 2) continue;
    const person = respondents.find(
      (r) => r.first_name.toLowerCase() === name.toLowerCase(),
    );
    if (!person) continue;
    const isDecider =
      person.seniority === "Founder or partner" || person.seniority === "Lead or manager";
    const phoneFirst =
      person.channel_urgent === "Phone call" || person.channel_urgent === "Text message";
    if (!isDecider || !phoneFirst) continue;
    cards.push({
      title: `Route approvals to ${person.first_name} by text with a one-tap reply`,
      evidence: `${count} people wait on ${person.first_name}, who only takes urgent items by ${person.channel_urgent.toLowerCase()}.`,
      hours: 1.5 * count,
      build:
        "Approval requests arrive as a text with Approve / Reject / Call me buttons; the answer flows back into your system of record.",
    });
  }

  // Rule 3: writing vs calling split
  const asyncSplit = dimensionSplit(respondents, "async");
  if (asyncSplit.split) {
    cards.push({
      title: "Default to written briefs, with one standing sync for the callers",
      evidence: `${asyncSplit.low} people prefer a call, ${asyncSplit.high} prefer writing.`,
      hours: 2,
      build:
        "A brief template plus a weekly 20-minute sync, so nobody chases anybody for context.",
    });
  }

  // Rule 4: single-owner tool
  const functionCounts = countBy(respondents, (r) => r.function);
  const toolOwners = new Map<string, Respondent[]>();
  for (const r of respondents) {
    for (const tool of r.tools) {
      toolOwners.set(tool, [...(toolOwners.get(tool) ?? []), r]);
    }
  }
  for (const [tool, owners] of toolOwners) {
    if (owners.length !== 1) continue;
    const owner = owners[0]!;
    const teamSize = functionCounts.get(owner.function) ?? 1;
    if (teamSize < 2) continue;
    cards.push({
      title: `Shared view of ${tool} so ${owner.first_name} isn't the only door`,
      evidence: `${tool} is used only by ${owner.first_name} in a ${owner.function} team of ${teamSize}.`,
      hours: 2,
      build: `A read-only dashboard or shared inbox for ${tool} that the rest of ${owner.function} can act on.`,
    });
  }

  // Rule 5: waiting chain
  for (const [name, count] of waits) {
    if (count < 3) continue;
    cards.push({
      title: `Delegate or auto-approve under a threshold for ${name}`,
      evidence: `${count} people wait on ${name}.`,
      hours: count,
      build: `A rule set that auto-approves routine items and escalates only the exceptions to ${name}.`,
    });
  }

  // Rule 6: re-keying load
  const hours = totalRekeyHours(respondents);
  if (hours >= 10) {
    cards.push({
      title: "Integration sprint",
      evidence: `This team loses about ${round(hours)} hours a week to copy-paste across ${allTools(respondents).length} tools.`,
      hours,
      build:
        "Two weeks connecting the three highest-traffic tools, starting with the most common bridge.",
    });
  }

  const sorted = cards.sort((a, b) => b.hours - a.hours);
  const filled = [...sorted];
  for (const generic of GENERIC) {
    if (filled.length >= 3) break;
    filled.push(generic);
  }
  return filled.slice(0, 5);
}

export function round(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function teamMean(respondents: Respondent[], key: DimensionKey): number {
  if (respondents.length === 0) return 50;
  const sum = respondents.reduce((total, r) => total + (r.scores?.[key] ?? 50), 0);
  return Math.round(sum / respondents.length);
}

export function splitSentence(respondents: Respondent[], key: DimensionKey): string | null {
  const { low, high, split } = dimensionSplit(respondents, key);
  if (!split) return null;
  const dimension = DIMENSIONS.find((d) => d.key === key)!;
  return `${low} people lean toward "${dimension.left.toLowerCase()}", ${high} lean toward "${dimension.right.toLowerCase()}".`;
}
