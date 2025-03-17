import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { CssBaseline, Container } from "@mui/material";

import { TokenSaver } from "./component/TokenSaver.tsx";
import { Navbar } from "./component/Navbar.tsx";
import { BotInterface } from "./component/BotInterface.tsx";
import { BotOperation } from "./component/BotOperation.tsx";
import { setToken, setCommands } from "./redux/botSlice.ts";
import { Footer } from "./component/Footer.tsx";
import React from "react";
import { LogBox } from "./component/logs.tsx";

export const App = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token !== null) dispatch(setToken(token));
    const commands = localStorage.getItem("commands");
    if (commands !== null) dispatch(setCommands(JSON.parse(commands)));
  }, [dispatch]);
  return (
    <Container sx={{
      height: '100%',
      maxWidth: '100%',
      width: '100%',
      minWidth: '100%',
      margin: 0,
      padding: 0,
    }} disableGutters={true}>
      <CssBaseline />
      <Navbar />
      <Container>
        <TokenSaver />
        <BotInterface />
        <BotOperation />
        <LogBox />
      </Container>
      <Footer />
    </Container>
  );
};
export default App;
