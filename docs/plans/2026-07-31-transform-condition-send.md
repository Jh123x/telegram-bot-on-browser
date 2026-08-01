# Transform / Condition / Send Flow Nodes

Branch: `feat/transform-condition-send` (off `feat/flow-programming`)

## Goal

Replace the State-node + edge-trigger routing model with three explicit
processing nodes so users build bot logic on the graph:

1. **Transform** — 1 target handle + 1 source handle. Applies a data
   transformation (lowercase / uppercase / trim / replace / extractRegex) to
   the message; the transformed message is what downstream nodes see
   (`{msg}` interpolation and condition matching use the transformed value).
2. **Condition** — 1 target handle + 2 source handles (`if` / `else`, via
   `sourceHandle` on edges). Reuses the existing trigger types
   (equals/contains/startsWith/endsWith/notEquals/notContains). If the
   trigger matches the current message, follow the `if` edge, else the `else`
   edge.
3. **Send** — 1 target handle, **no source handle (terminal)**. Emits the
   node's replies (interpolated with `{msg}`) and ends the walk. Future
   versions may give it outputs.

`state` node type and edge-level triggers are REMOVED. The graph walk is now:
start → (transform)* → (condition)* → send. Any walk that ends without
reaching a send node returns `undefined` (no reply → next rule/flow can try).

## Data model (`src/interfaces/flow.ts`)

```ts
export type FlowNodeType = "start" | "transform" | "condition" | "send";

export type TransformType = "lowercase" | "uppercase" | "trim" | "replace" | "extractRegex";

export interface TransformData {
  type: TransformType;
  find: string;        // replace
  replacement: string; // replace
  pattern: string;     // extractRegex
}

export interface FlowNodeData {
  label: string;
  replies?: string[];                    // send nodes
  transform?: TransformData;             // transform nodes
  trigger?: { type: FlowTriggerType; value: string }; // condition nodes
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: "if" | "else";          // condition outputs only
}
```

- Remove `FlowEdgeData`, `FlowEdgeTriggerType` (edges carry no trigger).
- Keep `FlowTriggerType` (6 matchers), `TRIGGER_TYPES`, `TRIGGER_LABELS`.
- `flowEdgeLabel` now derives from `sourceHandle`: "if" | "else" | undefined.

## Runtime (`src/logic/flow.ts`)

- `applyTransform(transform: TransformData | undefined, message: string): string`
  - lowercase / uppercase / trim: direct string ops.
  - replace: literal replace-all via split/join; empty `find` → message unchanged.
  - extractRegex: first match of `new RegExp(pattern)`; no match or invalid
    pattern → `""`.
- `executeFlow(flow, message): string[] | undefined` — walk from
  `flow.startNodeId` with a visited-set cycle guard:
  - start → follow first outgoing edge (unconditional)
  - transform → apply transform, follow first outgoing edge
  - condition → evaluate trigger on current message; follow edge with
    `sourceHandle === "if"` when true, `"else"` when false
  - send → return `replies.map(r => interpolate(r, { msg: currentMessage }))`
  - no matching/outgoing edge or cycle → `undefined`
- `FlowRuntime` stays as a thin wrapper (keeps `useBot.ts` API):
  - `handleMessage(userId, message)` → calls `executeFlow` from start every
    time (stateless; userId ignored but signature kept for future use).
    `[]` = send reached with empty replies (consumed, silent); `undefined` =
    no send reached (fall through to next rule).
  - `reset()` → no-op.
- `createFlowNode(type, position?)` defaults:
  - start: `{ label: "Start" }`
  - transform: `{ label: "New Transform", transform: { type: "lowercase", find: "", replacement: "", pattern: "" } }`
  - condition: `{ label: "New Condition", trigger: { type: "contains", value: "" } }`
  - send: `{ label: "New Send", replies: [] }`
- `validateFlow` updates:
  - keep: name required, exactly one start, no dup ids, edges reference real
    nodes, startNodeId consistency, start has no incoming edges.
  - NEW: transform/start with >1 outgoing edge → error (ambiguous).
  - NEW: condition with >1 `if` or >1 `else` edge → error.
  - NEW: send with any outgoing edge → error (terminal).
  - REMOVE: fallback-edge rules (edges no longer carry triggers).
- `flowFromSample` deep-copies `transform` / `trigger` / `replies` too.
- `dropNodeDimensionChanges`, `generateId`, `interpolate`, `matchTrigger`
  helpers stay.

## Samples (`src/logic/flowSamples.ts`) — rewrite to 3 samples

1. **Welcome Flow**: start → send("Welcome! I'm a browser bot 🤖", "Try /echo or say hi.")
2. **Uppercase Echo**: start → transform(uppercase) → send("You said: {msg}")  ← proves transform feeds {msg}
3. **Greeting Check**: start → condition(contains "hi") → if: send("Hello! 👋") / else: send("Say hi!")

## UI

- `flowNodes.tsx`: StartNode (source only), TransformNode (target + source,
  shows transform summary like "uppercase"), ConditionNode (target + TWO
  source handles with `id="if"` / `id="else"`, shows trigger summary like
  `contains "hi"`), SendNode (target only, shows reply count). Remove
  StateNode. Testids: `flow-node-transform` / `flow-node-condition` /
  `flow-node-send`.
- `FlowPalette.tsx`: items = Start / Transform / Condition / Send.
- `FlowInspector.tsx`: per-type node panels (transform select + params;
  condition trigger select + value; send replies multiline; start label
  only). Edge panel becomes read-only branch caption ("If branch" /
  "Else branch" / "Connection").
- `FlowEditor.tsx`: nodeTypes map, accept 4 drop types, capture
  `connection.sourceHandle` on connect, rfEdges include sourceHandle + label,
  onEdgesChange fallback preserves sourceHandle.

## TDD order (per subagent)

1. Write failing tests → run (RED) → implement → run (GREEN).
2. Full suite `CI=true npm test -- --watchAll=false`; then `npm run build`.
3. Commit per batch.

## Out of scope

- localStorage migration for old state-node flows (dev branch, no prod users;
  stale flows render as default nodes, acceptable).
- Multi-turn continuation after send (future feature).
