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
          on Telegram and copy the token it gives you.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Open the{" "}
          <Link
            component="button"
            onClick={() => onNavigate?.("settings")}
            sx={{
              color: "primary.main",
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Settings tab
          </Link>{" "}
          and paste the token — it is stored only in your browser&apos;s
          localStorage.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Build a program in the{" "}
          <Link
            component="button"
            onClick={() => onNavigate?.("programs")}
            sx={{
              color: "primary.main",
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Programs tab
          </Link>{" "}
          — drag blocks from the palette onto a program card, or click to add
          them.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Press Start in the header bar — the bot starts polling Telegram.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Open the{" "}
          <Link
            component="button"
            onClick={() => onNavigate?.("chat")}
            sx={{
              color: "primary.main",
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Chat tab
          </Link>{" "}
          to watch incoming messages and reply to users.
        </Typography>
      </li>
    </Box>

    <Typography variant="h4" id="how-programs-work" sx={{ mt: 3 }}>
      How Programs Work
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A program is one trigger plus a list of blocks. When a user sends a
      message, the first program whose trigger matches runs its blocks in
      order. If no program matches, the bot stays silent. Every detail you type
      is saved to localStorage automatically.
    </Typography>

    <Typography variant="body1" sx={{ mt: 2 }}>
      You can think of each program as a small pipeline:
    </Typography>
    <pre data-testid="code-sample-pipeline" style={codeStyle}>
      {`message -> trigger -> logic -> transform -> action -> reply`}
    </pre>

    <Typography variant="h4" id="variables" sx={{ mt: 3 }}>
      Variables
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      Every transform node can save its output to a variable. In any reply,
      fallback, or random option you can reference the value with{" "}
      {"{prev}"} — the message as it flows through the pipeline — or with the
      name you gave the transform. Give a transform a variable name like{" "}
      {"shouted"} and then use {"{shouted}"} inside a reply to insert the
      transformed text anywhere in the message.
    </Typography>
    <Typography variant="body1" sx={{ mt: 2 }}>
      {"{prev}"} always refers to the current flowing value before the reply,
      while a named variable remembers the output of a specific transform node.
      Tokens that do not match a variable are left exactly as typed.
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
      Blocks fall into four categories:
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Triggers — decide when the program runs: message equals, message
          contains, message starts with, or message ends with a value.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Logic — message length is greater than, less than, or matches a
          regex. These act as gates: if the condition fails, the program stops
          and sends the &quot;Else reply&quot; text if it is set.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Transform — make uppercase, make lowercase, trim, or replace. They
          change the message as it flows through, and echo replies with the
          transformed message.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Action — reply with text, reply a random choice, or echo the message.
          These produce the actual replies.
        </Typography>
      </li>
    </Box>

    <Typography variant="h4" id="samples" sx={{ mt: 3 }}>
      Samples
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A few sample programs are built in so you can get started right away:
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
          Help — replies whenever the message contains &quot;help&quot;.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Echo Clean — strips a leading &quot;say &quot; and echoes the rest.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Shout — echoes your message in uppercase.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Short Replies — rejects messages longer than 10 characters when you
          send /short.
        </Typography>
      </li>
    </Box>

    <Typography variant="body1" sx={{ mt: 2 }}>
      Here is what the built-in <strong>Welcome</strong> program looks like as
      JSON:
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
      And the <strong>Shout</strong> program transforms the message to
      uppercase before echoing it:
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
      For the full list of block types, triggers, and fields, see the{" "}
      <Link
        href="https://core.telegram.org/bots/api"
        target="_blank"
        rel="noreferrer"
      >
        Telegram Bot API docs
      </Link>
      . If you run into issues or want to suggest a feature, open an issue on
      the{" "}
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
          Order matters — the first matching program wins. Use the up and down
          arrows to reorder your programs in the{" "}
          <Link
            component="button"
            onClick={() => onNavigate?.("programs")}
            sx={{
              color: "primary.main",
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Programs tab
          </Link>
          .
        </Typography>
      </li>
      <li>
        <Typography component="span">
          The bot only runs while this tab is open.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Your token never leaves your browser — API calls go directly to
          Telegram.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Clearing browser data resets your programs and token.
        </Typography>
      </li>
    </Box>

    <Typography variant="h4" id="troubleshooting" sx={{ mt: 3 }}>
      Troubleshooting
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Bot not replying? Check the header says &quot;Bot started&quot;, the
          page is open, and the trigger matches exactly — equals is
          case-sensitive and trims whitespace.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Messages not appearing? Check the bot has received them in the{" "}
          <Link
            component="button"
            onClick={() => onNavigate?.("chat")}
            sx={{
              color: "primary.main",
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
            }}
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
