import { Fragment, useEffect } from "react";
import { useDispatch } from "react-redux";
import { CssBaseline, Container } from "@mui/material";

import { TokenSaver } from "./component/TokenSaver";
import { Navbar } from "./component/Navbar";
import { BotInterface } from "./component/BotInterface";
import { BotOperation } from "./component/BotOperation";
import { setToken, setCommands } from "./redux/botSlice";
import { Footer } from "./component/Footer";

export const App = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token !== null) dispatch(setToken(token));
    const commands = localStorage.getItem("commands");
    if (commands !== null) dispatch(setCommands(JSON.parse(commands)));
  }, [dispatch]);
  return (
    <Fragment>
      <CssBaseline />
      <Navbar />
      <Container>
        <TokenSaver />
        <BotInterface />
        <BotOperation />
      </Container>
      <Footer />
    </Fragment>
  );
};
export default App;
