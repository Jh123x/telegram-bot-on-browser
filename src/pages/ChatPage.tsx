import React from "react";
import { BrowserBot } from "../interfaces/bot.ts";
import { CustomChat } from "../component/CustomMessage.tsx";
import { LogBox } from "../component/logs.tsx";

export const ChatPage = ({ bot }: { bot?: BrowserBot }) => (
  <>
    <CustomChat bot={bot} />
    <LogBox />
  </>
);
