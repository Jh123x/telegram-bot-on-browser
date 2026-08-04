# Plan: Negated conditions, concat/template transforms, sample expansion (2026-08-04)

## Goals

1. **Negated conditions** — every condition node gets a negated variant.
   `notEquals` / `notContains` already exist; add `notStartsWith` and
   `notEndsWith` to complete the set (8 conditions total).
2. **String concat at the front** — new `concatFront` transform: prepends
   `data.text` to the message (`text + message`).
3. **String concat at the back** — new `concatBack` transform: appends
   `data.text` to the message (`message + text`).
4. **Template string manipulation** — new `template` transform (Python
   f-string style): interpolates `{msg}` inside `data.template` and the
   result becomes the flowing message (unknown tokens stay literal).
5. **Remove the `random` SEND node** — the `randomNumber` transform stays
   (Dice Bot already uses it); send nodes are now `send` + `poll`.
6. **More samples** — append 3 samples at Dice/Poll Bot complexity:
   Shout Bot (concatBack + uppercase + negated condition), Quote Bot
   (template), Greeting Bot (concatFront + notStartsWith).
7. **Wider palette** — FlowPalette + FlowSamples width 200 → 260 so the
   left rail matches the taller palette items.

## Node model changes

- `FlowTriggerType` += `notStartsWith`, `notEndsWith` (raw string ops:
  `!message.startsWith(value)`, `!message.endsWith(value)`).
- `TransformNodeType` += `concatFront`, `concatBack`, `template`.
- `SendNodeType` = `"send" | "poll"` (drop `"random"`).
- `FlowNodeData` += `text?: string` (concatFront/concatBack),
  `template?: string` (template transform).
- New totals: 1 start + 9 transforms + 8 conditions + 2 sends = 20 types.

## Semantics

- `concatFront`: `data.text` empty/undefined → message unchanged; else
  `data.text + message`.
- `concatBack`: `data.text` empty/undefined → message unchanged; else
  `message + data.text`.
- `template`: `interpolate(data.template ?? "", { msg: message })` — empty
  template → `""` (matches `interpolate` contract). Uses the existing
  module-level `interpolate`; no-loop-func safe.
- `notStartsWith` / `notEndsWith`: negate the positive predicate, same raw
  string ops as `startsWith` / `endsWith` (NO trimming).

## Labels / descriptions / icons

- `notStartsWith`: "Not Starts With" / "Message does not start with the value."
- `notEndsWith`: "Not Ends With" / "Message does not end with the value."
- `concatFront`: "Concat Front" / "Add text before the message."
- `concatBack`: "Concat Back" / "Add text after the message."
- `template`: "Template" / "Build text from a template with {msg}."
- `TRIGGER_LABELS` += `message does not start with` / `message does not end with`.
- Palette icons: notStartsWith → SouthWest, notEndsWith → NorthEast,
  concatFront → FormatAlignLeft, concatBack → FormatAlignRight,
  template → Code. Remove Casino (random).

## Samples (appended after Poll Bot, indexes 2/3/4 — existing [0]/[1]
## contract tests stay green)

- **Shout Bot** — start → lowercase → gate `startsWith "/shout"` (no else)
  → if → trim → `notEquals ""` → if → uppercase → concatBack "!" →
  send "🎺 {msg}"; the notEquals else → usage send "Usage: /shout <text>".
- **Quote Bot** — start → lowercase → gate `startsWith "/quote"` (no else)
  → if → trim → template "💬 \"{msg}\"" → send "{msg}".
- **Greeting Bot** — start → lowercase → `notStartsWith "/"` → if →
  concatFront "👋 You said: " → send "{msg}" (no else: commands decline).

## Files

- Logic: `interfaces/flow.ts`, `logic/flow.ts`, `logic/flow.test.ts`,
  `logic/flowSamples.ts`, `logic/flowSamples.test.ts`.
- UI: `FlowPalette.tsx`(+test), `flowNodes.tsx`(+test),
  `FlowInspector.tsx`(+test), `FlowEditor.tsx`(+test), `FlowSamples.tsx`,
  `AppSettings.tsx` (FLOW_NODE_TYPES + text/template field validation).
- Docs: `DocsPage.tsx`(+test), `README.md`, `docs/FEATURES.md`,
  `docs/ARCHITECTURE.md`.

## Random-send removal fallout

- `flow.ts`: SEND_TYPES, NODE_LABELS/DESCRIPTIONS, createFlowNode case,
  executeFlow random branch (send handling collapses to
  `return interpolateReplies(...)` after the poll branch).
- `FlowPalette.tsx`: drop Casino + NODE_ICONS.random.
- `flowNodes.tsx`: delete RandomNode + export.
- `FlowEditor.tsx`: drop RandomNode import + nodeTypes.random.
- `FlowInspector.tsx`: drop isRandom branch — send panel is always
  "Send Node" / "Replies (one per line)".
- `AppSettings.tsx`: drop "random" from FLOW_NODE_TYPES.
- Tests: flow.test.ts (ALL types list, nodeCategory, createFlowNode,
  random execution suites), FlowPalette.test.tsx (ALL_SIXTEEN →
  ALL_TWENTY, GROUP_COUNTS, click/icon/filter tests), FlowInspector.test.tsx
  (random fixture + panel tests), FlowEditor.test.tsx (TYPES),
  flowNodes.test.tsx (RandomNode test).
- Docs: FEATURES.md (Random bullet + send replies section), ARCHITECTURE.md
  (data model + engine + validateFlow terminal note).

## Verification

- `npx vitest run src/logic/` then targeted component suites, then full
  `npx vitest run`.
- `npm run build`.
- Regenerate App snapshot LAST (`npx vitest run -u src/App.test.tsx`),
  verify the diff is only expected churn (palette items + width).
- `python3 /home/hermes/.hermes/skills/software-development/telegram-bot-on-browser/scripts/check_mermaid.py docs/ARCHITECTURE.md` if diagrams change.
- Commit in logical groups; push at the end (deploy key id_ed25519_repo3).
