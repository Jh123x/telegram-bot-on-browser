# Features

This page describes what the website does and how to use each feature.

## Flows

The **Flow** tab is a visual state machine. A flow is a set of **states**
drawn on a canvas and connected by **transitions**. When a user is in a
state, the bot looks at the messages leaving that state, follows the first
one whose trigger matches, and replies with the target state's messages.

### Building a flow

Drag a **Start** node (the entry marker, exactly one per flow) and **State**
nodes from the palette onto the canvas. Connect them by dragging from one
node to the next, then pick a trigger for each connection. Every state has a
label and a list of replies. Select a node or transition to edit it in the
inspector panel.

### Transitions

Each transition has a trigger that decides when it is followed:

- **message equals** a value,
- **message contains** a value,
- **message starts with** a value,
- **message ends with** a value,
- **message does not equal** a value,
- **message does not contain** a value,
- **any other message** (the fallback) — matches anything.

Transitions are checked in order. The first one whose trigger matches wins.
Use an **any other message** fallback at the end to catch everything a state
does not recognize.

### State replies

Each state sends one message per line when it is entered. You can use
`{msg}` in a reply to interpolate the user's raw message.

### Per-user state

Each Telegram user's position in the flow is tracked independently. Two users
can be in different states at the same time, and one user's messages never
affect another's. A user with no stored state starts at the Start node.

### Multiple flows

Each flow runs in order. A flow that has no matching transition stays silent
and the next flow gets a chance at the message.

### Samples

Open the **Flow** tab and click a sample to load it:

- **Welcome Flow** — greets every user and points toward `/echo` and the quiz.
- **Echo Flow** — prompts for a message, then echoes it back with "You said:"
  when the message starts with `/echo ` (including the slash and the space).
- **Quiz Flow** — asks a question, moves to *Correct* for the right answer
  (`4`) or *Wrong* for anything else; only a wrong answer sends the user back
  to the question so they can try again.

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

## Docs

The **Docs** tab explains the concepts in the browser: states, transitions,
triggers, variables, samples, and troubleshooting.
