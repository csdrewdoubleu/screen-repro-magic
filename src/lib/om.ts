export const INDUSTRIES = [
  "Law",
  "Accounting",
  "Consulting",
  "Agency",
  "Real estate",
  "Healthcare",
  "Construction",
  "Retail",
  "Software",
  "Nonprofit",
  "Other",
] as const;

export const SIZE_BANDS = ["1-5", "6-12", "13-25", "26-50", "51+"] as const;

export const FUNCTIONS = [
  "Leadership",
  "Operations",
  "Sales",
  "Marketing",
  "Product & Engineering",
  "Finance & Admin",
  "Client service",
  "Other",
] as const;

export const SENIORITIES = [
  "Founder or partner",
  "Lead or manager",
  "Individual contributor",
] as const;

export const TENURES = ["Under 1 year", "1-3 years", "3-7 years", "7+ years"] as const;

export const WORK_MODES = ["Onsite", "Hybrid", "Remote"] as const;

export const CHANNELS = [
  "Email",
  "Slack or Teams",
  "Text message",
  "Phone call",
  "In person",
] as const;

export const REKEY_HOURS = ["0", "1-2", "3-5", "6-10", "10+"] as const;

export const REKEY_MIDPOINT: Record<string, number> = {
  "0": 0,
  "1-2": 1.5,
  "3-5": 4,
  "6-10": 8,
  "10+": 12,
};

export const TOOL_GROUPS: { group: string; tools: string[] }[] = [
  { group: "Email", tools: ["Gmail", "Outlook"] },
  { group: "Chat", tools: ["Slack", "Microsoft Teams"] },
  { group: "Docs", tools: ["Google Docs", "Microsoft 365", "Notion"] },
  { group: "Projects", tools: ["Asana", "Trello", "Monday", "ClickUp", "Jira", "Linear"] },
  { group: "CRM", tools: ["HubSpot", "Salesforce", "Pipedrive"] },
  { group: "Finance", tools: ["QuickBooks", "Xero", "Stripe"] },
  { group: "Scheduling", tools: ["Calendly", "Google Calendar"] },
  { group: "Files", tools: ["Google Drive", "Dropbox", "Box", "SharePoint"] },
];

export const DIMENSIONS = [
  { key: "async", left: "I'd rather hop on a call", right: "Send it to me in writing" },
  {
    key: "collaborative",
    left: "I do my best work alone",
    right: "I do my best work with people around",
  },
  { key: "improviser", left: "I plan the week on Monday", right: "I figure it out as it comes" },
  { key: "deliberate", left: "I decide fast and adjust", right: "I decide once I've seen everything" },
  { key: "interrupt_averse", left: "Interrupt me any time", right: "Protect my focus, batch it up" },
  { key: "process_skipper", left: "I build the checklist", right: "I skip the checklist" },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export type Scores = Record<DimensionKey, number>;

export const EMPTY_SCORES: Scores = {
  async: 50,
  collaborative: 50,
  improviser: 50,
  deliberate: 50,
  interrupt_averse: 50,
  process_skipper: 50,
};

export type Archetype = {
  name: string;
  vector: Scores;
  description: string;
  worksBestWith: string;
  watchOutFor: string;
};

const vec = (
  a: number,
  c: number,
  i: number,
  d: number,
  ia: number,
  ps: number,
): Scores => ({
  async: a,
  collaborative: c,
  improviser: i,
  deliberate: d,
  interrupt_averse: ia,
  process_skipper: ps,
});

export const ARCHETYPES: Archetype[] = [
  {
    name: "The Anchor",
    vector: vec(85, 20, 25, 75, 85, 25),
    description:
      "Does the deep work that everyone else depends on, and does it best when left alone.",
    worksBestWith: "written briefs, batched questions, clear deadlines",
    watchOutFor: "becoming the bottleneck nobody wants to interrupt",
  },
  {
    name: "The Switchboard",
    vector: vec(15, 85, 50, 40, 15, 50),
    description: "Keeps the whole team connected and moving, in real time.",
    worksBestWith: "quick calls, open channels, a seat near the action",
    watchOutFor: "carrying information in your head that should live in a system",
  },
  {
    name: "The Sprinter",
    vector: vec(40, 50, 85, 15, 30, 85),
    description: "Moves fast, decides fast, and figures the plan out on the way.",
    worksBestWith: "short cycles, freedom to act, visible results",
    watchOutFor: "leaving the checklist behind and repeating the same fix twice",
  },
  {
    name: "The Architect",
    vector: vec(60, 60, 15, 80, 50, 10),
    description: "Builds the process the rest of the team runs on.",
    worksBestWith: "time to design it right, buy-in before launch, a system of record",
    watchOutFor: "over-building for problems that haven't shown up yet",
  },
  {
    name: "The Closer",
    vector: vec(15, 60, 65, 20, 20, 70),
    description: "Gets to a decision and gets people to yes, live and in person.",
    worksBestWith: "a phone, a short agenda, authority to commit",
    watchOutFor: "approvals that only exist in a text thread",
  },
  {
    name: "The Editor",
    vector: vec(80, 30, 60, 70, 60, 55),
    description: "Thinks in writing, decides carefully, and improves what others produce.",
    worksBestWith: "drafts to react to, async review, time before responding",
    watchOutFor: "slowing a decision that only needed a quick yes",
  },
];

export function computeArchetype(scores: Scores): string {
  let best = ARCHETYPES[0];
  let bestDistance = Infinity;
  for (const archetype of ARCHETYPES) {
    let sum = 0;
    for (const dimension of DIMENSIONS) {
      const delta = (scores[dimension.key] ?? 50) - archetype.vector[dimension.key];
      sum += delta * delta;
    }
    if (sum < bestDistance) {
      bestDistance = sum;
      best = archetype;
    }
  }
  return best.name;
}

export function archetypeByName(name: string): Archetype {
  return ARCHETYPES.find((a) => a.name === name) ?? ARCHETYPES[0];
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  let out = "";
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export type Respondent = {
  id: string;
  company_id: string | null;
  edit_token: string;
  first_name: string;
  role_title: string | null;
  function: string;
  seniority: string;
  tenure_band: string;
  work_mode: string;
  tools: string[];
  rekey_pair: string[] | null;
  rekey_hours: string | null;
  channel_routine: string;
  channel_sameday: string;
  channel_urgent: string;
  hours_window: string | null;
  hard_rule: string | null;
  waits_on: string | null;
  waited_on_by: string | null;
  annoying_task: string | null;
  scores: Scores;
  archetype: string;
  created_at: string;
  updated_at: string;
};

export type Company = {
  id: string;
  code: string;
  name: string;
  industry: string;
  size_band: string;
};

export function sizeBandUpper(band: string): number {
  switch (band) {
    case "1-5":
      return 5;
    case "6-12":
      return 12;
    case "13-25":
      return 25;
    case "26-50":
      return 50;
    default:
      return 60;
  }
}
