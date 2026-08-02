# Plan: Dice Bot + Poll Bot samples (2026-08-02)

Branch: `feat/dice-poll-bot` (off fresh main).

## Goal

Replace the 3 current samples (Welcome Flow, Uppercase Echo, Greeting Check)
with 2 new ones:

1. **Dice Bot** — `/dice <dice_type>` rolls a D&D die.
   Per user guidance: NO new dice node. Build it from existing nodes only:
   a chain of `startsWith "/dice d4"` / `"/dice d6"` / `"/dice d8"` /
   `"/dice d10"` / `"/dice d12"` / `"/dice d20"` / `"/dice d100"`
   conditions; each `if` branch ends in a `random` node whose reply list is
   the die's numbers ("1".."N"); the final `else` sends a usage message.
   This is a series of if statements checking the command AND the dice
   type, with the random node picking the roll.

2. **Poll Bot** — `/poll <title> option1, option2, option3...` sends a real
   Telegram poll (Bot API `sendPoll`).

## New node (the only missing piece)

- **`poll`** — send-category terminal node. Parses the CURRENT message
  (`/poll <title> option1, option2, option3`) into a structured
  `PollReply { kind: "poll", question, options }` and the runtime sends it
  via `sendPoll` instead of `sendMessage`.
  - `parsePoll(message)`: strip leading `/poll`, split on `,`, first part =
    `"<title> option1"` → split at LAST space → question + first option
    (no space in first part → whole part is question). Options = first
    option + rest. Validation: >= 2 parts, non-empty question, 2..10
    options. Invalid → usage string
    `"Please use /poll <title> option1, option2, option3"`.
  - `pollDisplay(poll)`: `📊 Poll: <question>\n• opt1\n• opt2` — used for
    the local chat log (replySender) and ChatPage simulate bubbles.
  - No new data fields on the node (label only).

## Runtime plumbing

- `FlowRuntime.handleMessage` return type:
  `string | string[] | PollReply | undefined`.
- `BrowserBot.handleMessage` / `BotRule.callback`: same union.
- `BrowserBot.start` onmessage loop: string reply → sendMessage +
  replySender(text); PollReply → postMessage
  `[`${url}/sendPoll`, { question, options }, chatID]` +
  replySender(pollDisplay(reply)).
- `public/send_worker.js`: payload may be a string (text) or an object
  `{ question, options }` (poll body `{ chat_id, question, options }`).
- `ChatPage.simulate()`: flowReplies type `(string | PollReply)[]`; render
  PollReply as a bot bubble with `pollDisplay`.

## Batch split (shared interface change → sequential)

- Batch A (logic + runtime): interfaces/flow.ts, logic/flow.ts,
  logic/flow.test.ts, logic/flowSamples.ts, logic/flowSamples.test.ts,
  interfaces/bot.ts, interfaces/bot.test.ts, public/send_worker.js.
  Runs ONLY `--testPathPattern='logic/'` and bot tests. UI knowingly broken.
- Batch B1 (editor UI): FlowPalette, flowNodes, FlowInspector, FlowEditor,
  AppSettings + their tests (incl. FlowEditor.test sample-name updates).
- Batch B2 (chat/docs): ChatPage + test, useBot.test, DocsPage + test,
  FlowSamples.test, README.md, docs/FEATURES.md, docs/ARCHITECTURE.md.
- Lead: App.test.tsx seed name ("Welcome Flow" → "Dice Bot"), App snapshot
  regen, full suite, build, review, push.

## Verify

- `npx vitest run` (full), `npm run build`.
- Dice Bot: `/dice d20` with mocked Math.random → one of "1".."20";
  `/dice banana` → usage text.
- Poll Bot: `/poll What is your favorite color? red, blue, green` →
  PollReply(question "What is your favorite color?", options
  ["red","blue","green"]); real path posts to /sendPoll.
