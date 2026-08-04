# Features

This page describes what the website does and how to use each feature.

## Flows

The **Flow** tab is a visual graph. A flow is a set of **nodes** drawn on a
canvas and connected by edges. Every user message starts at the **Start**
node, flows through the graph, and ends at a **Send** node whose replies go
back to the user.

![Flow editor](screenshots/flow-editor.png)

### Building a flow

Pick a category in the palette (Start, Transform, Condition, Send), then drag
the actual node onto the canvas. Connect nodes by dragging from a node's
output handle to the next node's input handle. Select a node or edge to edit
it in the inspector panel.

- **Start** — the entry marker (exactly one per flow). It has a single
  output and no input.
- **Transform** nodes — 1 input, 1 output. Each transform is its own node:
  **lowercase**, **uppercase**, **trim**, **replace text**, **extract
  regex**, **random number**, **concat front** (add text before the message),
  **concat back** (add text after the message), or **template** (build text
  from a template like `You said: {msg}`). The transformed message is what
  downstream nodes see (both `{msg}` interpolation and condition matching).
- **Condition** nodes — 1 input, 2 outputs. Each matcher is its own node
  (see below); the node only asks for the value to match. It follows the
  **if** edge when the message matches, the **else** edge otherwise.
- **Send** — 1 input, no output (terminal). Sends its reply lines and ends
  the flow for this message.
- **Random Number** — 1 input, 1 output (transform). Replaces the message
  with a random whole number between its Min and Max values (inclusive).
- **Poll** — 1 input, no output (terminal). Parses the message as
  `/poll <title> option1, option2, option3` and sends a Telegram poll. The
  node's inspector lets you pick the poll type (regular or quiz), anonymity,
  multiple answers (regular only), the quiz's correct option and explanation,
  and an optional close period (5-600 seconds).

### Condition matchers

A condition node's **if** branch is decided by its node type — one of:

- **message equals** a value,
- **message contains** a value,
- **message starts with** a value,
- **message ends with** a value,
- **message does not equal** a value,
- **message does not contain** a value,
- **message does not start with** a value,
- **message does not end with** a value.

The **else** edge catches everything the condition does not match. A
condition without an else edge stays silent on non-matching messages.

### Send replies

Each send node sends one message per line. You can use `{msg}` in a reply to
interpolate the current message — after any transforms, so an *uppercase*
transform followed by a send that says `You said: {msg}` echoes the message
in caps.

### Stateless evaluation

Every user message is evaluated from the Start node — the runtime keeps no
per-user position (send nodes are terminal, so there is nowhere to "wait").
A flow therefore answers each message on its own.

### Single flow

The app keeps ONE flow. Loading a sample replaces the current flow — flows
are never added, named, or deleted. A flow that never reaches a Send node
stays silent.

### Samples

Open the **Flow** tab and click a sample to load it:

- **Dice Bot** — `/dice d4`, `/dice d6`, `/dice d8`, `/dice d10`,
  `/dice d12`, `/dice d20` or `/dice d100` rolls that D&D die: a chain of
  conditions picks the die, a Random Number node rolls between 1 and the
  die's sides, and a send node formats the result.
- **Poll Bot** — `/poll <title> option1, option2, option3` creates a Telegram
  poll with the given question and options. Use the poll node's inspector to
  configure a quiz, anonymity, multiple answers, the correct option and
  explanation, or a close period.
- **Shout Bot** — `/shout hello` becomes `🎺 HELLO!`: a replace node strips
  the command, an uppercase transform shouts, and a Concat Back node adds
  the exclamation mark. A bare `/shout` shows the usage hint.
- **Quote Bot** — `/quote hello` becomes `💬 "hello"` through a Template
  node. A bare `/quote` shows the usage hint.
- **Greeting Bot** — greets every non-command message with a Concat Front
  prefix (`👋 You said: hello`). A Not Starts With condition ignores
  commands, which start with `/`.

### Persistence

Flows are saved to your browser's localStorage automatically.

## Chat

The **Chat** tab is where the bot talks to users.

### Live chat

Select a user from the **Conversations** list to see their conversation.
Type a message and press **Send** to reply to that user on Telegram.
The bot runs only while this tab is open and the bot is started.

### Test User

**Test User** is a special conversation that is always in the list. It works
like any other user, but nothing is sent to Telegram.

![Test User conversation with simulated replies](screenshots/chat-test-user.png)

Type a message and press **Simulate**. The page shows:

- your message as a user bubble,
- which flow matched, if any,
- the bot's reply as a normal bubble, or a note when the bot would stay
  silent.

This is the fastest way to try your bot before starting it.

## Settings

The **Settings** tab stores your bot token. The token never leaves your
browser. Paste it once, and the bot can start.

- **Auto start bot on load** — starts the bot automatically when the page
  loads (only if a token is present).
- **Poll rate (seconds)** — how often the bot checks Telegram for new
  messages (default 5s). Lower values respond faster but make more API
  requests. The rate is applied when the bot starts — change it while the
  bot is running by stopping and starting it again.
- **Export settings** — downloads your token, flows and preferences as a
  JSON file.
- **Import settings** — restores settings from an exported JSON file.
  Files without a `pollRate` (old exports) fall back to the default.
- **Reset to default** — clears your token, flows and preferences from
  this browser.

## Docs

The **Docs** tab explains the concepts in the browser: nodes, conditions,
transforms, samples, and troubleshooting.
