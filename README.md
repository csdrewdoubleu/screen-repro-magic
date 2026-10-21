# Operating Map

**Status: working prototype (not production).** Built September 2026 by Drew Williams at [Cascade Studios](https://cascadestudios.co), with Lovable as the build agent and Claude for the brief, the data model, and the review passes. Code review and edits since then by hand and with Claude Code.

Operating Map is a five-minute survey that turns a small company's staff into a visual map of how the business actually runs: who works where, which tools they live in, where work gets re-keyed by hand, how people prefer to be reached, and what each person's working style is. The company dashboard then proposes concrete automations ranked by hours saved.

The voice version of the intake lives in a sibling project, [om-voice](https://github.com/csdrewdoubleu/om-voice), and is not yet wired into this app.

## What it does

1. **Start a company** (`/start`): name, industry, size band. Returns a join code.
2. **Join and take the survey** (`/join/:code` → `/survey/:code`): five sections, mobile-first.
   - About you: role, function, seniority, tenure, onsite/remote/hybrid
   - Tools: which tools you use, and which pair you copy data between by hand, and for how many hours a week
   - Reach: how to contact you for routine, same-day, and urgent things; working hours; one hard rule
   - Working style: six sliders (async vs. live, solo vs. collaborative, planner vs. improviser, fast vs. deliberate, interrupt-tolerant vs. interrupt-averse, process-writer vs. process-skipper)
   - Hand-offs: who you wait on, who waits on you, and the one task you'd delete
3. **Personal result** (`/done/:editToken`): the respondent's archetype, computed as the nearest of six working-style vectors (The Anchor, The Switchboard, The Sprinter, The Architect, The Closer, The Editor), plus what they work best with and what to watch out for. The edit token is the only credential; there are no accounts.
4. **Company map** (`/c/:code`): a dashboard with a People section (cards, or a force-directed graph of people, tools, and re-key lines on larger screens), a reach map, and automation cards generated from the data: shared intake forms, written status instead of meetings, automating a specific tool-to-tool hand-off, routing approvals to the right person, and so on, each with an hours-saved estimate.
5. **Contact form**: captures a lead with the one automation the company wants first.

Try the demo map at `/c/HOLLIS` on a deployed build.

## Stack

- TanStack Start (React 19, TanStack Router and Query), TypeScript, Vite, Tailwind 4, shadcn/ui
- Supabase (Postgres, row-level security) for `companies`, `respondents`, and `leads`
- `react-force-graph-2d` for the people graph; `recharts` for the dashboard
- Hosted on Lovable; two-way synced with this repo

## Data model

Three tables, defined in `supabase/migrations/`:

- `companies`: code, name, industry, size band
- `respondents`: profile fields, tools, re-key pair and hours, reach channels, a `scores` JSON with the six working-style dimensions (0 to 100), and the computed `archetype`
- `leads`: contact-form submissions

Scoring and archetype math is in `src/lib/om.ts`; the automation rules are in `src/lib/om-insights.ts`.

## Running locally

```sh
npm i
npm run dev
```

The `.env` in this repo holds only the Supabase project URL and **publishable** key, which are safe to expose by design. No server secrets are committed.

## Known limitations

- Prototype access model: row-level security policies allow public read and update on `companies` and `respondents`. Edit tokens are unguessable but there is no authentication. Do not put real company data in a deployed copy without tightening the policies.
- One migration, no seed script; the HOLLIS demo data was inserted by hand.
- The voice intake (om-voice) is a separate app for now.

## How it was built

The brief, the five-section survey, the six-dimension scoring, the archetype set, and the automation rules were written first as a document, then handed to Lovable to implement. Later rounds (the People graph, logo marks, mobile layout) were specified the same way: a written change brief, an agent build, a review of the diff. See `AGENTS.md` for the conventions the agent follows in this repo.
