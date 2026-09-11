---
name: clarifier
description: Turn a blocking uncertainty into well-formed questions, classify each by who must answer it (BA, designer, tech lead, ops), record them on the Vibe Kanban ticket, then find channel skills (Teams, Slack, Jira, GitHub) and ask the developer before sending.
---

# Clarifier

Use this skill whenever a core workflow (`documenter`, `doc-collector`, `task-implementer`) hits a decision it cannot make alone: competing intents, unclear scope or acceptance, a UX or data-contract choice, an integration or permission unknown, or an operational blocker. The caller hands over the ticket id and the situation; this skill owns everything from reasoning about the question to getting it in front of the right person. The caller does not code, create tickets, or change plans while a question it raised is unresolved.

## 1. Reason before asking

Write the question only after you can state all four of these; if you cannot, investigate first (ticket tree, source snapshot, CodeGraph, memory) instead of asking.

- **Decision**: what exactly must be decided, in one sentence.
- **Why it blocks**: which step of the caller's workflow cannot proceed, and what would be wrong if you guessed.
- **Options**: the two or three concrete answers you can see, with what each implies. Include your recommended default when you have one.
- **Owner**: who can actually answer. This picks the category below.

Do not ask what you can find out yourself, do not bundle unrelated decisions into one question, and do not ask the user to choose between options you have not described.

## 2. Classify by audience and write for that audience

| Category | Audience | They decide | Writing rule |
| --- | --- | --- | --- |
| `requirement` | BA / Product Owner | expected behavior, scope, acceptance criteria, priority, business rules | Product language only. Describe the observable situation and the outcomes to choose between. No file paths, identifiers, method calls, stack traces, SQL, endpoints, or implementation terms. |
| `design` | Designer / UX | flows, layout, states, copy, interaction | Same rule; name screens and states, never components or props. |
| `technical` | Tech Lead / Developers | architecture, data contracts, integrations, migrations, code tradeoffs | Cite the evidence: path, symbol, log line, endpoint, data shape, and the options with their cost. |
| `operations` | DevOps / Admin / PM | environments, access, credential ownership, releases, deadlines | Name systems and owners; never paste secret values. |

One situation often produces two questions for two audiences. Example: a preview greets a recipient who was disabled after scheduling.

- `requirement` (BA): "When a recipient is disabled after the email is scheduled, should the preview still greet them by name, or greet the next enabled recipient?"
- `technical` (tech lead): "`buildGreeting()` in `src/preview/greeting.ts` reads the first enabled recipient at render time; should disabled recipients be filtered in `RecipientRepository.listEnabled()` so every preview shares one rule?"

Never send the technical one to the BA. Each item is a single question ending with `?`, with options inline when they exist ("A, B, or something else?").

## 3. Record on the ticket

One file per category, validated before writing:

```bash
pnpm -s vk questions <ticket-id> --category requirement --questions @requirement.md --dry-run --json
pnpm -s vk questions <ticket-id> --category requirement --questions @requirement.md --description "Blocked pending BA decision on <topic>" --quiet
pnpm -s vk questions <ticket-id> --category technical --questions @technical.md --description "Blocked pending tech lead decision on <topic>" --quiet
```

The command rejects text that breaks the category rule (code evidence in `requirement`/`design`, secrets anywhere) and warns when a `technical` question cites nothing. Fix the wording; do not force it through by changing the category. The ticket moves to `hold`.

## 4. Find channels and ask the developer before sending

Questions reach people through channel skills. Nothing is preconfigured: look at the installed skills and judge from their descriptions which ones can deliver a message to a given audience.

1. List candidates: read `.agents/skills/*/SKILL.md` descriptions (or the skill list your runtime shows) and keep the ones that can post to a human channel, for example a Microsoft Teams, Slack, Jira comment, Linear, email, or GitHub issue skill (`github-source` posts to the source issue). Check `PROJECTS.md` for channel rules such as "requirement questions go to the #product Teams channel".
2. Map category → channel: requirement and design questions go where the BA or designer reads (the product channel, the source ticket); technical questions go to the developer channel or tech lead; operations questions to the ops or admin channel. If the same channel serves several audiences, send separate messages so each audience sees only its own questions.
3. Ask the developer in the current chat, one question per category, before sending anything. Name the skill, the channel, and the audience, and offer the alternatives: "VK-42 has 2 requirement questions for the BA. Send them to the `#product-preview` Teams channel with `teams-notify`, or do you want to answer here?" Options are: send through that skill, answer here now, or hold without sending.
4. Only after the developer confirms, run the channel skill and pass the questions verbatim. Never send without confirmation; never send secrets; never post technical questions to a product audience.
5. Record the outcome so the ticket shows where the question went:

   ```bash
   pnpm -s vk action-log <ticket-id> --action-type plugin:<skill-name> --status triggered --url <message-or-thread-url> --description "Sent 2 requirement questions to #product-preview (BA)" --quiet
   ```

   Use `--status skipped` with the reason when the developer chooses to answer here, and `--status failed` when the skill could not deliver; then fall back to the chat.

When no channel skill fits an audience, say so and ask the developer to answer or forward the questions; keep the ticket on `hold`.

## 5. Close the loop

- When answers arrive (from the developer in chat, or read back through the channel skill), store each with `pnpm -s vk comment <ticket-id> --comment "<who>: <answer>" --actor user --quiet`.
- Clear the answered category: `pnpm -s vk questions <ticket-id> --clear --category <c> --description "Answered by <who>" --quiet`. Clear all when nothing is left.
- Hand control back to the caller with the decisions summarized; the caller moves the ticket out of `hold` and updates the specification or plan. A changed plan invalidates approval, so the caller must ask for review again when that happens.

## What a channel skill looks like

Any skill whose description says it can deliver a message to people is a channel candidate. A good one states the system, the audiences it reaches, and what it needs (`gh`, a Teams webhook, an MCP server), reads the text it should send from the caller, returns a message or thread URL, and can read replies back. `github-source` is the reference; `.agents/templates/plugin-skill/` is the starting point for a Teams or Slack one.
