import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Box, CssBaseline, Container } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme.ts";
import { Navbar, Page } from "./component/Navbar.tsx";
import { Footer } from "./component/Footer.tsx";
import { PageSkeleton } from "./component/PageSkeleton.tsx";
import { useBot } from "./hooks/useBot.ts";
import { useDispatch, useSelector } from "react-redux";
import { setToken, setAutoStart, setHydrated, setFlows, setPollRate, addFlow } from "./redux/botSlice.ts";
import { flowFromSample } from "./logic/flow.ts";
import { Flow } from "./interfaces/flow.ts";
import { BotWithConfig } from "./redux/types.ts";

// Pages are code-split: each tab's chunk downloads on first visit to that
// tab instead of shipping the whole app (chat UI, settings, React Flow
// editor) in the initial bundle. PageSkeleton is the Suspense fallback shown
// while a chunk loads, so navigation never flashes a blank content area.
// Pages export named components (no default export), so map the module
// namespace to the `{ default }` shape React.lazy expects.
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage.tsx").then((m) => ({ default: m.SettingsPage }))
);
const FlowsPage = lazy(() =>
  import("./pages/FlowsPage.tsx").then((m) => ({ default: m.FlowsPage }))
);
const ChatPage = lazy(() =>
  import("./pages/ChatPage.tsx").then((m) => ({ default: m.ChatPage }))
);
const DocsPage = lazy(() =>
  import("./pages/DocsPage.tsx").then((m) => ({ default: m.DocsPage }))
);

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
  const flows = useSelector<BotWithConfig, Flow[]>((state) => state.bot.flows);
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
        // Single-flow app: persist only the first flow so old multi-flow
        // localStorage data collapses to one.
        dispatch(setFlows(parsed.slice(0, 1) as Flow[]));
      }
      // Corrupt or wrong-shape flows: keep the default (empty) list.
    }
    const autoStart = localStorage.getItem("autoStart");
    if (autoStart !== null) dispatch(setAutoStart(autoStart === "true"));
    const pollRate = localStorage.getItem("pollRate");
    if (pollRate !== null) {
      const seconds = Number(pollRate);
      if (Number.isFinite(seconds) && seconds > 0) {
        dispatch(setPollRate(seconds));
      }
    }
    // Hydration is complete whether or not localStorage had values. Auto-start
    // decisions are made at exactly this point (load-only semantics).
    dispatch(setHydrated(true));
  }, [dispatch]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (seededRef.current) return;
    // Seed only on a true first visit (no flows key ever saved). If the user
    // deleted every flow, the key exists as "[]" and the graph stays empty.
    if (hadFlowsKeyRef.current) return;
    if (flows.length > 0) return;
    let cancelled = false;
    // Lazy evaluation: the sample data is fetched only when a genuine first
    // visit needs it, instead of being parsed at startup for every visitor.
    // `seededRef` is set when the import resolves (not when the effect runs)
    // so StrictMode's simulated remount restarts the import while still
    // guaranteeing exactly one seed.
    void import("./logic/flowSamples.ts").then(({ SAMPLE_FLOWS }) => {
      if (cancelled) return;
      if (seededRef.current) return;
      seededRef.current = true;
      dispatch(addFlow(flowFromSample(SAMPLE_FLOWS[0])));
    });
    return () => {
      cancelled = true;
    };
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
          <Suspense fallback={<PageSkeleton page={page} />}>
            {page === "settings" && <SettingsPage />}
            {page === "flow" && <FlowsPage />}
            {page === "chat" && <ChatPage bot={bot} />}
            {page === "docs" && <DocsPage onNavigate={setPage} />}
          </Suspense>
        </Box>
        <Footer />
      </Container>
    </ThemeProvider>
  );
};
export default App;
