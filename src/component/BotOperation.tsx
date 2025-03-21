import { useState, useEffect } from "react";
import { Button, Typography } from "@mui/material";
import { BrowserBot } from "../interfaces/bot.ts";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { BotWithConfig, Command } from "../redux/types";
import { addResponse, addUser } from "../redux/botSlice.ts";
import { CustomChat } from "./CustomMessage.tsx";

export const BotOperation = () => {
  const dispatch = useDispatch()
  const [bot, setBot] = useState<BrowserBot>();
  const [started, setStarted] = useState(false);
  const commands = useSelector<BotWithConfig, Command[]>((state) => state.bot.commands);
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);

  useEffect(() => setBot(new BrowserBot(token)), [token]);

  useEffect(() => {
    if (bot === undefined) return;
    commands.forEach(({ command, response }) => bot!.addCommand(command, () => response))
  }, [bot, commands]);

  return (
    <>
      <CustomChat bot={bot} />
      <hr />
      <Typography variant="body1">
        Bot {started ? "started" : "stopped"}
      </Typography>
      <Button
        variant="contained"
        color="success"
        disabled={started}
        onClick={() => {
          bot!.start((date, user, id, msg) => {
            dispatch(addResponse({
              FromUser: user,
              UserID: id,
              Message: msg,
              TimeStamp: date,
            }))
            dispatch(addUser({ UserID: id, Username: user }))
          });
          setStarted(true);
          console.debug("Bot started!")
        }}
      >
        Start
      </Button>
      <Button
        variant="contained"
        color="error"
        disabled={!started}
        onClick={() => {
          bot!.stop();
          setStarted(false);
          console.debug("Bot stopped!")
        }}
      >
        Stop
      </Button>
    </>
  );
};
