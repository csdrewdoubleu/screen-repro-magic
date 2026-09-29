<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Graph tool marks are embedded as local SVG image data in `src/components/om/tool-logos.ts` and loaded into canvas once per tool; this keeps the graph independent of third-party image requests and preserves a monogram fallback for custom tools.
