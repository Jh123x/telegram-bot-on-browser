# Architecture

This page explains how the website works under the hood.

## High-level design

The website is a single-page app that runs entirely in the browser. There is
no backend. The page talks to the Telegram Bot API directly, using Web
Workers so the UI never blocks.

```mermaid
flowchart LR
  subgraph Browser
    UI[React UI<br/>Programs / Chat / Settings / Docs]
    Store[(Redux Store<br/>token, programs, messages)]
    Logic[Logic Engine<br/>matchTrigger, executeBlocks]
    Bot[BrowserBot<br/>rules + workers]
    Local[(localStorage<br/>token + programs)]

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

- **Programs** — the block editor (`ProgramCard`), the block reference
  (`ProgramPalette`), and the samples panel.
- **Chat** — the live conversation list and the Test User simulator.
- **Settings** — the bot token.
- **Docs** — in-app documentation.

Components are thin. Complex pieces are split into small files: pipeline
primitives (`pipeline.tsx`), block value inputs (`BlockValueInputs.tsx`), and
pure preview logic (`computeFlowPreview` in the logic layer).

### State layer (Redux Toolkit)

The store (`botSlice`) holds four things:

- `token` — the Telegram bot token.
- `programs` — the user's programs (trigger + blocks).
- `response` — the message history shown in Chat.
- `users` — the users that have messaged the bot.

The token and programs are persisted to `localStorage`. The rest is
in-memory only.

### Logic layer (pure functions)

The logic engine lives in `src/logic/program.ts`. It has no React or Redux
dependencies, which makes it easy to test in isolation.

Key functions:

- `matchTrigger` — checks a trigger against a message.
- `executeBlocks` — runs a program's blocks and returns the replies.
- `executeProgram` — trigger match + block execution.
- `findMatchingProgram` — the first program whose trigger matches.
- `validateProgram` — checks a program for errors.
- `computeFlowPreview` — computes the pipeline preview shown on cards.

### Transport layer (BrowserBot)

`BrowserBot` wraps the Telegram Bot API. It creates two Web Workers:

- **poll worker** — polls `getUpdates` for new messages.
- **send worker** — sends messages with `sendMessage`.

The app registers one rule per program:

```
rule = (message) => replies
```

When a message arrives, the first rule whose trigger matches produces the
replies.

## Data model

A **program** has a name, one trigger, and a list of blocks.

```mermaid
flowchart TD
  P[Program] --> T[Trigger<br/>equals, contains, startsWith, ...]
  P --> B1[Block: Logic<br/>lengthGreater, isNumber, ...]
  P --> B2[Block: Transform<br/>uppercase, remove, reverse, ...]
  P --> B3[Block: Action<br/>reply, random, echo]
```

Blocks run in order. Transforms change the message as it flows. Logic blocks
can stop the flow. Actions produce replies. A transform can save its output
as a variable with `{name}`, usable in later replies. `{prev}` always means
the current message value.

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
  B->>L: findMatchingProgram(message)
  activate L
  L->>L: executeBlocks (transforms, gates, replies)
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
  C->>L: findMatchingProgram(message)
  activate L
  alt a program matches
    L-->>C: matched program + replies
  else no program matches
    L-->>C: silent note
  end
  deactivate L
  C-->>U: bubbles in the conversation
  deactivate C

  Note over C,S: Nothing is sent to Telegram.<br/>The store is not changed.
```

## Program editing flow

The bot keeps running while the user edits. Messages that arrive before the
edit is saved are handled by the **old rules**. Once the store rebuilds the
rules, later messages use the **new logic**.

```mermaid
sequenceDiagram
  participant U as Bot Owner
  participant T as Telegram User
  participant E as Program Editor
  participant S as Redux Store
  participant LS as localStorage
  participant B as BrowserBot

  Note over B: Old rules are active.

  T->>B: sends a message
  activate B
  B->>B: old rules run
  B-->>T: old reply
  deactivate B

  U->>E: edits a block
  activate E
  E->>S: updateProgram
  activate S
  S->>LS: persist programs
  S->>B: rebuild rules
  activate B
  B-->>S: new rules active
  deactivate B
  S-->>E: program updated
  deactivate S
  E-->>U: card updates
  deactivate E

  T->>B: sends the same message
  activate B
  B->>B: new rules run
  B-->>T: new reply
  deactivate B

  Note over B: New rules are active.
```

## Design decisions

- **No backend.** The bot works as long as the page is open. This keeps the
  hosting simple and the token private.
- **Pure logic engine.** All bot rules are pure functions. This makes the
  behavior testable without a browser or Telegram.
- **First match wins.** When several programs could match, the first one in
  the list runs. Order matters.
- **One bot instance.** `useBot` keeps a single `BrowserBot`. A new token
  stops the old instance and creates a fresh one.
