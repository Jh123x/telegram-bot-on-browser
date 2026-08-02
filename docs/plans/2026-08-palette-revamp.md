# 2026-08 Flow Palette Revamp (feat/palette-revamp)

## Goal

Revamp the Flow section palette. Replace the 2-level category-pill palette with a
flat, always-visible inventory of all node types, grouped by category, with
one-line descriptions, a filter box, per-node icons, and smarter click-to-add
(auto-select the added node). Finish with a theme-token cleanup of the palette's
hardcoded colors.

## Design

- **A — Flat inventory**: all 16 node types visible at once, grouped under
  category headers (START / TRANSFORM / CONDITION / SEND) in a scrollable list.
  Category pills (`palette-category-*`) are removed.
- **B — Descriptions**: each item shows a one-line caption. Labels + descriptions
  live in `logic/flow.ts` as `NODE_LABELS` / `NODE_DESCRIPTIONS`
  (`Record<FlowNodeType, string>` — a new node type fails to compile until both
  are added).
- **D — Filter**: small `TextField` at the top ("Filter nodes…"); case-insensitive
  substring match on label OR description. Empty query shows everything.
- **E — Auto-select**: picking a node from the palette selects it in the canvas,
  so the inspector opens on it immediately. Selection state lifts from
  `EditorCanvas` to `FlowEditor`.
- **C — Icons**: per-node MUI icon (accent-colored), replacing the bare dot.
  Requires `npm install @mui/icons-material`.
- **F — Theme tokens (LAST)**: replace the palette's raw hexes with theme tokens;
  `#1c1c1e`→`background.paper`, `#3a3a3c`→`divider`, `#f2f2f7`→`text.primary`,
  `#8e8e93`→`text.secondary`; `#2c2c2e` (active chip) becomes a constant in
  `theme.ts`.

## Layout

- Palette Paper: `width: 200`, `flex: 1, minHeight: 0`, internal `overflowY: auto`
  for the item list (filter stays pinned at top).
- FlowSamples Paper width bumps 160 → 200 to stay aligned in the left column.
- Left column: `display:flex, flexDirection:column, gap:2, minHeight:0`.

## Testids

Keep: `flow-palette`, `palette-item-<type>`, `palette-dot-<type>` (dot removed in
phase C, replaced by `palette-icon-<type>`). Add: `palette-group-<cat>`,
`palette-desc-<type>`, `palette-filter`. Remove: `palette-category-<cat>`.

## Phases (sequential; each lands as its own commit)

1. Logic: `NODE_LABELS` + `NODE_DESCRIPTIONS` in `logic/flow.ts` + tests;
   refactor `createFlowNode` / `CONDITION_DEFAULT_LABELS` to use them.
2. Palette revamp (A+B+D) + layout (FlowPalette.tsx, FlowPalette.test.tsx,
   FlowEditor.tsx left column, FlowSamples.tsx width).
3. Auto-select on pick (E): lift selection to FlowEditor; FlowEditor.test.tsx.
4. Icons (C): install `@mui/icons-material`; icon map; test updates.
5. Theme tokens (F): theme.ts + FlowPalette token swap.
6. Review subagent → lead fixes → App snapshot regen → full suite + build → push.

## Verification

- Targeted: `npx vitest run src/logic/flow.test.ts`,
  `npx vitest run src/component/FlowPalette.test.tsx`,
  `npx vitest run src/component/FlowEditor.test.tsx`.
- Full suite: `npx vitest run`. Build: `npm run build`.
- App snapshot (`src/__snapshots__/App.test.tsx.snap`) is orchestrator-owned;
  subagents never touch it.
