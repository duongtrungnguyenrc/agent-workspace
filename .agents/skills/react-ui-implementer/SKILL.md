---
name: react-ui-implementer
description: Implement frontend UI tasks using the project DESIGN.md, available taste skills, existing reusable components, and ReactBits MCP components when they improve fit or speed.
---

# UI Implementation

Use this skill when implementing or materially changing UI screens, routes, layouts, visual states, or interaction-heavy frontend components.

When the UI work is part of an approved implementation task, use the project `git-workflow` skill for branch setup, scoped commits, local review before PR, GitHub CLI PR creation, and PR review. This UI skill governs frontend execution quality; it does not override the Git or Vibe Kanban workflow.

## Required Context

- Read the nearest project `DESIGN.md` before making UI decisions. Treat it as the visual contract for color, typography, spacing, radius, motion, and component tone.
- If a taste/design skill is available for the task, use it before editing UI code. Prefer `design-taste-frontend` for new UI, `redesign-existing-projects` for improving existing screens, and a more specific visual skill only when the request explicitly calls for that style.
- Inspect existing app components before creating new ones. Prefer extending or composing local reusable components over duplicating markup or styling.

## ReactBits MCP

When ReactBits MCP tools are available, use them during UI implementation for component discovery:

- List or search ReactBits components for the specific UI need, animation pattern, or interaction pattern.
- Fetch the selected component and demo before adapting it.
- Choose ReactBits components only when they match the product's design direction and can be integrated cleanly with the project's React, routing, Tailwind, accessibility, and performance constraints.
- Adapt imported code into the project's modular structure instead of pasting one-off page-only blocks.

If ReactBits MCP is unavailable, continue with existing local components and normal implementation. Do not block the task only because ReactBits cannot be reached.

## Implementation Expectations

- Keep route files focused on data loading and page composition. Move reusable or complex UI into feature/shared components.
- Split reusable pieces by stable responsibility: primitives in `src/shared/ui`, app providers in `src/app/providers`, feature-specific components near the feature or route that owns them.
- Avoid adding a new abstraction for a single tiny element unless it is clearly part of a repeated pattern.
- Preserve the approved product scope. ReactBits and taste guidance improve execution; they do not authorize adding unrelated animations, sections, or features.
- Stop and ask the user if UI analysis exposes materially different product behavior, information architecture, permission visibility, interaction model, or visual direction that is not resolved by the approved task or `DESIGN.md`.
- Verify responsive behavior, empty/loading/error states, keyboard interaction, and text overflow for any new UI surface.
