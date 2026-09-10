---
name: auto-us
description: Explicitly scan a project with CodeGraph to infer feature clusters and create Vibe Kanban group/feature tickets on request.
---

# Auto US

Use this skill only when the user explicitly asks the agent to auto-generate, infer, scan, or bootstrap user stories/use cases from the current project. Do not invoke it implicitly during normal implementation, bug fixing, or story-writing from user-provided requirements.

## Goal

Infer a practical product map from the codebase and create Vibe Kanban tickets that help humans and agents understand existing feature areas.

Use `auto-us` as the bootstrap path for a new project that already has code after `./scripts/setup.sh` has installed skills and initialized CodeGraph. If the user provides product notes rather than an existing codebase to scan, use `documenter` instead.

## Source Exploration

Use CodeGraph first. If the repository has no `.codegraph/` index, stop and tell the user to run project setup or `codegraph init`; do not infer a full feature map from ad hoc file search alone.

Focus on entry points that reveal product features:

- app routes, screens, pages, controllers, handlers, and navigation
- sidebar, menu, tab, route registry, layout shell, and permission-gated feature modules
- API route groups, service boundaries, GraphQL resolvers, background jobs, and mobile screens
- existing tests or fixtures that describe workflows

Use native text search only for literal labels, menu text, route strings, or after CodeGraph identifies a specific file.

## Analysis Checkpoints

Stop and ask the user before creating or updating tickets when the scan reveals multiple reasonable product maps, ambiguous feature ownership, unclear actor intent, overlapping feature clusters, or a non-user-facing area that might be better represented as `task`.

Ask a concise question with the discovered options. If the uncertainty is only about labels or minor grouping and does not change the product map, proceed with a documented assumption in the ticket `specification`.

## Ticket Creation

Create Vibe Kanban tickets only after the feature clusters are clear enough to summarize.

Default structure:

```text
group
  feature[]
```

- Create a `group` ticket for each coherent product capability or feature cluster.
- Create multiple `feature` children when the feature has distinct actor goals, scenarios, workflow variants, or acceptance areas.
- Store codebase-derived evidence and assumptions in ticket `specification`.
- Use source fields to mark that the source is inferred from the repository, for example `source_type=codegraph` and a `source_snapshot` summarizing the scanned routes/modules.
- Do not create implementation `task` tickets unless the user also asks to implement. Auto-US is documentation discovery, not implementation planning.
- After auto-US creates or updates the `group -> feature[]` tree, stop for user review. When the user later asks to implement one of those tickets, switch to `task-implementer` so task planning uses a fresh source scan and the approval gate.

If an inferred area is not user-story-shaped, ask before representing it as a top-level `task` work ticket instead of forcing a `group/feature` hierarchy.

## Upsert Behavior

Before creating tickets, list existing Vibe Kanban tickets and avoid duplicates. Prefer updating an existing inferred `group` or `feature` when the title/source evidence clearly matches.

Use the project-local Vibe Kanban command:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs list --json
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type group --title "<feature>" --specification "<markdown>" --source-type codegraph --source-snapshot "<evidence>"
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type feature --parent-id <group-id> --title "<Verb Noun>" --specification "<markdown>" --source-type codegraph --source-snapshot "<evidence>"
```

Return the created or updated hierarchy with ticket IDs and the main code evidence used for each cluster.
