import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserBot } from "../interfaces/bot.ts";
import { BotWithConfig, Program } from "../redux/types.ts";
import { matchTrigger, executeBlocks } from "../logic/program.ts";
import { addResponse, addUser } from "../redux/botSlice.ts";

export const useBot = () => {
  const dispatch = useDispatch();
  const [bot, setBot] = useState<BrowserBot>();
  const [started, setStarted] = useState(false);
  // Mirrors the live instance so the token effect can stop/replace it without
  // depending on the `bot` state (which would recreate it on every change —
  // an infinite loop). `setBot` still drives the re-render consumers need.
  const botRef = useRef<BrowserBot>();
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);
  const programs = useSelector<BotWithConfig, Program[]>((state) => state.bot.programs);

  useEffect(() => {
    botRef.current?.stop();
    const next = new BrowserBot(token);
    botRef.current = next;
    setBot(next);
    // A new token invalidates any running connection: drop the started flag
    // so the user can restart with the new token.
    setStarted(false);
  }, [token]);

  useEffect(() => {
    if (bot === undefined) return;
    bot.clearRules();
    programs.forEach((program) => {
      bot.addRule(
        (message: string) => matchTrigger(program.trigger, message),
        (message: string) => executeBlocks(program.blocks, message)
      );
    });
  }, [bot, programs]);

  const start = () => {
    if (!bot || started) return;
    bot.start(
      (date: number, user: string, id: number, msg: string) => {
        dispatch(addResponse({ FromUser: user, UserID: id, Message: msg, TimeStamp: date }));
        dispatch(addUser({ UserID: id, Username: user }));
      },
      (date: number, user: string, id: number, reply: string) => {
        dispatch(
          addResponse({ FromUser: "Bot", UserID: id, Message: reply, TimeStamp: date, fromBot: true })
        );
      }
    );
    setStarted(true);
  };

  const stop = () => {
    if (!bot) return;
    bot.stop();
    setStarted(false);
  };

  return { bot, started, start, stop };
};
