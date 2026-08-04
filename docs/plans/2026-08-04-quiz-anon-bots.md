# Plan: Quiz Bot + Anonymous Bot (2026-08-04)

## Goals (user-specified)

Replace the three simple samples (Shout Bot, Quote Bot, Greeting Bot) with:

1. **Quiz Bot** — asks a SINGLE question: `/quiz` → bot asks a question →
   the user answers → bot replies correct/wrong → state resets.
2. **Anonymous Bot** — one-shot command: `/anon @bob your message` → the bot
   forwards "your message" to @bob with NO attribution, and confirms to the
   sender.

New node ideas (user: "send node that can specify a user", target "parsed
from tags"):

1. **`sendTo`** (send category, terminal) — sends to a DIFFERENT user than
   the sender. The target is parsed from the message: the first `@mention`.
2. **`question`** (send category, terminal) — asks a question and WAITS for
   the user's next message; that next message is evaluated against the
   accepted answers (case-insensitive).

## Engine changes (the big one)

`FlowRuntime` becomes STATEFUL (only for `question`): it keeps
`pending: Map<number, QuestionState>` keyed by userId.

- `handleMessage(userId, message)`:
  1. If `pending.has(userId)` → evaluate the message against the stored
     answers; CLEAR the state; return `correctReply` (interpolate `{answer}`
     with the FIRST accepted answer) or `wrongReply` (same `{answer}`). Any
     message while pending is an answer attempt (incl. another `/quiz`).
  2. Else → `executeFlow`; if the walk reaches a `question` node it returns
     `QuestionReply`; the runtime registers `pending` and returns just the
     prompt string (the transport sends it as plain text).
- New return types:
  - `TargetedReply = { kind: "sendTo", to: string /* username, no @ */, text: string }`
  - `QuestionReply = { kind: "question", prompt, answers: string[], correctReply, wrongReply }`
- `executeFlow` returns `(string | PollReply | TargetedReply | QuestionReply)[] | undefined`.
- `sendTo` execution: scan the CURRENT flowing message for the first
  `@(\w+)`; no mention → decline (undefined). `{msg}` in replies =
  the message minus the mention (trimmed); `{to}` = the username (no @).
  Returns `[...interpolatedReplies.map(r => ({ kind: "sendTo", to, text: r })), confirm]`
  where `confirm = interpolate(data.confirm ?? "Sent to @{to}", { msg, to })`.
  Empty interpolated lines are dropped (nothing to forward → confirm only).
- `question` execution: returns `QuestionReply` built from node data
  (defaults: prompt "", answers [], correctReply "✅ Correct!",
  wrongReply "❌ Wrong! The answer is {answer}.").
- `validateFlow`: sendTo/question are send-category (terminal) — covered by
  the existing send rule once SEND_TYPES includes them.
- `flowFromSample`: copy `confirm`, `prompt`, `correctReply`, `wrongReply`
  strings + `answers` as a new array.
- `FlowRuntime.reset()` returns (clears pending) for tests.

## Transport changes (BrowserBot)

- BrowserBot keeps `users: Map<string, number>` (lowercase username → chatID)
  populated from every incoming update before handling.
- `start()` reply loop handles `TargetedReply`: resolve `to` →
  `this.users.get(to.toLowerCase())`; found → post `[url/sendMessage, text,
  targetChatID]` to the send worker + `replySender(date, to, targetChatID,
  text)` so it lands in the TARGET's conversation; NOT found → send
  `"❌ Couldn't find @{to}"` to the SENDER + replySender with sender info.
  The confirm string (plain) goes to the sender as today.
- `BotRule.callback` / `handleMessage` return types += TargetedReply.
- QuestionReply never reaches the transport (FlowRuntime consumes it).

## New data fields (FlowNodeData)

`confirm?: string` (sendTo), `prompt?: string`, `answers?: string[]`,
`correctReply?: string`, `wrongReply?: string` (question).

## Samples (SAMPLE_FLOWS = [Dice Bot, Poll Bot, Quiz Bot, Anonymous Bot])

- **Quiz Bot** — start → lowercase → gate `startsWith "/quiz"` (no else) →
  question node: prompt "Q: What is 2+2?", answers ["4", "four", "4.0"],
  correctReply "✅ Correct! 2+2 is 4.", wrongReply "❌ Not quite. The answer
  is 4.".
- **Anonymous Bot** — start → lowercase → gate `startsWith "/anon"` (no
  else) → replace strip "/anon" → trim → condition `contains "@"` → if →
  sendTo node (replies ["{msg}"], confirm "Sent to @{to}") → else → usage
  send "Usage: /anon @user your message".

## Files

- Logic: interfaces/flow.ts, logic/flow.ts, logic/flow.test.ts,
  flowSamples.ts, flowSamples.test.ts + this plan doc.
- Transport: interfaces/bot.ts, hooks/useBot.test.tsx (return-type fallout),
  pages/ChatPage.tsx (+test — TargetedReply preview note).
- UI: FlowPalette.tsx(+test), flowNodes.tsx(+test), FlowInspector.tsx(+test),
  FlowEditor.tsx(+test), FlowSamples.test.tsx, AppSettings.tsx(+test).
- Docs: DocsPage.tsx(+test), README.md, docs/FEATURES.md, docs/ARCHITECTURE.md
  (stateless claims must be qualified: stateful only for question nodes),
  + skill updates.

## Verification

- `npx vitest run src/logic/` then `src/component/` then full suite.
- `npm run build`.
- Regenerate App snapshot LAST; verify diff is expected churn.
- Mermaid checker if diagrams change.
- Commit in logical groups; push with deploy key id_ed25519_repo3.
