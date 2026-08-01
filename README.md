# Browser Telegram Bot

![Npm CI](https://github.com/jh123x/telegram-bot-on-browser/actions/workflows/node.js.yml/badge.svg "NPM CI")
[![Netlify Status](https://api.netlify.com/api/v1/badges/1a82dc34-1aa2-4058-bda6-27d03486aa9f/deploy-status)](https://app.netlify.com/sites/zesty-brigadeiros-e31668/deploys "Deploy Status")

A Telegram bot that runs entirely in your browser. It talks to the
[Telegram Bot API](https://core.telegram.org/bots/api) directly from the page.
No server, no backend, no deployment.

You can visit the live site here: <https://telebot.jh123x.com/>

## What you can do

- Build bot reply logic with a drag-and-drop style block editor.
- Test your bot in a built-in chat before you start it.
- Run the bot from the Chat tab and talk to real Telegram users.

## Quick start

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram.
   Copy the token it gives you.
2. Open the **Settings** tab and paste the token. It is stored only in your
   browser's localStorage.
3. Open the **Programs** tab and build a program, or click a sample to load
   one (Welcome, Coin Flip, Shout, Only Numbers, and more).
4. Open the **Chat** tab and press **Start** in the header. The bot starts
   polling Telegram.
5. Use **Test User** in the Chat tab to preview replies without sending
   anything to Telegram.

## Documentation

- [Features](docs/FEATURES.md) — what the website does and how to use it.
- [Architecture](docs/ARCHITECTURE.md) — how the website works under the hood.

## Tech stack

1. React
2. Redux (Redux Toolkit)
3. Material UI
4. TypeScript

## Project layout

```
src/
  component/   UI building blocks (program cards, chat, editor)
  hooks/       React hooks (bot lifecycle)
  interfaces/  TypeScript types
  logic/       Pure bot logic (triggers, transforms, execution)
  pages/       Page views (Programs, Chat, Settings, Docs)
  redux/       Redux store and slices
docs/          Feature and architecture documentation
```

## To do

- [x] Build a minimal UI
- [x] Send replies from bots
- [x] Receive chats from users
- [x] Send custom chat to users
- [x] Process user-made commands on the website
- [ ] Export a program as an Express Telegram bot application
