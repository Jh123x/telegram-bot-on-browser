# Architecture

This page explains how the website works under the hood.

## High-level design

The website is a single-page app that runs entirely in the browser. There is
no backend. The page talks to the Telegram Bot API directly, using Web
Workers so the UI never blocks.

```mermaid
flowchart LR
  subgraph Browser
    UI[React UI<br/>Flow / Chat / Settings / Docs]
    Store[(Redux Store<br/>token, flows, messages)]
    Logic[Logic Engine<br/>matchFlowTrigger, executeFlow, FlowRuntime]
    Bot[BrowserBot<br/>rules + workers]
    Local[(localStorage<br/>token, flows)]

    UI <--> Store
    UI --> Logic
    Store --> Logic
    Logic --> Bot
    Bot --> UI
    Store <--> Local
  end

  Bot -- "getUpdates / sendMessage" --> API[Telegram Bot API]
  API -- "user messages / delivery" --> Telegram[Telegram users]
```

## Layers

### UI layer (React + Material UI)

The UI is split into four pages:

- **Flow** — the visual state-machine editor built on React Flow.
- **Chat** — the live conversation list and the Test User simulator.
- **Settings** — the bot token, auto-start toggle, and data export/import.
- **Docs** — in-app documentation.

Components are thin. Complex pieces are split into small files: the flow
editor (`FlowEditor.tsx`, `FlowPalette.tsx`, `FlowSamples.tsx`,
`FlowInspector.tsx`, `flowNodes.tsx`) and pure logic (`flow.ts` in the logic
layer).

### State layer (Redux Toolkit)

The store (`botSlice`) holds five things:

- `token` — the Telegram bot token.
- `flows` — the user's flows (optional field, defaults to an empty list).
- `response` — the message history shown in Chat.
- `users` — the users that have messaged the bot.
- `autoStart`, `selectedUserId`, `hydrated` — UI/runtime flags.

The token and flows are persisted to `localStorage`. The rest is in-memory
only.

### Logic layer (pure functions)

The logic engine lives in `src/logic/flow.ts`. It has no React or Redux
dependencies, which makes it easy to test in isolation.

Key functions:

- `matchFlowTrigger` — checks a transition trigger against a message
  (`fallback` matches anything; the other six types delegate to the
  module-private `matchTrigger`).
- `executeFlow` — walks the current state's outgoing transitions in order and
  returns the first match's target replies and node id.
- `FlowRuntime` — tracks each user's position per flow so conversation state
  persists across messages.
- `validateFlow` — structural validation of a flow.
- `flowFromSample` — deep-copies a built-in sample with fresh ids.

### Transport layer (BrowserBot)

`BrowserBot` wraps the Telegram Bot API. It creates two Web Workers:

- **poll worker** — polls `getUpdates` for new messages.
- **send worker** — sends messages with `sendMessage`.

The app registers one rule per flow:

```
rule = (message, userId) => replies
```

When a message arrives, the first rule that produces a result wins. Rules
take an optional `userId` (passed through from the Telegram chat id) so flow
rules can track per-user state. A matching rule that returns `undefined` (for
example, a flow with no matching transition) lets `handleMessage` continue to
the next rule.

## Data model

A **flow** is a visual state machine: a graph of **states** connected by
**transitions** labeled with triggers.

```mermaid
flowchart TD
  F[Flow<br/>id, name, startNodeId] --> FN[FlowNode<br/>id, type: start or state, label, replies]
  F --> FE[FlowEdge<br/>id, source, target, trigger]
```

When a message arrives for a user, the engine starts at that user's current
state (or the start node for a new user), walks that state's outgoing
transitions in order, and follows the first whose trigger matches. The target
state's replies are sent (with `{msg}` interpolated), and the user's position
moves to that state.

## Incoming message flow

```mermaid
sequenceDiagram
  participant U as Telegram User
  participant API as Telegram Bot API
  participant PW as Poll Worker
  participant B as BrowserBot
  participant L as Logic Engine
  participant SW as Send Worker
  participant S as Redux Store
  participant C as Chat Page

  U->>API: sends message
  API-->>PW: new message (getUpdates)
  activate PW
  PW->>B: new message event
  deactivate PW
  activate B
  B->>L: flow rules (FlowRuntime.handleMessage)
  activate L
  L->>L: matchFlowTrigger / executeFlow (state transitions)
  L-->>B: replies
  deactivate L
  B->>SW: sendMessage(reply)
  activate SW
  SW->>API: sendMessage request
  API-->>SW: OK
  deactivate SW
  API-->>U: delivers reply
  B->>S: addResponse / addUser
  activate S
  S-->>B: state updated
  deactivate S
  S-->>C: conversation updates
  deactivate B
```

## Test User simulation flow

The Test User conversation runs the same logic engine but never touches
Telegram. This is how the user previews replies.

```mermaid
sequenceDiagram
  participant U as User (bot owner)
  participant C as Chat Page (Test User)
  participant L as Logic Engine
  participant S as Redux Store

  U->>C: types a message, presses Simulate
  activate C
  C->>L: flow rules (FlowRuntime keyed by Test User)
  activate L
  alt a flow matches
    L-->>C: matched flow + replies
  else no flow matches
    L-->>C: silent note
  end
  deactivate L
  C-->>U: bubbles in the conversation
  deactivate C

  Note over C,S: Nothing is sent to Telegram.<br/>The store is not changed.
```

## Editing and rule rebuilds

The bot keeps running while the user edits flows. Messages that arrive before
the edit is saved are handled by the **old rules**. Once the store rebuilds
the rules, later messages use the **new logic**. A fresh `FlowRuntime` per
rebuild means editing a flow resets that flow's users' positions, which is
expected.

```mermaid
sequenceDiagram
  participant U as Bot Owner
  participant T as Telegram User
  participant E as Flow Editor
  participant S as Redux Store
  participant LS as localStorage
  participant B as BrowserBot

  Note over B: Old rules are active.

  T->>B: sends a message
  activate B
  B->>B: old rules run
  B-->>T: old reply
  deactivate B

  U->>E: edits a flow
  activate E
  E->>S: updateFlow
  activate S
  S->>LS: persist flows
  S->>B: rebuild rules
  activate B
  B-->>S: new rules active
  deactivate B
  S-->>E: flow updated
  deactivate S
  E-->>U: canvas updates
  deactivate E

  T->>B: sends the same message
  activate B
  B->>B: new rules run
  B-->>T: new reply
  deactivate B

  Note over B: New rules are active.
```

## Flows

Flows are visual state machines and the app's programming model. A flow is a
graph of **states** connected by **transitions** labeled with triggers.

### Domain model

The flow types live in `src/interfaces/flow.ts`:

```mermaid
flowchart TD
  F[Flow<br/>id, name, startNodeId] --> FN[FlowNode<br/>id, type: start or state, label, replies]
  F --> FE[FlowEdge<br/>id, source, target, trigger]
```

- **Flow** — `{ id, name, startNodeId, nodes, edges }`. Exactly one `start`
  node; `startNodeId` points at it.
- **FlowNode** — a `start` marker or a `state`. A state carries `data.label`
  and `data.replies` (one message per line).
- **FlowEdge** — a transition from `source` to `target` carrying
  `data.trigger = { type, value }`. The trigger type is `FlowTriggerType`
  (equals, contains, startsWith, endsWith, notEquals, notContains) plus
  `"fallback"` (matches any message).

### Engine

The pure engine lives in `src/logic/flow.ts` (no React or Redux):

- `matchFlowTrigger(trigger, message)` — `fallback` matches anything;
  otherwise it delegates to the module-private `matchTrigger` in the same
  file.
- `executeFlow(flow, message, currentNodeId)` — finds the first edge leaving
  the current node (in **array order**) whose trigger matches and returns the
  target state's replies and id. Returns `undefined` when nothing matches
  (the caller stays in the same state and stays silent).
- `FlowRuntime` — keeps a `Map<userId, nodeId>` per flow so each Telegram
  user's position is tracked independently. `handleMessage` starts a
  brand-new user at `startNodeId`, stores the transition taken, and
  interpolates `{msg}` with the raw message in replies. A matched transition
  into a state with no replies returns `[]` (the message was consumed, so
  other rules must not pick it up).
- `validateFlow(flow)` — checks the name, exactly one start node, no
  duplicate ids, no edges to missing nodes, and no incoming edges to the
  start node.
- `flowFromSample(sample)` — deep-copies a sample's flow with fresh ids for
  the flow, every node, and every edge so loading a sample twice yields two
  independent flows.

### Runtime integration

`BrowserBot` rules take an optional `userId` (the Telegram chat id) so flow
rules can key per-user state. In `useBot`, one rule is registered per flow,
each backed by its own `FlowRuntime`:

```
rule = (message, userId) => runtime.handleMessage(userId ?? 0, message)
```

Because a flow rule's matcher always returns `true`, `BrowserBot.handleMessage`
calls every flow rule in order. A flow with no matching transition returns
`undefined` and `handleMessage` falls through to the next rule. The chat
preview (Test User) drives the same `FlowRuntime` path, so what you see in the
Chat tab matches a live flow.

### Storage

Flows live in the Redux `botSlice` under an optional `flows` field (empty by
default, so existing saved state loads fine). The flows are persisted to
`localStorage` under the `"flows"` key and are included in Settings
export/import/reset alongside the token.

### Editor

The **Flow** tab uses React Flow (`@xyflow/react` v12). The `FlowsPage`
renders `FlowEditor`, which wraps the canvas in a `<ReactFlowProvider>` with a
palette, toolbar, and inspector. Custom MUI node components (`StartNode`,
`StateNode`) preserve the app's design language. Nodes are added by dragging
from the palette (HTML5 drag-and-drop using the `application/reactflow` MIME
type) and dropped onto the canvas at the pointer position. Connecting nodes
creates a `fallback` transition; clicking a transition opens the inspector to
edit its trigger. Loading a sample dispatches `addFlow` with `flowFromSample`
so ids are always fresh.

## Design decisions

- **No backend.** The bot works as long as the page is open. This keeps the
  hosting simple and the token private.
- **Pure logic engine.** All bot rules are pure functions. This makes the
  behavior testable without a browser or Telegram.
- **First match wins.** When several flows could match, the first one in the
  list runs. Order matters.
- **One bot instance.** `useBot` keeps a single `BrowserBot`. A new token
  stops the old instance and creates a fresh one.
