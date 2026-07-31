import { useState } from "react";
import { CssBaseline, Container } from "@mui/material";
import { Navbar, Page } from "./component/Navbar.tsx";
import { Footer } from "./component/Footer.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ProgramsPage } from "./pages/ProgramsPage.tsx";
import { ChatPage } from "./pages/ChatPage.tsx";
import { DocsPage } from "./pages/DocsPage.tsx";
import { useBot } from "./hooks/useBot.ts";
import { useDispatch } from "react-redux";
import { setToken, setPrograms } from "./redux/botSlice.ts";
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
  }, [dispatch]);

  return (
    <Container sx={{ height: "100%", maxWidth: "100%", width: "100%", minWidth: "100%", margin: 0, padding: 0 }} disableGutters={true}>
      <CssBaseline />
      <Navbar page={page} onPageChange={setPage} started={started} onStart={start} onStop={stop} />
      <Container>
        {page === "settings" && <SettingsPage />}
        {page === "programs" && <ProgramsPage />}
        {page === "chat" && <ChatPage bot={bot} />}
        {page === "docs" && <DocsPage />}
      </Container>
      <Footer />
    </Container>
  );
};
export default App;
