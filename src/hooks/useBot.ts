import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserBot } from "../interfaces/bot.ts";
import { BotWithConfig } from "../redux/types.ts";
import { FlowRuntime } from "../logic/flow.ts";
import { Flow } from "../interfaces/flow.ts";
import { addResponse, addUser } from "../redux/botSlice.ts";

// Stable empty array so the flows selector never returns a fresh reference
// (a new [] each render would warn and cause unnecessary rerenders).
const EMPTY_FLOWS: Flow[] = [];

export const useBot = () => {
  const dispatch = useDispatch();
  const [bot, setBot] = useState<BrowserBot>();
  const [started, setStarted] = useState(false);
  // Mirrors the live instance so the token effect can stop/replace it without
  // depending on the `bot` state (which would recreate it on every change —
  // an infinite loop). `setBot` still drives the re-render consumers need.
  const botRef = useRef<BrowserBot>();
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);
  const flows = useSelector<BotWithConfig, Flow[]>(
    (state) => state.bot.flows ?? EMPTY_FLOWS
  );
  const autoStart = useSelector<BotWithConfig, boolean>(
    (state) => state.bot.autoStart ?? false
  );
  const autoStartedRef = useRef(false);

  const hydrated = useSelector<BotWithConfig, boolean>(
    (state) => state.bot.hydrated ?? false
  );
  // Captured exactly once when hydration completes: auto-start only if the
  // setting AND a token existed at load time. Mid-session token entry,
  // toggling the switch, or importing settings never re-evaluate it.
  const autoStartLoadDecision = useRef<boolean | null>(null);
  useEffect(() => {
    if (autoStartLoadDecision.current !== null) return;
    if (!hydrated) return;
    autoStartLoadDecision.current = autoStart && token !== "";
  }, [hydrated, autoStart, token]);

  useEffect(() => {
    botRef.current?.stop();
    const next = new BrowserBot(token);
    botRef.current = next;
    setBot(next);
    // A new token invalidates any running connection: drop the started flag
    // so the user can restart with the new token.
    setStarted(false);
    // Stop the bot created here when this effect is torn down (e.g. on unmount
    // or StrictMode's simulated remount) so its workers never leak.
    return () => {
      botRef.current?.stop();
    };
  }, [token]);

  useEffect(() => {
    if (bot === undefined) return;
    bot.clearRules();
    // One rule per flow, each backed by its own FlowRuntime. A flow with no
    // matching transition returns undefined and the next rule runs. A fresh
    // FlowRuntime per rebuild means editing a flow resets that flow's users'
    // states, which is expected.
    flows.forEach((flow) => {
      const runtime = new FlowRuntime(flow);
      bot.addRule(
        (message: string, userId?: number) => true,
        (message: string, userId?: number) => runtime.handleMessage(userId ?? 0, message)
      );
    });
  }, [bot, flows]);

  // Auto-start the bot once on load when the setting is enabled and a token
  // existed at hydration-completion time. Uses botRef.current (the newest
  // instance, created with the hydrated token) rather than the lagging `bot`
  // state, which trails one render behind during hydration. The ref guard
  // makes it StrictMode-safe (no second poll/send worker pair).
  useEffect(() => {
    if (autoStartLoadDecision.current !== true) return;
    if (autoStartedRef.current) return;
    const current = botRef.current;
    if (!current) return;
    autoStartedRef.current = true;
    current.start(
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
  }, [bot, token, dispatch]);

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
