import { useState, useEffect } from "react";
import { Fragment } from "react";
import { Button, Typography } from "@mui/material";
import { BrowserBot } from "../interfaces/bot.ts";
import { useSelector } from "react-redux";
import React from "react";
import { BotWithConfig, Command } from "../redux/types";

export const BotOperation = () => {
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
    <Fragment>
      <Typography variant="body1">
        Bot {started ? "started" : "stopped"}
      </Typography>
      <Button
        variant="contained"
        color="success"
        disabled={started}
        onClick={() => {
          bot!.start();
          setStarted(true);
          console.log("Bot started!")
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
          console.log("Bot stopped!")
        }}
      >
        Stop
      </Button>
    </Fragment>
  );
};
