import React from "react";
import { Stack, Typography } from "@mui/material";
import { TokenSaver } from "../component/TokenSaver.tsx";

export const SettingsPage = () => (
  <Stack sx={{ gap: 2, p: 2 }}>
    <Typography variant="h3" component="h1">
      Settings
    </Typography>
    <TokenSaver />
  </Stack>
);
