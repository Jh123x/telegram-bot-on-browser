import { createTheme } from "@mui/material/styles";

const BASE_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7c3aed" },
    background: { default: "#121212", paper: "#1c1c1e" },
    text: { primary: "#f2f2f7", secondary: "#8e8e93" },
    divider: "#3a3a3c",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: BASE_FONT,
    h1: { fontSize: 34, fontWeight: 700, letterSpacing: 0 },
    h2: { fontSize: 28, fontWeight: 700, letterSpacing: 0 },
    h3: { fontSize: 22, fontWeight: 700, letterSpacing: 0 },
    h4: { fontSize: 17, fontWeight: 600, letterSpacing: 0 },
    h5: { fontSize: 17, fontWeight: 600, letterSpacing: 0 },
    h6: { fontSize: 17, fontWeight: 600, letterSpacing: 0 },
    subtitle1: { fontSize: 15, fontWeight: 600, letterSpacing: 0 },
    subtitle2: { fontSize: 13, fontWeight: 600, letterSpacing: 0 },
    body1: { fontSize: 17, fontWeight: 400, letterSpacing: 0 },
    body2: { fontSize: 15, fontWeight: 400, letterSpacing: 0 },
    caption: { fontSize: 12, fontWeight: 400, letterSpacing: 0 },
    overline: { fontSize: 12, fontWeight: 600, letterSpacing: 0 },
    button: {
      fontSize: 17,
      fontWeight: 600,
      textTransform: "none",
      letterSpacing: 0,
    },
  },
});
