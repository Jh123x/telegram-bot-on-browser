import { TextField, Button, FormGroup, Typography } from "@mui/material";
import { setToken } from "../redux/botSlice.ts";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import { BotWithConfig } from "../redux/types";

export const TokenSaver = () => {
  const dispatch = useDispatch();
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);

  return (
    <FormGroup>
      <Typography variant="h3">API Token</Typography>
      <Typography variant="body1">
        Please enter your API token to save it to local storage.
      </Typography>
      <br />
      <Typography>API Token</Typography>
      <TextField
        value={token}
        onChange={(e) => dispatch(setToken(e.target.value))}
      />
      <Button
        variant="contained"
        onClick={() => localStorage.setItem("token", token)}
      >
        Save
      </Button>
      <br />
    </FormGroup >
  );
};
