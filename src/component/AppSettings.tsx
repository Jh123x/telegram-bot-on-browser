import {
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Stack,
  Paper,
  Switch,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import React, { useRef, useState } from "react";
import { BotWithConfig } from "../redux/types.ts";
import { Flow } from "../interfaces/flow.ts";
import {
  resetAll,
  setAutoStart,
  setFlows,
  setToken,
} from "../redux/botSlice.ts";

const sectionHeader = {
  fontWeight: 600,
  color: "text.secondary",
  textTransform: "uppercase",
  pl: 2,
} as const;

const sectionCaption = { color: "text.secondary", pl: 2 } as const;

const isValidFlowNode = (n: unknown): boolean => {
  if (!isRecord(n)) return false;
  return (
    typeof n.id === "string" &&
    (n.type === "start" || n.type === "state") &&
    isRecord(n.data) &&
    typeof (n.data as Record<string, unknown>).label === "string" &&
    Array.isArray((n.data as Record<string, unknown>).replies)
  );
};

const isValidFlowEdge = (e: unknown): boolean => {
  if (!isRecord(e)) return false;
  const edge = e as Record<string, unknown>;
  return (
    typeof edge.id === "string" &&
    typeof edge.source === "string" &&
    typeof edge.target === "string" &&
    isRecord(edge.data) &&
    isRecord((edge.data as Record<string, unknown>).trigger) &&
    typeof ((edge.data as Record<string, unknown>).trigger as Record<string, unknown>)
      .type === "string"
  );
};

const isValidFlow = (f: unknown): boolean => {
  if (!isRecord(f)) return false;
  const flow = f as Record<string, unknown>;
  return (
    typeof flow.id === "string" &&
    typeof flow.name === "string" &&
    typeof flow.startNodeId === "string" &&
    Array.isArray(flow.nodes) &&
    flow.nodes.every(isValidFlowNode) &&
    Array.isArray(flow.edges) &&
    flow.edges.every(isValidFlowEdge)
  );
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

// Stable empty array so the flows selector never returns a fresh reference
// (a new [] each render would warn and cause unnecessary rerenders).
const EMPTY_FLOWS: Flow[] = [];

/**
 * Additional iOS-style settings groups: General (auto-start toggle),
 * Data (export/import settings JSON), Danger (reset to default) and
 * Support (buy me a coffee).
 */
export const AppSettings = () => {
  const dispatch = useDispatch();
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);
  const flows = useSelector<BotWithConfig, Flow[]>(
    (state) => state.bot.flows ?? EMPTY_FLOWS
  );
  const autoStart = useSelector<BotWithConfig, boolean>(
    (state) => state.bot.autoStart ?? false
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const handleAutoStartChange = (checked: boolean) => {
    dispatch(setAutoStart(checked));
    localStorage.setItem("autoStart", String(checked));
  };

  const handleExport = () => {
    const data = { version: 1, token, flows, autoStart };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "browserbot-settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (typeof parsed.token !== "string") {
          setImportStatus({
            kind: "error",
            text: "Could not import settings: invalid file.",
          });
          return;
        }
        // flows is OPTIONAL for backward compatibility with old export files.
        // When present it must be a valid array of flows; when absent (old
        // files) we reset flows to an empty array. This documents the
        // intentional behavior that importing an old-version file drops flows.
        if (
          parsed.flows !== undefined &&
          (!Array.isArray(parsed.flows) || !parsed.flows.every(isValidFlow))
        ) {
          setImportStatus({
            kind: "error",
            text: "Could not import settings: invalid file.",
          });
          return;
        }
        const importedFlows = parsed.flows ?? [];
        dispatch(setToken(parsed.token));
        dispatch(setFlows(importedFlows));
        dispatch(setAutoStart(parsed.autoStart === true));
        localStorage.setItem("token", parsed.token);
        localStorage.setItem("flows", JSON.stringify(importedFlows));
        localStorage.setItem("autoStart", String(parsed.autoStart === true));
        setImportStatus({ kind: "success", text: "Settings imported." });
      } catch {
        setImportStatus({
          kind: "error",
          text: "Could not import settings: invalid file.",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (
      !window.confirm(
        "Reset all settings to default? This clears your token, flows and preferences."
      )
    ) {
      return;
    }
    dispatch(resetAll());
    localStorage.removeItem("token");
    localStorage.removeItem("flows");
    localStorage.removeItem("autoStart");
  };

  return (
    <Stack spacing={1}>
      {/* GENERAL */}
      <Typography variant="subtitle2" component="h2" sx={sectionHeader}>
        General
      </Typography>
      <Paper
        variant="outlined"
        square={false}
        sx={{ borderRadius: "12px", bgcolor: "background.paper", overflow: "hidden" }}
      >
        <List disablePadding>
          <ListItem
            secondaryAction={
              <Switch
                edge="end"
                checked={autoStart}
                inputProps={{ "aria-label": "Auto start bot on load" }}
                onChange={(e) => handleAutoStartChange(e.target.checked)}
              />
            }
            sx={{ py: 1.5, px: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <ListItemText
              primary={
                <Typography component="h3" sx={{ fontSize: 17, fontWeight: 600 }}>
                  Auto start bot on load
                </Typography>
              }
              secondary="Starts the bot automatically when the page loads."
            />
          </ListItem>
        </List>
      </Paper>

      {/* DATA */}
      <Typography variant="subtitle2" component="h2" sx={sectionHeader}>
        Data
      </Typography>
      <Paper
        variant="outlined"
        square={false}
        sx={{ borderRadius: "12px", bgcolor: "background.paper", overflow: "hidden" }}
      >
        <List disablePadding>
          <ListItem
            sx={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: 1.5,
              py: 1.5,
              px: 2,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleExport}
                sx={{ textTransform: "none", flex: 1 }}
              >
                Export settings
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: "none", flex: 1 }}
              >
                Import settings
              </Button>
              <input
                type="file"
                accept="application/json,.json"
                data-testid="import-settings-input"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImport}
              />
            </Stack>
            <Typography
              variant="caption"
              data-testid="import-status"
              sx={{
                color:
                  importStatus?.kind === "error" ? "error.main" : "success.main",
              }}
            >
              {importStatus?.text ?? ""}
            </Typography>
          </ListItem>
        </List>
      </Paper>

      {/* DANGER */}
      <Typography variant="subtitle2" component="h2" sx={sectionHeader}>
        Danger
      </Typography>
      <Paper
        variant="outlined"
        square={false}
        sx={{ borderRadius: "12px", bgcolor: "background.paper", overflow: "hidden" }}
      >
        <List disablePadding>
          <ListItem sx={{ py: 1.5, px: 2, borderBottom: 1, borderColor: "divider" }}>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={handleReset}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Reset to default
            </Button>
          </ListItem>
        </List>
      </Paper>
      <Typography variant="caption" sx={sectionCaption}>
        Clears your token, flows and preferences from this browser.
      </Typography>

      {/* SUPPORT */}
      <Typography variant="subtitle2" component="h2" sx={sectionHeader}>
        Support
      </Typography>
      <Paper
        variant="outlined"
        square={false}
        sx={{ borderRadius: "12px", bgcolor: "background.paper", overflow: "hidden" }}
      >
        <List disablePadding>
          <ListItem sx={{ py: 1.5, px: 2 }}>
            <Button
              component="a"
              href="https://buymeacoffee.com/jh123x"
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="primary"
              fullWidth
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              ☕ Buy me a coffee
            </Button>
          </ListItem>
        </List>
      </Paper>
    </Stack>
  );
};
