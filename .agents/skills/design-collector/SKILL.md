---
name: design-collector
description: Extract or refresh a project's design language from existing UI source, styles, screenshots, or brand assets and write it in the repository's DESIGN.md format.
---

# Design Collector

Use this skill when the user asks to infer, collect, extract, refresh, or document a project's visual design system in `DESIGN.md`.

The output is a design contract for future UI implementation, not a redesign proposal. Capture what the project already does unless the user explicitly asks to create a new direction.

## Source Priority

- Start from the nearest existing `DESIGN.md` when present and preserve its schema unless the user asks to replace it.
- Inspect the UI sources that define real visual behavior: theme files, CSS variables, Tailwind config, component libraries, route/page composition, shared UI primitives, icons, typography imports, image assets, and screenshots if available.
- In repositories indexed by CodeGraph, use CodeGraph first for structural exploration of routes, design-system modules, and shared components. Use text search for literal class names, CSS variables, asset names, and copied color values.
- If there is no evidence for a token or behavior, mark it as an assumption or omit it. Do not invent brand colors, typography, states, or component rules to make the document feel complete.

## DESIGN.md Shape

Read [references/design-md-format.md](references/design-md-format.md) before creating or substantially rewriting `DESIGN.md`.

Match the repository's existing format when it differs from the reference. For this project family, `DESIGN.md` normally contains YAML frontmatter with token maps followed by Markdown analysis:

- `version`, `name`, and `description`
- `colors`, `typography`, `rounded`, `spacing`, and `components`
- narrative sections such as Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, and Do's and Don'ts

## Collection Guidance

- Preserve stable token names that are already consumed by code or other tools.
- Prefer exact values from source files over visual approximations. Use visual approximation only when the source is an image/screenshot and label it accordingly.
- Consolidate repeated one-off values into tokens only when the existing UI clearly treats them as a pattern.
- Include component entries for primitives or repeated surfaces that future implementation will reuse, such as app shell rows, buttons, cards, inputs, modals, tables, badges, toasts, empty states, and feature-specific shells.
- Keep examples (`ex-*`) illustrative and tied to real primitives. Do not let examples become fake product requirements.
- Document interaction states only when source evidence exists, such as active, pressed, focus, selected, disabled, loading, or error.
- Record source coverage in the Markdown body: name the files, routes, screenshots, or assets analyzed so future agents understand the evidence base.

## Stop Points

Ask the user before changing `DESIGN.md` when the evidence supports multiple materially different visual directions, when the current UI conflicts with a supplied brand reference, or when completing the document would require choosing new product behavior rather than documenting existing design.

If the request is only to report findings, return the extracted design summary and proposed `DESIGN.md` changes without editing files.
