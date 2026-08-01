import { useState } from "react";
import { Box, CssBaseline, Container } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme.ts";
import { Navbar, Page } from "./component/Navbar.tsx";
import { Footer } from "./component/Footer.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ProgramsPage } from "./pages/ProgramsPage.tsx";
import { ChatPage } from "./pages/ChatPage.tsx";
import { DocsPage } from "./pages/DocsPage.tsx";
import { useBot } from "./hooks/useBot.ts";
import { useDispatch } from "react-redux";
import { setToken, setPrograms, setAutoStart, setHydrated } from "./redux/botSlice.ts";
import { useEffect } from "react";
import React from "react";

export const App = () => {
  const dispatch = useDispatch();
  const [page, setPage] = useState<Page>("programs");
  const { bot, started, start, stop } = useBot();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token !== null) dispatch(setToken(token));
    const programs = localStorage.getItem("programs");
    if (programs !== null) dispatch(setPrograms(JSON.parse(programs)));
    const autoStart = localStorage.getItem("autoStart");
    if (autoStart !== null) dispatch(setAutoStart(autoStart === "true"));
    // Hydration is complete whether or not localStorage had values. Auto-start
    // decisions are made at exactly this point (load-only semantics).
    dispatch(setHydrated(true));
  }, [dispatch]);

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
          {page === "programs" && <ProgramsPage />}
          {page === "chat" && <ChatPage bot={bot} />}
          {page === "docs" && <DocsPage onNavigate={setPage} />}
        </Box>
        <Footer />
      </Container>
    </ThemeProvider>
  );
};
export default App;
