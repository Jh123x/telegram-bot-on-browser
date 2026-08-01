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

export const GRAPH_COLORS = {
  node: {
    start: { accent: "#7c3aed", bg: "rgba(124, 58, 237, 0.08)" },
    transform: { accent: "#38bdf8", bg: "rgba(56, 189, 248, 0.08)" },
    condition: { accent: "#fbbf24", bg: "rgba(251, 191, 36, 0.08)" },
    send: { accent: "#34d399", bg: "rgba(52, 211, 153, 0.08)" },
  },
  edge: { if: "#22c55e", else: "#ef4444", plain: "#6b7280" },
} as const;

export function edgeColorFor(sourceHandle: "if" | "else" | undefined): string {
  if (sourceHandle === "if") return GRAPH_COLORS.edge.if;
  if (sourceHandle === "else") return GRAPH_COLORS.edge.else;
  return GRAPH_COLORS.edge.plain;
}
