import { useState } from "react";
import { Box, CssBaseline, Container } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme.ts";
import { Navbar, Page } from "./component/Navbar.tsx";
import { Footer } from "./component/Footer.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ChatPage } from "./pages/ChatPage.tsx";
import { DocsPage } from "./pages/DocsPage.tsx";
import { FlowsPage } from "./pages/FlowsPage.tsx";
import { useBot } from "./hooks/useBot.ts";
import { useDispatch, useSelector } from "react-redux";
import { setToken, setAutoStart, setHydrated, setFlows, addFlow } from "./redux/botSlice.ts";
import { useEffect, useRef } from "react";
import React from "react";
import { flowFromSample } from "./logic/flow.ts";
import { SAMPLE_FLOWS } from "./logic/flowSamples.ts";
import { Flow } from "./interfaces/flow.ts";
import { BotWithConfig } from "./redux/types.ts";

// Stable empty array so the flows selector never returns a fresh reference
// (a new [] each render would warn and cause unnecessary rerenders).
const EMPTY_FLOWS: Flow[] = [];

// Safely parses localStorage JSON into a value WITHOUT throwing on corrupt
// input. Returns null when the raw value is null or the JSON is unparseable.
const parseJson = (raw: string | null): unknown => {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// Shape checks for hydrated data. Corrupt JSON *or* valid JSON that does not
// match the expected shape is treated as absent so a bad localStorage value
// can never crash the app at startup (blank page) — we simply keep the default
// state.
const isValidFlow = (f: unknown): boolean => {
  const flow = f as Record<string, unknown>;
  return (
    isRecord(f) &&
    typeof flow.id === "string" &&
    typeof flow.name === "string" &&
    typeof flow.startNodeId === "string" &&
    Array.isArray(flow.nodes) &&
    Array.isArray(flow.edges)
  );
};

export const App = () => {
  const dispatch = useDispatch();
  const [page, setPage] = useState<Page>("flow");
  const { bot, started, start, stop } = useBot();
  const flows = useSelector<BotWithConfig, Flow[]>((state) => state.bot.flows ?? EMPTY_FLOWS);
  const hydrated = useSelector<BotWithConfig, boolean>(
    (state) => state.bot.hydrated ?? false
  );

  // True only when a "flows" key existed in localStorage at hydration time —
  // even if it held "[]". Distinguishes a genuine first visit (seed a sample)
  // from a user who deliberately emptied their flows (leave the graph empty).
  const hadFlowsKeyRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token !== null) dispatch(setToken(token));
    const flows = localStorage.getItem("flows");
    if (flows !== null) {
      // Set the flag whenever the key exists — even if its content is corrupt
      // or malformed — so a truly-empty flow list is never re-seeded.
      hadFlowsKeyRef.current = true;
      const parsed = parseJson(flows);
      if (Array.isArray(parsed) && parsed.every(isValidFlow)) {
        dispatch(setFlows(parsed as Flow[]));
      }
      // Corrupt or wrong-shape flows: keep the default (empty) list.
    }
    const autoStart = localStorage.getItem("autoStart");
    if (autoStart !== null) dispatch(setAutoStart(autoStart === "true"));
    // Hydration is complete whether or not localStorage had values. Auto-start
    // decisions are made at exactly this point (load-only semantics).
    dispatch(setHydrated(true));
  }, [dispatch]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (seededRef.current) return;
    seededRef.current = true;
    // Seed only on a true first visit (no flows key ever saved). If the user
    // deleted every flow, the key exists as "[]" and the graph stays empty.
    if (hadFlowsKeyRef.current) return;
    if (flows.length > 0) return;
    dispatch(addFlow(flowFromSample(SAMPLE_FLOWS[0])));
  }, [hydrated, flows, dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <Container
        data-testid="app-root"
        sx={{
          height: "100%",
          maxWidth: "100%",
          width: "100%",
          minWidth: "100%",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
        }}
        disableGutters={true}
      >
        <CssBaseline />
        <Navbar page={page} onPageChange={setPage} started={started} onStart={start} onStop={stop} />
        <Box
          data-testid="app-content"
          component="main"
          sx={{ flex: 1, minHeight: 0, overflowY: "auto", width: "100%", px: 3, py: 2 }}
        >
          {page === "settings" && <SettingsPage />}
          {page === "flow" && <FlowsPage />}
          {page === "chat" && <ChatPage bot={bot} />}
          {page === "docs" && <DocsPage onNavigate={setPage} />}
        </Box>
        <Footer />
      </Container>
    </ThemeProvider>
  );
};
export default App;
