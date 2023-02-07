import {
  Typography,
  TextField,
  FormGroup,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { Fragment, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addCommands, setCommands } from "../redux/botSlice";

export const BotInterface = () => {
  const dispatch = useDispatch();
  const commands = useSelector((state) => state.bot.commands);
  const [commandName, setCommandName] = useState("");
  const [commandResponse, setCommandResponse] = useState("");

  // Generate a mui form to create a command
  return (
    <Fragment>
      <Typography variant="h3">Commands</Typography>
      <Typography variant="body1">
        When a user sends `Command`, the bot will reply with `Response`.
      </Typography>
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell align="right">Command</TableCell>
              <TableCell align="right">Response</TableCell>
              <TableCell align="right">Delete</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {commands.map((command, index) => (
              <TableRow
                key={command.command}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell align="right">{command.command}</TableCell>
                <TableCell align="right">{command.response}</TableCell>
                <TableCell align="right">
                  <Button
                    variant="contained"
                    onClick={() => {
                      const newCommands = [...commands];
                      newCommands.splice(index, 1);
                      dispatch(setCommands(newCommands));
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <FormGroup>
        <Typography>Command</Typography>
        <TextField
          value={commandName}
          onChange={(e) => setCommandName(e.target.value)}
        />
        <Typography>Response</Typography>
        <TextField
          multiline
          value={commandResponse}
          onChange={(e) => setCommandResponse(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={() => {
            const command = {
              command: commandName,
              response: commandResponse,
            };
            dispatch(addCommands(command));
            setCommandName("");
            setCommandResponse("");
            localStorage.setItem("commands", JSON.stringify(commands));
          }}
        >
          Add
        </Button>
      </FormGroup>
      <br />
    </Fragment>
  );
};
