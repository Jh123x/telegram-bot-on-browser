import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserBot } from "../interfaces/bot.ts";
import { BotWithConfig, Program } from "../redux/types.ts";
import { matchTrigger, executeBlocks } from "../logic/program.ts";
import { addResponse, addUser } from "../redux/botSlice.ts";

export const useBot = () => {
  const dispatch = useDispatch();
  const [bot, setBot] = useState<BrowserBot>();
  const [started, setStarted] = useState(false);
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);
  const programs = useSelector<BotWithConfig, Program[]>((state) => state.bot.programs);

  useEffect(() => setBot(new BrowserBot(token)), [token]);

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
