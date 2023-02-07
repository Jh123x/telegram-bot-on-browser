import { Toolbar, AppBar, Typography } from "@mui/material";

export const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6">BrowserBot</Typography>
      </Toolbar>
    </AppBar>
  );
};
