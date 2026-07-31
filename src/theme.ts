import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#2563eb" },
    background: { default: "#fafafa", paper: "#ffffff" },
  },
  shape: { borderRadius: 10 },
});

export const BLOCK_COLORS: Record<string, { main: string; bg: string }> = {
  trigger: { main: "#2563eb", bg: "#dbeafe" },
  logic: { main: "#d97706", bg: "#fef3c7" },
  transform: { main: "#7c3aed", bg: "#ede9fe" },
  action: { main: "#059669", bg: "#d1fae5" },
};
