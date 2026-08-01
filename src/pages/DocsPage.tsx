import React from "react";
import {
  Box,
  Typography,
  Link,
  Stack,
  Chip,
  Divider,
} from "@mui/material";

type DocPageId = "programs" | "chat" | "settings" | "docs";

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
          { label: "How Programs Work", href: "#how-programs-work" },
          { label: "Variables", href: "#variables" },
          { label: "Blocks", href: "#blocks" },
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
        label="Open the Programs tab"
        component="button"
        clickable
        onClick={() => onNavigate?.("programs")}
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
          Build a program in the{" "}
          <Link
            component="button"
            onClick={() => onNavigate?.("programs")}
            sx={tabLinkSx}
          >
            Programs tab
          </Link>{" "}
          and add blocks with the buttons on each program card.
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

    <Typography variant="h4" id="how-programs-work" sx={{ mt: 3 }}>
      How Programs Work
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A program is one trigger plus a list of blocks. When a user sends a
      message, the first program whose trigger matches runs its blocks. Later
      programs are skipped. If no program matches, the bot stays silent. Your
      work is saved to localStorage automatically.
    </Typography>

    <Typography variant="body1" sx={{ mt: 2 }}>
      Think of each program as a small pipeline:
    </Typography>
    <pre data-testid="code-sample-pipeline" style={codeStyle}>
      {`message -> trigger -> logic -> transform -> action -> reply`}
    </pre>

    <Typography variant="h4" id="variables" sx={{ mt: 3 }}>
      Variables
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A transform node can save its output to a variable. You can use the
      variable in any reply, fallback, or random option. {"{prev}"} is the
      message as it flows through the pipeline. A named variable keeps the
      output of one transform. Give a transform the name {"shouted"} and then
      use {"{shouted}"} in a reply. It inserts the transformed text anywhere
      in the message.
    </Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>
      {"{prev}"} always means the current value before the reply. A named
      variable keeps the output of a specific transform. Tokens that match no
      variable stay exactly as typed.
    </Typography>
    <pre data-testid="code-sample-variables" style={codeStyle}>
      {`trigger: message contains "shout"
transform: make uppercase  → save as {shouted}
action: reply "You shouted: {shouted}!"`}
    </pre>

    <Typography variant="h4" id="blocks" sx={{ mt: 3 }}>
      Blocks
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      Blocks fall into four groups:
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Triggers — decide when the program runs. Use message equals, message
          contains, message starts with, or message ends with a value. Negated
          triggers run when the message does not equal or does not contain a
          value.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Logic — gates. Check message length, check message content (equals,
          contains, starts or ends with), check if the message is a number, or
          match a regex. Logic checks the message as it flows,
          after earlier transforms. If the check fails, the program stops. It
          sends the &quot;Else reply&quot; text if that is set. Every check can
          also be negated (for example, message does not contain, message is
          not a number).
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Transform — change the message as it flows. Make uppercase, make
          lowercase, capitalize the first letter, capitalize each word,
          reverse, trim, remove, replace, or concat (prepend/append) text.
          Echo replies return the transformed message.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Action — produce the reply. Reply with text, reply a random choice,
          or echo the message.
        </Typography>
      </li>
    </Box>

    <Typography variant="h4" id="samples" sx={{ mt: 3 }}>
      Samples
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A few samples are built in. You can start right away:
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Welcome — replies to /start.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Coin Flip — random Heads or Tails on /flip.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Help — replies when the message contains &quot;help&quot;.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Echo Clean — removes a leading &quot;/say &quot; and echoes the rest.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Shout — echoes your message in uppercase.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Shout Back — makes your message uppercase, then replies
          &quot;You shouted: &lt;message&gt;!&quot;.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Short Replies — rejects messages over 10 characters on /short.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Only Numbers — rejects non-numbers on /num.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Title Case — capitalizes each word on /title.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Palindrome — reverses the text on /reverse.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Capitalize — capitalizes the first letter on /cap.
        </Typography>
      </li>
    </Box>

    <Typography variant="body1" sx={{ mt: 2 }}>
      The built-in <strong>Welcome</strong> program looks like this as JSON:
    </Typography>
    <pre data-testid="code-sample-welcome" style={codeStyle}>
      {`{
  "name": "Welcome",
  "trigger": {
    "type": "equals",
    "value": "/start"
  },
  "blocks": [
    {
      "type": "action",
      "kind": "reply",
      "text": "Hi! Welcome to the bot."
    }
  ]
}`}
    </pre>

    <Typography variant="body1" sx={{ mt: 2 }}>
      The <strong>Shout</strong> program makes the message uppercase, then
      echoes it:
    </Typography>
    <pre data-testid="code-sample-shout" style={codeStyle}>
      {`{
  "name": "Shout",
  "trigger": {
    "type": "contains",
    "value": "shout"
  },
  "blocks": [
    {
      "type": "transform",
      "kind": "uppercase"
    },
    {
      "type": "action",
      "kind": "echo"
    }
  ]
}`}
    </pre>

    <Typography variant="body1" sx={{ mt: 2 }}>
      For the full list of block types and fields, see the{" "}
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
          Order matters. The first match wins. Use the arrow buttons to
          reorder your programs in the{" "}
          <Link
            component="button"
            onClick={() => onNavigate?.("programs")}
            sx={tabLinkSx}
          >
            Programs tab
          </Link>
          .
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
          Clearing browser data resets your programs and token.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Use Test mode on the Chat tab to preview how
          the whole bot responds before starting it.
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
          the page open. Make sure the trigger matches exactly. Equals is
          case-sensitive and trims whitespace.
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
