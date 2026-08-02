import React from "react";
import {
  Box,
  Typography,
  Link,
  Stack,
  Chip,
  Divider,
} from "@mui/material";

type DocPageId = "flow" | "chat" | "settings" | "docs";

interface DocsPageProps {
  onNavigate?: (page: DocPageId) => void;
}

const codeStyle = {
  fontFamily:
    '"source-code-pro", Menlo, Monaco, Consolas, "Courier New", monospace',
  backgroundColor: "#0a0a0a",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  padding: "12px",
  overflow: "auto",
  fontSize: 13,
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

export const DocsPage = ({ onNavigate }: DocsPageProps) => (
  <>
    <Typography variant="h3">Docs</Typography>

    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        On this page
      </Typography>
      <Stack component="ol" spacing={0.5} sx={{ mt: 1, pl: 3 }}>
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
              <Link href={item.href} sx={{ color: "primary.main" }}>
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
    </Box>

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

    <Typography variant="h4" id="getting-started" sx={{ mt: 3 }}>
      Getting Started
    </Typography>
    <Box component="ol" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
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
        <Typography component="span">
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
        <Typography component="span">
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
        <Typography component="span">
          Press Start in the header bar. The bot starts polling Telegram.
        </Typography>
      </li>
      <li>
        <Typography component="span">
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

    <Typography variant="h4" id="how-flows-work" sx={{ mt: 3 }}>
      How Flows Work
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A flow is a visual graph. It is a set of nodes drawn on a canvas and
      connected by edges. Every user message starts at the{" "}
      <strong>Start</strong> node, flows through the graph, and ends at a{" "}
      <strong>Send</strong> node whose replies go back to the user.
    </Typography>

    <Typography variant="body1" sx={{ mt: 2 }}>
      Drag nodes from the palette onto the canvas and connect them by dragging
      from one node&apos;s output to the next node&apos;s input:
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          <strong>Start</strong> — the entry marker (exactly one per flow).
        </Typography>
      </li>
      <li>
        <Typography component="span">
          <strong>Transform</strong> — rewrites the message (lowercase,
          uppercase, trim, replace text, extract regex, random number) before
          passing it on.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          <strong>Condition</strong> — checks the message and follows the{" "}
          <strong>if</strong> edge when it matches, the <strong>else</strong>{" "}
          edge otherwise.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          <strong>Send</strong> — replies with one message per line and ends
          the flow (it has no output).
        </Typography>
      </li>
      <li>
        <Typography component="span">
          <strong>Poll</strong> — parses the message as a{" "}
          <code>/poll</code> command and sends a Telegram poll with a question
          and options (it has no output).
        </Typography>
      </li>
    </Box>
    <pre data-testid="code-sample-replies" style={codeStyle}>
      {`send "Welcome"
replies:
  "Welcome! I'm a browser bot."
  "Try /echo or say hi."`}
    </pre>

    <Typography variant="body1" sx={{ mt: 2 }}>
      The runtime is stateless: every message is evaluated from the Start
      node, so a flow answers each message on its own.
    </Typography>

    <Typography variant="h4" id="triggers" sx={{ mt: 3 }}>
      Condition Matchers
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A condition node&apos;s <strong>if</strong> branch is decided by one of:
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          message equals a value,
        </Typography>
      </li>
      <li>
        <Typography component="span">
          message contains a value,
        </Typography>
      </li>
      <li>
        <Typography component="span">
          message starts with a value,
        </Typography>
      </li>
      <li>
        <Typography component="span">
          message ends with a value,
        </Typography>
      </li>
      <li>
        <Typography component="span">
          message does not equal a value,
        </Typography>
      </li>
      <li>
        <Typography component="span">
          message does not contain a value.
        </Typography>
      </li>
    </Box>

    <Typography variant="body1" sx={{ mt: 2 }}>
      The <strong>else</strong> edge catches everything the condition does not
      match. A condition without an else edge stays silent on non-matching
      messages. The equals matcher is case-sensitive and trims whitespace.
    </Typography>

    <Typography variant="h4" id="variables" sx={{ mt: 3 }}>
      Variables
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      {"{msg}"} in a reply inserts the current message — after any transforms,
      so an <strong>uppercase</strong> transform followed by{" "}
      {"{msg}"} echoes the message in caps. Tokens that match no variable stay
      exactly as typed.
    </Typography>
    <pre data-testid="code-sample-msg" style={codeStyle}>
      {`send "Echo"
replies:
  "You said: {msg}"`}
    </pre>

    <Typography variant="h4" id="samples" sx={{ mt: 3 }}>
      Samples
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      Built-in flow samples load with one click in the Flow tab. You can start
      right away:
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          <strong>Dice Bot</strong> rolls a D&amp;D die:{" "}
          <code>/dice d4</code> through <code>/dice d100</code> feed a{" "}
          <strong>Random Number</strong> node (min 1, max = the die&apos;s
          sides) and send the result.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          <strong>Poll Bot</strong> turns{" "}
          <code>/poll &lt;title&gt; option1, option2, option3</code> into a
          Telegram poll.
        </Typography>
      </li>
    </Box>

    <Typography variant="body1" sx={{ mt: 2 }}>
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

    <Typography variant="h4" id="tips" sx={{ mt: 3 }}>
      Tips
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Chain transforms before a condition: the condition sees the
          transformed message, so an <strong>uppercase</strong> transform can
          normalize input before matching.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Use a condition&apos;s <strong>else</strong> edge as the catch-all.
          Without one, non-matching messages stay silent and the next flow
          gets a chance.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          The bot runs only while this tab is open.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Your token never leaves your browser. Calls go straight to Telegram.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Clearing browser data resets your flows and token.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Use Test mode on the Chat tab to preview how the whole bot responds
          before starting it.
        </Typography>
      </li>
    </Box>

    <Typography variant="h4" id="troubleshooting" sx={{ mt: 3 }}>
      Troubleshooting
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Bot not replying? Check the header says &quot;Bot started&quot;. Keep
          the page open. Make sure the message reaches a Send node: a
          condition with no matching branch (and no else edge) stays silent.
          Equals is case-sensitive and trims whitespace.
        </Typography>
      </li>
      <li>
        <Typography component="span">
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
        <Typography component="span">
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
  </>
);
