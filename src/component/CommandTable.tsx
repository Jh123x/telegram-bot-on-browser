import {
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  Box,
  TableCell,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import { setCommands } from "../redux/botSlice.ts";
import { Command, BotWithConfig } from "../redux/types";
import React from "react";

export const CommandTable = () => {
  const dispatch = useDispatch();
  const commands = useSelector<BotWithConfig, Command[]>((state) => state.bot.commands);
  return (
    <TableContainer>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ m: 20 }}>
            <TableCell align="right">Command</TableCell>
            <TableCell align="right">Response</TableCell>
            <TableCell align="right">Action</TableCell>
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
                    localStorage.setItem("commands", JSON.stringify(newCommands));
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ m: 10 }} />
    </TableContainer>
  );
};
