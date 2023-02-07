import { useState, useEffect } from "react";
import { Fragment } from "react";
import { Button, Typography } from "@mui/material";
import { BrowserBot } from "../interfaces/bot";
import { useSelector } from "react-redux";

export const BotOperation = () => {
  const [bot, setBot] = useState(null);
  const [started, setStarted] = useState(false);
  const commands = useSelector((state) => state.bot.commands);
  const token = useSelector((state) => state.bot.token);

  useEffect(() => {
    setBot(new BrowserBot(token));
  }, [token]);

  useEffect(() => {
    if (bot === null) return;
    for (const { command, response } of commands) {
      bot.addCommand(command, () => response);
    }
  }, [bot, commands]);

  return (
    <Fragment>
      <Typography variant="body1">
        Bot is {started ? "started" : "stopped"}
      </Typography>
      <Button
        variant="contained"
        color="success"
        disabled={started}
        onClick={() => {
          bot.start();
          setStarted(true);
        }}
      >
        Start
      </Button>
      <Button
        variant="contained"
        color="error"
        disabled={!started}
        onClick={() => {
          bot.stop();
          setStarted(false);
        }}
      >
        Stop
      </Button>
    </Fragment>
  );
};
