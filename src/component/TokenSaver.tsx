import {
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Stack,
  Paper,
  InputAdornment,
} from "@mui/material";
import { setToken } from "../redux/botSlice.ts";
import { useDispatch, useSelector } from "react-redux";
import React, { useState } from "react";
import { BotWithConfig } from "../redux/types";

/**
 * iOS-style Settings group: a "BOT" section header above a rounded card that
 * holds the API token input row and a full-width Save button.
 */
export const TokenSaver = () => {
  const dispatch = useDispatch();
  const token = useSelector<BotWithConfig, string>((state) => state.bot.token);
  const [showToken, setShowToken] = useState(false);

  return (
    <Stack spacing={1}>
      <Typography
        variant="subtitle2"
        component="h2"
        sx={{
          fontWeight: 600,
          color: "text.secondary",
          textTransform: "uppercase",
          pl: 2,
        }}
      >
        BOT
      </Typography>

      <Paper
        variant="outlined"
        square={false}
        sx={{
          borderRadius: "12px",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <List disablePadding>
          <ListItem
            sx={{
              flexDirection: "column",
              alignItems: "stretch",
              gap: 1,
              py: 1.5,
              px: 2,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <ListItemText
              primary={
                <Typography component="h3" sx={{ fontSize: 17, fontWeight: 600 }}>
                  API Token
                </Typography>
              }
            />
            <TextField
              fullWidth
              size="small"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => dispatch(setToken(e.target.value))}
              placeholder="Enter your API token"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => setShowToken((prev) => !prev)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        {showToken ? "Hide" : "Show"}
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </ListItem>
          <ListItem sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => localStorage.setItem("token", token)}
            >
              Save
            </Button>
          </ListItem>
        </List>
      </Paper>

      <Typography
        variant="caption"
        sx={{ color: "text.secondary", pl: 2 }}
      >
        Your API token is stored locally in your browser.
      </Typography>
    </Stack>
  );
};
