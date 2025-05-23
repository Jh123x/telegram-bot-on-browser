import { Fragment } from "react";
import { Typography } from "@mui/material";

import { CommandTable } from "./CommandTable.tsx";
import { CommandForm } from "./CommandForm.tsx";
import React from "react";

export const BotInterface = () => {
  return (
    <Fragment>
      <Typography variant="h3">Commands</Typography>
      <Typography variant="body1">
        When a user sends `Command`, the bot will reply with `Response`.
      </Typography>
      <CommandTable />
      <CommandForm />
      <br />
    </Fragment>
  );
};
