import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/om/Chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operating Map: see how your team actually works" },
      {
        name: "description",
        content:
          "A five-minute team intake from Cascade Studios that maps working styles, reach preferences, tools, and automation opportunities.",
      },
      { property: "og:title", content: "Operating Map: see how your team actually works" },
      {
        property: "og:description",
        content:
          "A five-minute team intake from Cascade Studios that maps working styles, reach preferences, tools, and automation opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const join = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) return;
    navigate({ to: "/join/$code", params: { code: clean } });
  };

  return (
    <Page>
      <h1 className="mt-6 text-4xl leading-tight">
        See how your team actually works, in five minutes.
      </h1>

      <div className="mt-8 grid gap-3">
        <Link
          to="/start"
          className="rounded-xl bg-terracotta px-5 py-4 text-center text-[15px] font-medium text-cream transition-colors hover:bg-terracotta-deep"
        >
          Map your company
        </Link>
        <div className="surface p-4">
          <p className="eyebrow mb-2">Join with a code</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(event) => {
                if (event.key === "Enter") join();
              }}
              placeholder="ABC123"
              maxLength={6}
              className="code-text w-full min-w-0 rounded-xl border border-border bg-cream px-4 py-3.5 text-ink outline-none placeholder:text-ink-soft/50 focus:border-forest"
            />
            <button
              type="button"
              onClick={join}
              className="shrink-0 rounded-xl bg-forest px-5 py-3.5 text-sm text-cream transition-colors hover:bg-forest-deep"
            >
              Join
            </button>
          </div>
        </div>
      </div>

      <ul className="mt-10 grid gap-4">
        {[
          "Working-style profile for every person",
          "A reach map: who to contact how, and when",
          "Automation opportunities drawn from your own answers",
        ].map((line) => (
          <li key={line} className="flex gap-3 text-[15px] text-ink">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm leading-relaxed text-ink-soft">
        We ask how you like to work, never what you work on. Answers are visible on your company's
        map. Ask us to delete them any time at hello@cascadestudios.co.
      </p>
    </Page>
  );
}
