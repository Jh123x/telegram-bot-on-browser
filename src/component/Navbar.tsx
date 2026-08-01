import React from "react";
import {
  AppBar,
  Box,
  Button,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";

export type Page = "flow" | "chat" | "settings" | "docs";

const PAGE_TABS: { value: Page; label: string }[] = [
  { value: "flow", label: "Flow" },
  { value: "chat", label: "Chat" },
  { value: "settings", label: "Settings" },
  { value: "docs", label: "Docs" },
];

export const Navbar = ({
  page,
  onPageChange,
  started,
  onStart,
  onStop,
}: {
  page: Page;
  onPageChange: (p: Page) => void;
  started: boolean;
  onStart: () => void;
  onStop: () => void;
}) => (
  <AppBar position="static">
    <Toolbar sx={{ display: "flex", gap: 2 }}>
      <Typography variant="h6" sx={{ mr: 2 }}>
        BrowserBot
      </Typography>
      <Box sx={{ flexGrow: 1 }}>
        <Tabs
          value={page}
          textColor="inherit"
          onChange={(_e, value: Page) => onPageChange(value)}
        >
          {PAGE_TABS.map((tab) => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Box>
      <Typography variant="body1">
        {started ? "Bot started" : "Bot stopped"}
      </Typography>
      <Button
        variant="contained"
        color="success"
        disabled={started}
        onClick={onStart}
      >
        Start
      </Button>
      <Button
        variant="contained"
        color="error"
        disabled={!started}
        onClick={onStop}
      >
        Stop
      </Button>
    </Toolbar>
  </AppBar>
);
