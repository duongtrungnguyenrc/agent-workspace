# React UI Implementation

Read this reference when an approved implementation task materially changes React screens, routes, layouts, visual states, or interaction-heavy components. The parent `task-implementer` workflow remains authoritative for scope, approval, progress, Git, and PR handling.

## Required Context

- Read the nearest project `DESIGN.md` before making visual decisions. Treat it as the contract for color, typography, spacing, radius, motion, and component tone.
- If a taste/design skill is available for the task, use it before editing UI code. Prefer `design-taste-frontend` for new UI and `redesign-existing-projects` for improving an existing screen.
- Inspect existing app and feature components before creating new ones. Prefer extending or composing existing components over duplicating markup or styling.
- Read [react-reusable-components.md](react-reusable-components.md) when the task creates, extracts, or materially refactors reusable React components.

## ReactBits MCP

When ReactBits MCP is available, search it for the specific component or interaction need and inspect the selected component and demo before adapting it. Use a ReactBits component only when it fits the project design, accessibility, performance, routing, Tailwind, and React constraints. Integrate it into the owning feature or shared module instead of pasting page-only code.

If ReactBits MCP is unavailable, continue with existing local components. Do not block implementation solely because ReactBits cannot be reached.

## Implementation Expectations

- Keep route files focused on data loading and page composition. Move reusable or complex UI into the owning feature or shared UI modules.
- Preserve the approved product scope. Design guidance and component discovery do not authorize unrelated screens, animations, or behavior.
- Stop and ask when UI analysis reveals a material decision about product behavior, information architecture, permissions, interaction model, or visual direction that the approved task and `DESIGN.md` do not resolve.
- Verify responsive behavior, loading/empty/error states, keyboard interaction, focus behavior, and text overflow for affected UI surfaces.
