# Flow Programming Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a drag-and-drop "Flows" tab where users visually build Telegram bot *state machines* (states + trigger-labeled transitions) that the bot actually executes, with sample flows the user can load and learn from.

**Architecture:**
- **Editor:** React Flow (`@xyflow/react`) graph editor — nodes = states, edges = transitions. Custom React/MUI node components preserve the app's design language.
- **Domain model:** `src/interfaces/flow.ts` — `Flow` = `{ id, name, startNodeId, nodes, edges }`. Node types: `start` (entry marker) and `state` (has replies). Edges carry a trigger (`equals/contains/startsWith/endsWith/notEquals/notContains/fallback`).
- **Engine:** `src/logic/flow.ts` — pure TS: `matchFlowTrigger`, `executeFlow` (first matching edge in array order wins), `FlowRuntime` (per-user current-state map so conversation state is tracked per Telegram user), `validateFlow`.
- **Runtime integration:** `BrowserBot` rules get an OPTIONAL `userId` second param (non-breaking); `useBot` registers one flow rule per flow backed by a `FlowRuntime`; flows are evaluated after programs, and fall through (return `undefined`) when no transition matches.
- **Storage:** Redux `botSlice` gains `flows` (optional field, backward compatible) persisted to localStorage key `"flows"`, included in export/import/reset.
- **Docs:** README.md, docs/FEATURES.md, docs/ARCHITECTURE.md, in-app DocsPage.

**Tech Stack:** React 19, MUI 7, Redux Toolkit, `@xyflow/react` ^12.11.2 (MIT), CRA 5 (react-scripts), Jest + Testing Library.

---

## Project conventions (READ FIRST — applies to every task)

- **CRA explicit-extension rule:** ALL source imports need explicit `.ts`/`.tsx` extensions (`import { x } from "../logic/flow.ts"`). Test files are exempt. Missing extensions pass jest but fail `npm run build`.
- **Test command:** `CI=true npm test -- --watchAll=false --testPathPattern='<pattern>'`. Full suite: `CI=true npm test -- --watchAll=false`. Build: `npm run build` (CI mode makes eslint warnings fatal).
- **No barrel/re-export files.** Direct imports only. Merge single-line imports from the same module.
- **Git identity is preconfigured locally** (Alfred <alfred@jh123x.com>). Commit messages follow existing style: `feat: ...`, `test: ...`, `fix: ...`, `docs: ...`.
- **Never touch `src/__snapshots__/App.test.tsx.snap`** — the orchestrator regenerates it after the batch. If your tests break it, REPORT the expected failure, do not fix the snapshot.
- **jsdom recipes:** when writing React tests (Worker mock, drag-and-drop DataTransfer mock, MUI interactions, localStorage hydration), read `/home/hermes/.hermes/skills/software-development/test-driven-development/references/jsdom-testing-recipes.md`.
- **Strict TDD:** every behavior gets a failing test first (RED → verify fail → GREEN → verify pass → commit). Do NOT write implementation before the test.
- **Contingency:** if `npm run build` fails on `@xyflow/react` ESM interop under CRA 5 (webpack), report it — the orchestrator will decide whether to pin `reactflow@11` (`import ReactFlow, { Background, Controls } from "reactflow"` + `import "reactflow/dist/style.css"`) or add a babel override.

---

## Task 1: Branch + dependency (orchestrator — already done)

- Branch `feat/flow-programming` created off `feat/drag-drop-programming`.
- Run: `npm install @xyflow/react@^12.11.2`
- Commit: `chore: add @xyflow/react dependency`

## Task 2: Flow domain model

**Files:**
- Create: `src/interfaces/flow.ts`
- (Pure types — no test file needed; compile-time checked by consumers.)

**Exact content to create:**

```ts
import { TriggerType } from "./program.ts";

export type FlowNodeType = "start" | "state";

export interface FlowNodeData {
  label: string;
  // Messages sent to the user when this state is entered. One message per line.
  replies: string[];
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}

// Reuses TriggerType from program.ts (equals/contains/startsWith/endsWith/
// notEquals/notContains) plus "fallback" = matches any message.
export type FlowEdgeTriggerType = TriggerType | "fallback";

export interface FlowEdgeData {
  trigger: { type: FlowEdgeTriggerType; value: string };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  data: FlowEdgeData;
}

export interface Flow {
  id: string;
  name: string;
  startNodeId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
```

**Commit:** `feat: add flow domain model interfaces`

## Task 3: Flow engine — matching + execution

**Files:**
- Create: `src/logic/flow.ts`
- Create: `src/logic/flow.test.ts`

**TDD sequence (write test → verify RED → implement → verify GREEN → commit per behavior):**

1. **`flowEdgeLabel(trigger)`** — human label for edges/UI:
   - `{type:"equals", value:"/start"}` → `message equals "/start"`
   - `{type:"fallback", value:""}` → `any other message`
   - Reuse the label phrasing style from `TRIGGER_LABELS` in `src/logic/program.ts` for the shared types.

2. **`matchFlowTrigger(trigger: {type: FlowEdgeTriggerType; value: string}, message: string): boolean`**
   - For non-fallback types: delegate to `matchTrigger` from `./program.ts` — identical semantics, including raw (untrimmed) whitespace handling.
   - `fallback` → always `true`.

3. **`createFlowNode(type: FlowNodeType, position?: {x,y}): FlowNode`** — fresh `generateId()` (from `./program.ts`), default data `{label: type === "start" ? "Start" : "New State", replies: []}`, default position `{x: 0, y: 0}`.

4. **`createFlow(name = "New Flow"): Flow`** — fresh ids, `startNodeId: ""`, `nodes: []`, `edges: []`.

5. **`executeFlow(flow: Flow, message: string, currentNodeId: string): { replies: string[]; nextNodeId: string } | undefined`**
   - Find node `currentNodeId`; if missing → `undefined`.
   - Iterate `flow.edges` **in array order**; keep only edges whose `source === currentNodeId`; the FIRST whose trigger matches wins.
   - On match: `replies = target node's data.replies` (empty array is fine), `nextNodeId = target`.
   - No match → `undefined` (caller stays in the same state, no reply).
   - Target node missing → skip that edge (defensive) and continue.
   - Tests must pin: edge priority = array order; `fallback` matches last-resort; unmatched message → `undefined`; unknown node → `undefined`.

**Commit(s):** e.g. `feat: add flow edge matching`, `feat: add flow execution engine`

## Task 4: Flow runtime + validation

**Files:**
- Modify: `src/logic/flow.ts`
- Modify: `src/logic/flow.test.ts`

**TDD sequence:**

1. **`class FlowRuntime`**
   - Constructor: `constructor(private flow: Flow) {}`
   - `reset(userId: number): void` — clears that user's stored state.
   - `handleMessage(userId: number, message: string): string | string[] | undefined`
     - Current state = stored state for `userId`, else `flow.startNodeId`.
     - `step = executeFlow(flow, message, current)`; if `step` → store `step.nextNodeId` for the user, return `step.replies` (single string if 1 reply, array if >1, `undefined` if 0).
     - No step → return `undefined`, state unchanged.
   - Tests: brand-new user starts at `startNodeId`; state persists across messages (transition A→B, next message evaluated from B); no-match leaves state unchanged; `reset` returns user to start; multiple users have independent states.

2. **`validateFlow(flow: Flow): string[]`** — returns error strings (empty = valid):
   - `flow.name` empty → `"Flow name is required"`
   - no node with `type === "start"` → `"Flow must have a start node"`
   - more than one start node → `"Flow can only have one start node"`
   - duplicate node ids → `"Duplicate node id: <id>"`
   - edge with unknown `source` or `target` → `"Edge <id> references a missing node"`
   - incoming edge to the start node → `"Start node cannot have incoming edges"`

**Commit(s):** `feat: add per-user flow runtime`, `feat: add flow validation`

## Task 5: Sample flows

**Files:**
- Create: `src/logic/flowSamples.ts`
- Create: `src/logic/flowSamples.test.ts`

Mirror the existing pattern in `src/logic/samples.ts` (`ProgramSample` + module-local builder). Define `FlowSample { name: string; flow: Flow }` and `SAMPLE_FLOWS: FlowSample[]`.

Three samples (each with an **execution-level test** that drives `FlowRuntime` and asserts documented behavior — happy path AND fallback):

1. **Welcome Flow** — start → main. Edge from start: `fallback` → main. Main replies `["Welcome! I'm a browser bot 🤖", "Try /echo <something> or answer the quiz."]`. Test: any message → those replies, user lands on main.
2. **Echo Flow** — start → menu (fallback: replies `["Say /echo <something> to hear it back."]`); menu edge `startsWith "/echo "` → echo state (replies `[]`? No — echo needs the message). Keep V1 simple: echo state replies `["You said: {msg}"]` using the existing `interpolate` helper from `./program.ts` (`interpolate` with `{msg}` = raw message — check its signature in `src/logic/program.ts` before using). Test: `/echo hello` → `You said: hello`; anything else → menu prompt, stays in menu.
3. **Quiz Flow** — start → q1 (replies `["What is 2 + 2?"]`); q1 edge `equals "4"` → correct (replies `["Correct! 🎉"]`); q1 edge `fallback` → wrong (replies `["Nope, try again!"]`); wrong edge `fallback` → q1 (re-asks the question). Test full loop: `"hi"` → question; `"4"` → correct; then a fresh user `"hi"` → question; `"5"` → `Nope, try again!`; `"4"` → correct.

**Commit:** `feat: add sample flows with execution tests`

## Task 6: BrowserBot userId extension (non-breaking)

**Files:**
- Modify: `src/interfaces/bot.ts`
- Modify: `src/interfaces/bot.test.ts`

**TDD sequence:**

1. Extend `BotRule` with OPTIONAL second params (old callers keep compiling):
   ```ts
   export interface BotRule {
     matcher: (message: string, userId?: number) => boolean;
     callback: (message: string, userId?: number) => string | string[] | undefined;
   }
   ```
2. `handleMessage(message: string, userId?: number): string | string[] | undefined` — pass `userId` through to matcher/callback.
3. In `start()`'s `poll_worker.onmessage`: `const response = this.handleMessage(message, chatID);` (chatID already destructured from `e.data`).
4. Tests: existing tests stay green (backward compat); new test asserts a rule whose callback uses `userId` receives the chatID from the poll worker message (use the existing worker mock pattern in `src/interfaces/bot.test.ts`).

**Commit:** `feat: pass user id through bot rules`

## Task 7: Redux + storage + settings

**Files:**
- Modify: `src/redux/types.ts` — add optional `flows?: Flow[]` to `IBotState`
- Modify: `src/redux/botSlice.ts` — `flows: []` in `defaultBotState`; actions `setFlows`, `addFlow`, `updateFlow`, `removeFlow` (mirror the programs actions exactly)
- Modify: `src/redux/botSlice.test.ts` — tests for all four actions
- Modify: `src/App.tsx` — hydrate `flows` from localStorage key `"flows"` next to the existing `programs` hydration
- Modify: `src/component/AppSettings.tsx` + `AppSettings.test.tsx` — export/import/reset must include flows (read the existing settings export/import code first and mirror it; reset must clear flows too)

**TDD:** write/extend tests first for the slice actions, then AppSettings flows export/import/reset behavior (RTL: render AppSettings, click export, assert flows in the exported JSON; import with flows; reset clears them). App.test.tsx snapshot may churn — report only.

**Commit(s):** `feat: store flows in redux`, `feat: hydrate flows from localStorage`, `feat: include flows in settings export/import/reset`

## Task 8: useBot + ChatPage integration

**Files:**
- Modify: `src/hooks/useBot.ts`
- Modify: `src/hooks/useBot.test.tsx`
- Modify: `src/pages/ChatPage.tsx` + `ChatPage.test.tsx` (only if the chat simulator bypasses `bot.handleMessage` — read it first; the preview must share the production execution path)

**TDD sequence:**

1. Select `flows` from the store (`state.bot.flows ?? []`).
2. In the rules-registration effect (the one that calls `bot.clearRules()` then adds program rules): after program rules, add one rule per flow:
   ```ts
   const runtime = new FlowRuntime(flow);
   bot.addRule(
     (message: string, userId?: number) => true,
     (message: string, userId?: number) => runtime.handleMessage(userId ?? 0, message)
   );
   ```
   (Fresh `FlowRuntime` per rebuild — editing a flow resets its users' states, which is expected. Rules run after programs; a flow with no matching transition returns `undefined` and the next rule runs.)
3. Tests (Worker mock from jsdom recipes): programs still respond; a flow responds per-user (`/start`-less design): assert two users get independent state (user 1 transitions, user 2 still at start); no matching transition → no reply.
4. ChatPage: ensure the Test User path reaches the SAME `handleMessage` (or at least the same `executeFlow`/runtime path) — if ChatPage previews programs via a separate call, extend that call the same way; add a test that a flow's reply appears in chat.

**Commit(s):** `feat: run flows in the bot runtime`, `feat: flows respond in chat preview`

## Task 9: Flows UI (React Flow editor)

**Files:**
- Modify: `src/component/Navbar.tsx` — add `"flows"` to `Page` type + `PAGE_TABS` (label `Flows`, value `flows`)
- Modify: `src/App.tsx` — `{page === "flows" && <FlowsPage />}`
- Create: `src/pages/FlowsPage.tsx` — thin page rendering `<FlowEditor />`
- Create: `src/component/FlowEditor.tsx` — main editor
- Create: `src/component/FlowPalette.tsx` — draggable palette (Start, State)
- Create: `src/component/flowNodes.tsx` — custom React Flow node components
- Create: `src/component/FlowInspector.tsx` — node/edge properties panel
- Create: `src/component/FlowSamples.tsx` — sample list (load → addFlow)
- Tests: `FlowsPage.test.tsx`, `FlowEditor.test.tsx`, `FlowPalette.test.tsx`, `flowNodes.test.tsx`, `FlowInspector.test.tsx`, `FlowSamples.test.tsx`

**UI behavior contract (preserve exactly; no extra messages/features):**
- Editor layout: toolbar (flow name input, Save implicit — persist on every change via `updateFlow` dispatch, New Flow button, Delete Flow button, Samples menu), left palette, center `ReactFlow` canvas (`<ReactFlowProvider>`), right/bottom inspector.
- Palette drag: HTML5 dragstart with `dataTransfer.setData("application/reactflow", type)`; canvas wrapper `onDrop`/`onDragOver` (preventDefault) creates a node at the drop position (standard React Flow DnD recipe, see https://reactflow.dev/learn/interaction/drag-and-drop).
- Custom nodes: `StartNode` (target handle absent, source handle right; label only) and `StateNode` (target handle left, source handle right; label + reply count). Use MUI `Box`/`Typography` matching the theme; `Handle` from `@xyflow/react`.
- Edges: on connect → append edge with `data.trigger = { type: "fallback", value: "" }` (label derived via `flowEdgeLabel`). Edge click → inspector shows trigger editor: type `Select` (the 6 TriggerTypes + fallback) + value `TextField` (hidden for fallback).
- Inspector: node selected → edit label (TextField) + replies (multiline TextField, one message per line → `split("\n")`); edge selected → trigger editor. Dispatch `updateFlow` on every change (build the updated `Flow` and dispatch — mirror how ProgramEditor persists programs).
- Samples: list `SAMPLE_FLOWS`; clicking one dispatches `addFlow` (fresh ids — implement `flowFromSample(sample)` like `programFromSample` in samples consumers; check how ProgramSamples does it and mirror).
- Flows list: above/beside canvas — select which flow to edit; New Flow creates and selects; Delete removes (confirm not required — mirror ProgramEditor's delete behavior).

**jsdom testing notes (read the recipes reference first):**
- React Flow renders SVG — component tests focus on what's testable: palette items exist with the `application/reactflow` data; nodes render label/replies; inspector typing dispatches `updateFlow`; samples render and clicking dispatches `addFlow`; FlowEditor renders canvas + palette + toolbar.
- For DnD tests use the DataTransfer mock from the recipes; drag gestures that can't run in jsdom stay covered by the pure functions (`createFlowNode`, `executeFlow`) + a final browser smoke test (Task 11).
- **Do NOT touch `App.test.tsx.snap`** — the new tab changes it; report.

**Commit(s):** incremental — `feat: add Flows page and nav`, `feat: add flow graph editor`, `feat: add flow palette and custom nodes`, `feat: add flow inspector`, `feat: add flow samples loader`

## Task 10: Documentation

**Files:**
- Modify: `README.md` — mention the Flows tab in "What you can do" + Quick start (a sentence: build state-machine flows visually, load samples)
- Modify: `docs/FEATURES.md` — new Flows section: what a flow is (states + transitions), how triggers work (including fallback), per-user conversation state, samples
- Modify: `docs/ARCHITECTURE.md` — flow domain model, engine (`executeFlow`, `FlowRuntime` per-user state), rules integration (optional userId), localStorage `flows` key, React Flow editor
- Modify: `src/pages/DocsPage.tsx` + `DocsPage.test.tsx` — add a "Flows" section (TOC entry + content mirroring FEATURES.md, with sample descriptions)

**Commit:** `docs: document flows feature and architecture`

## Task 11: Integration verification (orchestrator)

1. Full suite: `CI=true npm test -- --watchAll=false` — triage failures; regenerate `App.test.tsx.snap` (`CI=true npm test -- --watchAll=false --testPathPattern=App.test -u`) and review the diff (expect only class-hash churn + new Flows tab DOM).
2. `npm run build` — must pass (lint fatal in CI mode).
3. Browser smoke (use the browser-smoke-test-verification reference): load the dev server, open Flows tab, load a sample, drag a node from palette, connect two nodes, edit a state's reply, verify the flow replies in Chat test mode.
4. Fix any issues with targeted `patch`, commit, push branch.

---

## Review process (per implementer task)

After each implementer subagent completes: dispatch TWO reviewer subagents in parallel (read-only, no git mutations):
1. **Spec compliance** — every requirement of the task present? File paths exact? Behavior matches the contract? No scope creep?
2. **Code quality** — conventions (explicit extensions, no barrels, MUI patterns), test quality (behavioral not snapshot-only, mutation-check one assertion), `CI=true npm test` for its pattern + `npm run build` where relevant, no obvious bugs.

Reviewers must run the verification commands themselves. Orchestrator fixes critical/important findings (or re-dispatches implementer), then re-reviews.
