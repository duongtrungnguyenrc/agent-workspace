# Reusable React Components

Read this reference when an approved task creates shared UI primitives, extracts repeated UI, or materially refactors components for reuse.

## Discovery And Ownership

- Search existing shared and feature components first. Reuse, extend, or compose them when their API and styling fit.
- Keep domain-specific UI near its owning feature. Promote code into `src/shared/ui` only when responsibility and reuse are genuinely cross-feature.
- For visual components, follow the nearest `DESIGN.md` tokens, states, spacing, and component tone.

Create or extract a reusable component when the structure or interaction repeats, when state/accessibility/variants are valuable to centralize, or when presentation logic makes a route difficult to scan. Do not add an abstraction merely to shorten a small one-off block.

Stop and ask when component analysis exposes a material choice about ownership, public API, styling system, accessibility behavior, or cross-feature migration risk outside the approved task.

## API Shape

- Prefer typed props and explicit variants over combinations of ad hoc booleans.
- Keep override hooks narrow. Support `className` when useful while retaining predictable core layout and state styles.
- Use `children` for composable content and named props when structure matters for accessibility or consistency.
- Use `forwardRef` only when consumers need DOM refs.
- Keep components framework-local and dependency-light unless an existing library or ReactBits component materially improves the result.

## Quality Bar

- Provide accessible names, semantics, keyboard behavior, and visible focus styles for interactive components.
- Handle disabled, loading, empty, selected, error, and long-content states when they are natural to the API.
- Keep route files as composition layers and place reusable pieces in stable owning modules.
- Add focused tests or examples when the component API, state behavior, or reuse surface is non-trivial.
