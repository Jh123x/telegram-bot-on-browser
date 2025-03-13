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
  const [errorMsg, setErrMsg] = useState<string>("")

  return (
    <FormGroup>
      <TextField
        value={commandName}
        onChange={(e) => setCommandName(e.target.value)}
        error={errorMsg !== ""}
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
          for (const c of commands) {
            if (commandName === c.command) {
              setErrMsg("Command exists, it will not be added again")
              return
            }
          }

          const command: Command = { command: commandName, response: commandResponse };
          dispatch(addCommands(command));
          localStorage.setItem("commands", JSON.stringify([...commands, command]));

          // Clear inputs
          setErrMsg("")
          setCommandName("");
          setCommandResponse("");
        }}
      >
        Add
      </Button>
    </FormGroup>
  );
};
