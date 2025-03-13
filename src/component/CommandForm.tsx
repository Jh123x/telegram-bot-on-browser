import { useDispatch, useSelector } from "react-redux";
import { TextField, FormGroup, Button } from "@mui/material";

import { addCommands } from "../redux/botSlice.ts";
import { Command, BotWithConfig } from "../redux/types";
import React, { useState } from "react";

export const CommandForm = () => {
  const dispatch = useDispatch();
  const commands = useSelector<BotWithConfig, Command[]>((state) => state.bot.commands);

  const [commandName, setCommandName] = useState<string>("");
  const [commandResponse, setCommandResponse] = useState<string>("");

  return (
    <FormGroup>
      <TextField
        value={commandName}
        onChange={(e) => setCommandName(e.target.value)}
        label="Command"
        style={{ padding: "auto" }}
      />
      <br />
      <TextField
        multiline
        value={commandResponse}
        onChange={(e) => setCommandResponse(e.target.value)}
        label="Response"
      />
      <br />
      <Button
        variant="contained"
        onClick={() => {
          const command = { command: commandName, response: commandResponse };
          dispatch(addCommands(command));
          localStorage.setItem("commands", JSON.stringify(commands));
          setCommandName("");
          setCommandResponse("");
        }}
      >
        Add
      </Button>
    </FormGroup>
  );
};
