# DESIGN.md Format

Use this reference when creating or substantially refreshing `DESIGN.md`.

## Frontmatter

Begin the file with YAML frontmatter. Keep values machine-readable because UI generation and preview tooling may consume these tokens.

Recommended top-level fields:

- `version`: short stability label such as `alpha`, `beta`, or a project-specific version.
- `name`: human-readable name for the design language.
- `description`: one concise paragraph summarizing the visual system.
- `colors`: semantic color tokens, not only raw palette names.
- `typography`: named type roles with `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, and `letterSpacing` when known.
- `rounded`: radius scale.
- `spacing`: spacing scale.
- `components`: reusable component or surface tokens that reference the primitive token maps where possible.

Use token references like `{colors.primary}` or `{typography.body-sm}` when a component value should track a primitive token.

## Markdown Body

After the closing frontmatter delimiter, explain how the tokens should be used. Keep the prose practical enough for an implementation agent to make UI decisions.

Useful sections:

- `Overview`: the core visual character and evidence base.
- `Key Characteristics`: the short list of traits future UI should preserve.
- `Colors`: role, usage, and constraints for each important color.
- `Typography`: font stack, hierarchy, and type principles.
- `Layout`: spacing, grid/container behavior, responsive strategy, and image/media behavior.
- `Elevation & Depth`: borders, shadows, layering, and when to use each level.
- `Shapes`: radius scale, geometry, and repeated silhouette choices.
- `Components`: each named component token, its intended use, default styling, and known states.
- `Do's and Don'ts`: high-signal rules that prevent likely visual drift.

## Evidence Rules

Tie claims to observed sources without turning `DESIGN.md` into a source audit. A short sentence such as "Source files analyzed: ..." is enough unless the user asks for detailed traceability.

When source values disagree, document the dominant pattern and call out the exception. Do not silently normalize meaningful conflicts.

When a value is approximated from screenshots or assets, say so near the relevant section.
