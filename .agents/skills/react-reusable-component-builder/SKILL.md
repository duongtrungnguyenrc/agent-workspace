---
name: react-reusable-component-builder
description: Design, extract, or refactor reusable React components with clear ownership, typed APIs, Tailwind-friendly styling, and minimal duplication.
---

# Reusable Component Builder

Use this skill when creating shared UI primitives, extracting repeated UI from routes/features, or refactoring components for reuse.

When component work is part of an approved implementation task, use the project `git-workflow` skill for branch setup, scoped commits, local review before PR, GitHub CLI PR creation, and PR review. This skill only guides component design and refactoring decisions.

## Component Discovery

- Search existing components first. Reuse, extend, or compose what already exists when the API and styling fit.
- Check nearby feature components before promoting code into `src/shared/ui`; keep domain-specific UI close to its route or feature.
- If the component is visual, read `DESIGN.md` and align naming, spacing, states, and variants to the project design system.

## Reuse Criteria

Create or extract a reusable component when at least one is true:

- The same structure or interaction appears in multiple places.
- A component has meaningful state, accessibility behavior, or styling variants worth centralizing.
- A route/page is becoming hard to scan because presentation logic dominates composition.

Do not extract a component just to reduce a few lines of simple one-off markup.

Stop and ask the user before proceeding when component analysis reveals materially different ownership boundaries, public APIs, styling systems, accessibility behavior, or cross-feature impacts that would change the approved scope or create migration risk.

## API Shape

- Prefer typed props with explicit variant names over ad hoc boolean combinations.
- Keep styling override hooks narrow: `className` is useful, but core layout and state styles should stay predictable.
- Support `children` for composable content; expose named props when structure matters for accessibility or consistent layout.
- Use `forwardRef` only when consumers need DOM refs.
- Keep components framework-local and dependency-light unless an existing library or ReactBits component materially improves the result.

## Quality Bar

- Include accessible names, roles, keyboard behavior, and focus styles for interactive components.
- Handle disabled, loading, empty, selected, error, and long-content states when they are natural for the component.
- Keep route files and screens as composition layers; move reusable pieces into stable modules.
- Add focused tests or examples when the component API, state behavior, or reuse surface is non-trivial.
