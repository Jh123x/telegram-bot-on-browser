import React from "react";
import {
  Box,
  Typography,
  Link,
  Stack,
  Chip,
  Paper,
  Divider,
} from "@mui/material";

type DocPageId = "flow" | "chat" | "settings" | "docs";

interface DocsPageProps {
  onNavigate?: (page: DocPageId) => void;
}

const codeStyle = {
  fontFamily:
    '"source-code-pro", Menlo, Monaco, Consolas, "Courier New", monospace',
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
  padding: "12px",
  overflow: "auto",
  fontSize: 13,
  lineHeight: 1.5,
  color: "text.primary",
} as const;

// Shared styling for in-page links that act as buttons (e.g. "Open the
// Settings tab"), kept identical across every tab-link site.
const tabLinkSx = {
  color: "primary.main",
  background: "none",
  border: "none",
  padding: 0,
  fontSize: "inherit",
  cursor: "pointer",
  textDecoration: "underline",
};

// Section card: subtle raised Paper with a hairline divider border and a
// violet accent rail on the heading for a Stripe-minimal dark look.
const sectionSx = {
  elevation: 0,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  p: 2.5,
  bgcolor: "background.paper",
} as const;

const accentHeadingSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
  mb: 1.5,
};

const accentRailSx = {
  width: 3,
  alignSelf: "stretch",
  borderRadius: 1,
  bgcolor: "primary.main",
  flexShrink: 0,
};

const codeCardSx = {
  mt: 1.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  overflow: "hidden",
  bgcolor: "rgba(0, 0, 0, 0.25)",
} as const;

const sampleListSx = {
  mt: 1,
  pl: 3,
  "& li": {
    mb: 1,
  },
};

export const DocsPage = ({ onNavigate }: DocsPageProps) => (
  <>
    <Typography variant="h3">Docs</Typography>

    {/* Table of contents card */}
    <Paper
      data-testid="docs-toc"
      variant="outlined"
      sx={{ mt: 2, mb: 1, p: 2, borderRadius: 2, bgcolor: "background.paper" }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        On this page
      </Typography>
      <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
        {[
          { label: "Getting Started", href: "#getting-started" },
          { label: "How Flows Work", href: "#how-flows-work" },
          { label: "Condition Matchers", href: "#triggers" },
          { label: "Variables", href: "#variables" },
          { label: "Samples", href: "#samples" },
          { label: "Tips", href: "#tips" },
          { label: "Troubleshooting", href: "#troubleshooting" },
        ].map((item) => (
          <li key={item.href}>
            <Typography component="span">
              <Link
                href={item.href}
                sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
              >
                <Typography
                  component="span"
                  aria-label={`On this page: ${item.label}`}
                  sx={{ fontSize: 14 }}
                >
                  {item.label}
                </Typography>
              </Link>
            </Typography>
          </li>
        ))}
      </Stack>
    </Paper>

    <Divider sx={{ my: 3 }} />

    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
      Jump to a tab
    </Typography>
    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
      <Chip
        label="Open the Settings tab"
        component="button"
        clickable
        onClick={() => onNavigate?.("settings")}
        sx={{ color: "primary.main" }}
      />
      <Chip
        label="Open the Flow tab"
        component="button"
        clickable
        onClick={() => onNavigate?.("flow")}
        sx={{ color: "primary.main" }}
      />
      <Chip
        label="Open the Chat tab"
        component="button"
        clickable
        onClick={() => onNavigate?.("chat")}
        sx={{ color: "primary.main" }}
      />
    </Stack>

    <Divider sx={{ my: 3 }} />

    {/* Getting Started */}
    <Paper data-testid="docs-section-getting-started" sx={sectionSx}>
      <Box sx={accentHeadingSx}>
        <Box sx={accentRailSx} />
        <Typography variant="h4" id="getting-started">
          Getting Started
        </Typography>
      </Box>
      <Box component="ol" sx={sampleListSx}>
        <li>
          <Typography component="span" variant="body2">
            Create a bot with{" "}
            <Link
              href="https://t.me/BotFather"
              target="_blank"
              rel="noreferrer"
            >
              @BotFather
            </Link>{" "}
            on Telegram. Copy the token it gives you.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Open the{" "}
            <Link
              component="button"
              onClick={() => onNavigate?.("settings")}
              sx={tabLinkSx}
            >
              Settings tab
            </Link>{" "}
            and paste the token. It is stored only in your browser&apos;s
            localStorage.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Open the{" "}
            <Link
              component="button"
              onClick={() => onNavigate?.("flow")}
              sx={tabLinkSx}
            >
              Flow tab
            </Link>{" "}
            and build a flow: drag Start, Transform, Condition and Send nodes
            from the palette onto the canvas and connect them. The Dice Bot
            sample loads on first visit.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Press Start in the header bar. The bot starts polling Telegram.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Open the{" "}
            <Link
              component="button"
              onClick={() => onNavigate?.("chat")}
              sx={tabLinkSx}
            >
              Chat tab
            </Link>{" "}
            to watch incoming messages. Reply to users from there.
          </Typography>
        </li>
      </Box>
    </Paper>

    {/* How Flows Work */}
    <Paper data-testid="docs-section-how-flows-work" sx={{ ...sectionSx, mt: 2.5 }}>
      <Box sx={accentHeadingSx}>
        <Box sx={accentRailSx} />
        <Typography variant="h4" id="how-flows-work">
          How Flows Work
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ maxWidth: "65ch" }}>
        A flow is a visual graph. It is a set of nodes drawn on a canvas and
        connected by edges. Every user message starts at the{" "}
        <strong>Start</strong> node, flows through the graph, and ends at a{" "}
        <strong>Send</strong> node whose replies go back to the user.
      </Typography>

      <Typography variant="body2" sx={{ mt: 2, maxWidth: "65ch" }}>
        Drag nodes from the palette onto the canvas and connect them by dragging
        from one node&apos;s output to the next node&apos;s input:
      </Typography>
      <Box component="ul" sx={sampleListSx}>
        <li>
          <Typography component="span" variant="body2">
            <strong>Start</strong> — the entry marker (exactly one per flow).
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Transform</strong> — rewrites the message (lowercase,
            uppercase, trim, replace text, extract regex, random number, add
            text before or after, template) before passing it on.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Condition</strong> — checks the message and follows the{" "}
            <strong>if</strong> edge when it matches, the <strong>else</strong>{" "}
            edge otherwise.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Send</strong> — replies with one message per line and ends
            the flow (it has no output).
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Poll</strong> — parses the message as a{" "}
            <code>/poll</code> command and sends a Telegram poll with a question
            and options (it has no output).
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Send To User</strong> — sends a message to a{" "}
            <em>different</em> user: the first <code>@mention</code> in the
            message is the target. The sender stays anonymous to the target.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Question</strong> — asks a question and waits: the user&apos;s
            next message is checked against the accepted answers
            (case-insensitive) before the flow runs again.
          </Typography>
        </li>
      </Box>

      <Box data-testid="code-sample-header-replies" sx={codeCardSx}>
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "text.secondary",
          }}
        >
          Example
        </Box>
        <pre data-testid="code-sample-replies" style={codeStyle}>
          {`send "Welcome"
replies:
  "Welcome! I'm a browser bot."
  "Try /echo or say hi."`}
        </pre>
      </Box>

      <Typography variant="body2" sx={{ mt: 2, maxWidth: "65ch" }}>
        Most flows are stateless: every message is evaluated from the Start
        node. The only exception is the <strong>Question</strong> node, which
        remembers the pending question per user until it is answered.
      </Typography>
    </Paper>

    {/* Condition Matchers */}
    <Paper data-testid="docs-section-triggers" sx={{ ...sectionSx, mt: 2.5 }}>
      <Box sx={accentHeadingSx}>
        <Box sx={accentRailSx} />
        <Typography variant="h4" id="triggers">
          Condition Matchers
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ maxWidth: "65ch" }}>
        A condition node&apos;s <strong>if</strong> branch is decided by one of:
      </Typography>
      <Box
        component="ul"
        sx={{
          mt: 1,
          pl: 2.5,
          pr: 2.5,
          display: { xs: "block", md: "grid" },
          gridTemplateColumns: { md: "1fr 1fr" },
          columnGap: 3,
          rowGap: 0.5,
        }}
      >
        <li>
          <Typography component="span" variant="body2">
            message equals a value,
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            message contains a value,
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            message starts with a value,
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            message ends with a value,
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            message does not equal a value,
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            message does not contain a value,
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            message does not start with a value,
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            message does not end with a value.
          </Typography>
        </li>
      </Box>

      <Typography variant="body2" sx={{ mt: 2, maxWidth: "65ch" }}>
        The <strong>else</strong> edge catches everything the condition does not
        match. A condition without an else edge stays silent on non-matching
        messages. The equals matcher is case-sensitive and trims whitespace.
      </Typography>
    </Paper>

    {/* Variables */}
    <Paper data-testid="docs-section-variables" sx={{ ...sectionSx, mt: 2.5 }}>
      <Box sx={accentHeadingSx}>
        <Box sx={accentRailSx} />
        <Typography variant="h4" id="variables">
          Variables
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ maxWidth: "65ch" }}>
        {"{msg}"} in a reply inserts the current message — after any transforms,
        so an <strong>uppercase</strong> transform followed by{" "}
        {"{msg}"} echoes the message in caps. Tokens that match no variable stay
        exactly as typed.
      </Typography>

      <Box data-testid="code-sample-header-msg" sx={codeCardSx}>
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "text.secondary",
          }}
        >
          Example
        </Box>
        <pre data-testid="code-sample-msg" style={codeStyle}>
          {`send "Echo"
replies:
  "You said: {msg}"`}
        </pre>
      </Box>
    </Paper>

    {/* Samples */}
    <Paper data-testid="docs-section-samples" sx={{ ...sectionSx, mt: 2.5 }}>
      <Box sx={accentHeadingSx}>
        <Box sx={accentRailSx} />
        <Typography variant="h4" id="samples">
          Samples
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ maxWidth: "65ch" }}>
        Built-in flow samples load with one click in the Flow tab. You can start
        right away:
      </Typography>
      <Box component="ul" sx={sampleListSx}>
        <li>
          <Typography component="span" variant="body2">
            <strong>Dice Bot</strong> rolls a D&amp;D die:{" "}
            <code>/dice d4</code> through <code>/dice d100</code> feed a{" "}
            <strong>Random Number</strong> node (min 1, max = the die&apos;s
            sides) and send the result.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Poll Bot</strong> turns{" "}
            <code>/poll &lt;title&gt; option1, option2, option3</code> into a
            Telegram poll. Configure the poll node to send a quiz, a public poll,
            allow multiple answers, set the correct option and explanation, or
            close it after a number of seconds.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Quiz Bot</strong> asks a single question:{" "}
            <code>/quiz</code> shows a <strong>Question</strong> node prompt,
            and the next message is checked against the accepted answers.
            Correct answers get a green check; wrong answers show the right
            answer. The state resets after each attempt.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            <strong>Anonymous Bot</strong> forwards messages without revealing
            the sender: <code>/anon @bob your message</code> sends "your
            message" to <code>@bob</code> with a <strong>Send To User</strong>{" "}
            node and confirms to the sender. The target user must have messaged
            the bot before.
          </Typography>
        </li>
      </Box>

      <Typography variant="body2" sx={{ mt: 2, maxWidth: "65ch" }}>
        For the full list of flow behavior and fields, see the{" "}
        <Link
          href="https://core.telegram.org/bots/api"
          target="_blank"
          rel="noreferrer"
        >
          Telegram Bot API docs
        </Link>
        . Found a bug or want a feature? Open an issue on the{" "}
        <Link
          href="https://github.com/Jh123x/telegram-bot-on-browser"
          target="_blank"
          rel="noreferrer"
        >
          GitHub repository
        </Link>{" "}
        or try the{" "}
        <Link
          href="https://telebot.jh123x.com"
          target="_blank"
          rel="noreferrer"
        >
          Live site
        </Link>
        .
      </Typography>
    </Paper>

    {/* Tips */}
    <Paper data-testid="docs-section-tips" sx={{ ...sectionSx, mt: 2.5 }}>
      <Box sx={accentHeadingSx}>
        <Box sx={accentRailSx} />
        <Typography variant="h4" id="tips">
          Tips
        </Typography>
      </Box>
      <Box component="ul" sx={sampleListSx}>
        <li>
          <Typography component="span" variant="body2">
            Chain transforms before a condition: the condition sees the
            transformed message, so an <strong>uppercase</strong> transform can
            normalize input before matching.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Use a condition&apos;s <strong>else</strong> edge as the catch-all.
            Without one, non-matching messages stay silent and the next flow
            gets a chance.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            The bot runs only while this tab is open.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Your token never leaves your browser. Calls go straight to Telegram.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Clearing browser data resets your flows and token.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Use Test mode on the Chat tab to preview how the whole bot responds
            before starting it.
          </Typography>
        </li>
      </Box>
    </Paper>

    {/* Troubleshooting */}
    <Paper data-testid="docs-section-troubleshooting" sx={{ ...sectionSx, mt: 2.5, mb: 2 }}>
      <Box sx={accentHeadingSx}>
        <Box sx={accentRailSx} />
        <Typography variant="h4" id="troubleshooting">
          Troubleshooting
        </Typography>
      </Box>
      <Box component="ul" sx={sampleListSx}>
        <li>
          <Typography component="span" variant="body2">
            Bot not replying? Check the header says &quot;Bot started&quot;. Keep
            the page open. Make sure the message reaches a Send node: a
            condition with no matching branch (and no else edge) stays silent.
            Equals is case-sensitive and trims whitespace.
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Messages not appearing? Check the bot got them in the{" "}
            <Link
              component="button"
              onClick={() => onNavigate?.("chat")}
              sx={tabLinkSx}
            >
              Chat tab
            </Link>
            .
          </Typography>
        </li>
        <li>
          <Typography component="span" variant="body2">
            Token rejected? Recreate it with{" "}
            <Link
              href="https://t.me/BotFather"
              target="_blank"
              rel="noreferrer"
            >
              @BotFather
            </Link>
            .
          </Typography>
        </li>
      </Box>
    </Paper>
  </>
);
