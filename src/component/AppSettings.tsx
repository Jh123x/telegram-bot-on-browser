import {
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Stack,
  Paper,
  Switch,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import React, { useEffect, useRef, useState } from "react";
import { BotWithConfig } from "../redux/types.ts";
import { Flow } from "../interfaces/flow.ts";
import {
  defaultBotState,
  resetAll,
  setAutoStart,
  setFlows,
  setPollRate,
  setToken,
} from "../redux/botSlice.ts";

const sectionHeader = {
  fontWeight: 600,
  color: "text.secondary",
  textTransform: "uppercase",
  pl: 2,
} as const;

const sectionCaption = { color: "text.secondary", pl: 2 } as const;

const FLOW_NODE_TYPES = [
  "start",
  "lowercase",
  "uppercase",
  "trim",
  "replace",
  "extractRegex",
  "randomNumber",
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
  "send",
  "random",
  "poll",
];

const isValidFlowNode = (n: unknown): boolean => {
  if (!isRecord(n)) return false;
  const data = n.data as Record<string, unknown> | undefined;
  if (
    typeof n.id !== "string" ||
    typeof n.type !== "string" ||
    !FLOW_NODE_TYPES.includes(n.type) ||
    !isRecord(data) ||
    typeof data.label !== "string"
  ) {
    return false;
  }
  // Per-type data checks: optional fields must have the right shape when
  // present (mirrors what the editor/runtime actually reads).
  if (data.value !== undefined && typeof data.value !== "string") {
    return false;
  }
  if (data.find !== undefined && typeof data.find !== "string") {
    return false;
  }
  if (data.replacement !== undefined && typeof data.replacement !== "string") {
    return false;
  }
  if (data.pattern !== undefined && typeof data.pattern !== "string") {
    return false;
  }
  if (data.min !== undefined && typeof data.min !== "string") {
    return false;
  }
  if (data.max !== undefined && typeof data.max !== "string") {
    return false;
  }
  if (data.pollType !== undefined && typeof data.pollType !== "string") {
    return false;
  }
  if (data.isAnonymous !== undefined && typeof data.isAnonymous !== "string") {
    return false;
  }
  if (
    data.allowsMultipleAnswers !== undefined &&
    typeof data.allowsMultipleAnswers !== "string"
  ) {
    return false;
  }
  if (
    data.correctOptionId !== undefined &&
    typeof data.correctOptionId !== "string"
  ) {
    return false;
  }
  if (data.explanation !== undefined && typeof data.explanation !== "string") {
    return false;
  }
  if (data.openPeriod !== undefined && typeof data.openPeriod !== "string") {
    return false;
  }
  if (
    data.replies !== undefined &&
    (!Array.isArray(data.replies) ||
      !data.replies.every((r: unknown) => typeof r === "string"))
  ) {
    return false;
  }
  return true;
};

const isValidFlowEdge = (e: unknown): boolean => {
  if (!isRecord(e)) return false;
  const edge = e as Record<string, unknown>;
  return (
    typeof edge.id === "string" &&
    typeof edge.source === "string" &&
    typeof edge.target === "string" &&
    // Edges in the new model carry no data; a data object means a legacy
    // trigger-bearing edge that must be rejected.
    edge.data === undefined &&
    (edge.sourceHandle === undefined ||
      edge.sourceHandle === "if" ||
      edge.sourceHandle === "else")
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

/**
 * Additional iOS-style settings groups: General (auto-start toggle),
 * Data (export/import settings JSON), Danger (reset to default) and
 * Support (buy me a coffee).
 */
export const AppSettings = () => {
  const dispatch = useDispatch();
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);
  const flows = useSelector<BotWithConfig, Flow[]>((state) => state.bot.flows);
  const autoStart = useSelector<BotWithConfig, boolean>(
    (state) => state.bot.autoStart ?? false
  );
  const pollRate = useSelector<BotWithConfig, number>(
    (state) => state.bot.pollRate ?? defaultBotState.pollRate
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // Hydrate the poll rate from localStorage on mount so the settings page
  // (and the bot, when it reads the store) reflects the saved preference.
  useEffect(() => {
    const stored = localStorage.getItem("pollRate");
    if (stored === null) return;
    const seconds = Number(stored);
    if (Number.isFinite(seconds) && seconds > 0) {
      dispatch(setPollRate(seconds));
    }
  }, [dispatch]);

  const handleAutoStartChange = (checked: boolean) => {
    dispatch(setAutoStart(checked));
    localStorage.setItem("autoStart", String(checked));
  };

  const handlePollRateChange = (value: string) => {
    const seconds = Number(value);
    // Ignore empty input and anything that is not a positive number so the
    // store never holds an invalid poll rate.
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    dispatch(setPollRate(seconds));
    localStorage.setItem("pollRate", String(seconds));
  };

  const handleExport = () => {
    const data = { version: 1, token, flows, autoStart, pollRate };
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
        // flows is REQUIRED. The app is single-flow, so only the FIRST flow
        // is imported (any extra flows in a multi-flow file are dropped).
        if (
          !Array.isArray(parsed.flows) ||
          (parsed.flows.length > 0 && !isValidFlow(parsed.flows[0]))
        ) {
          setImportStatus({
            kind: "error",
            text: "Could not import settings: invalid file.",
          });
          return;
        }
        const importedFlows =
          parsed.flows.length > 0 ? [parsed.flows[0]] : [];
        // pollRate is OPTIONAL for backward compatibility with old export
        // files; when absent OR not a valid positive number we reset it to
        // the default (mirrors the flows behavior above: importing an old
        // file applies defaults). A negative/zero rate would make the poll
        // worker spin in a tight loop, so it is rejected like a missing key.
        const importedPollRate =
          typeof parsed.pollRate === "number" &&
          Number.isFinite(parsed.pollRate) &&
          parsed.pollRate > 0
            ? parsed.pollRate
            : defaultBotState.pollRate;
        dispatch(setToken(parsed.token));
        dispatch(setFlows(importedFlows));
        dispatch(setAutoStart(parsed.autoStart === true));
        dispatch(setPollRate(importedPollRate));
        localStorage.setItem("token", parsed.token);
        localStorage.setItem("flows", JSON.stringify(importedFlows));
        localStorage.setItem("autoStart", String(parsed.autoStart === true));
        localStorage.setItem("pollRate", String(importedPollRate));
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
    localStorage.removeItem("pollRate");
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
          <ListItem
            sx={{ py: 1.5, px: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <ListItemText
              primary={
                <Typography component="h3" sx={{ fontSize: 17, fontWeight: 600 }}>
                  Poll rate (seconds)
                </Typography>
              }
              secondary="How often the bot checks Telegram for new messages."
            />
            <TextField
              type="number"
              size="small"
              inputProps={{
                min: 1,
                step: 1,
                "aria-label": "Poll rate in seconds",
              }}
              value={pollRate}
              onChange={(e) => handlePollRateChange(e.target.value)}
              sx={{ width: 90 }}
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
