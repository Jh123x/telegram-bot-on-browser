import React from "react";
import { Box, Typography } from "@mui/material";

export const DocsPage = () => (
  <>
    <Typography variant="h3">Docs</Typography>

    <Typography variant="h4" sx={{ mt: 3 }}>
      Getting Started
    </Typography>
    <Box component="ol" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Create a bot with @BotFather on Telegram and copy the token it gives
          you.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Open the Settings tab and paste the token — it is stored only in your
          browser&apos;s localStorage.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Build a program in the Programs tab — drag blocks from the palette
          onto a program card, or click to add them.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Press Start in the header bar — the bot starts polling Telegram.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Open the Chat tab to watch incoming messages and reply to users.
        </Typography>
      </li>
    </Box>

    <Typography variant="h4" sx={{ mt: 3 }}>
      How Programs Work
    </Typography>
    <Typography variant="body1" sx={{ mt: 1 }}>
      A program is one trigger plus a list of blocks. When a user sends a
      message, the first program whose trigger matches runs its blocks in
      order. If no program matches, the bot stays silent. Every detail you type
      is saved to localStorage automatically.
    </Typography>

    <Typography variant="h4" sx={{ mt: 3 }}>
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

    <Typography variant="h4" sx={{ mt: 3 }}>
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

    <Typography variant="h4" sx={{ mt: 3 }}>
      Tips
    </Typography>
    <Box component="ul" sx={{ mt: 1, pl: 3 }}>
      <li>
        <Typography component="span">
          Order matters — the first matching program wins. Use the up and down
          arrows to reorder your programs.
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

    <Typography variant="h4" sx={{ mt: 3 }}>
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
          Messages not appearing? Check the bot has received them.
        </Typography>
      </li>
      <li>
        <Typography component="span">
          Token rejected? Recreate it with @BotFather.
        </Typography>
      </li>
    </Box>
  </>
);
