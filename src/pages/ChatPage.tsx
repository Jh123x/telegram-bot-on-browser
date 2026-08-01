import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addResponse } from "../redux/botSlice.ts";
import {
  Avatar,
  Box,
  Button,
  Divider,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  Typography,
} from "@mui/material";
import { BrowserBot } from "../interfaces/bot.ts";
import { BotWithConfig, Response, User } from "../redux/types.ts";
import { Program } from "../interfaces/program.ts";
import { executeProgram, findMatchingProgram } from "../logic/program.ts";

type DisplayItem =
  | { id: string; kind: "message"; time: number; response: Response }
  | { id: string; kind: "note"; time: number; text: string };

// Derive a usable user list even when state.bot.users is empty by falling
// back to the users that have sent messages.
const deriveUsersFromResponses = (responses: Response[]): User[] => {
  const seen = new Map<number, string>();
  for (const response of responses) {
    if (!response.fromBot && !seen.has(response.UserID)) {
      seen.set(response.UserID, response.FromUser);
    }
  }
  return Array.from(seen, ([UserID, Username]) => ({ Username, UserID }));
};

const timeLabel = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

export const ChatPage = ({ bot }: { bot?: BrowserBot }) => {
  const dispatch = useDispatch();
  const storeUsers = useSelector<BotWithConfig, User[]>((state) => state.bot.users);
  const responses = useSelector<BotWithConfig, Response[]>((state) => state.bot.response);
  const programs = useSelector<BotWithConfig, Program[]>((state) => state.bot.programs);

  const [selectedUserID, setSelectedUserID] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");
  const [testMode, setTestMode] = useState<boolean>(false);
  const [simulated, setSimulated] = useState<DisplayItem[]>([]);

  const userList: User[] =
    storeUsers.length > 0 ? storeUsers : deriveUsersFromResponses(responses);

  const selectedUser = userList.find((user) => user.UserID === selectedUserID) ?? null;

  const displayItems: DisplayItem[] = [
    ...responses
      .filter((response) => response.UserID === selectedUserID)
      .map((response) => ({
        id: `r-${response.TimeStamp}-${response.Message}`,
        kind: "message" as const,
        time: response.TimeStamp,
        response,
      })),
    ...simulated,
  ].sort((a, b) => a.time - b.time);

  const simulate = () => {
    const text = message.trim();
    if (text === "" || selectedUserID === null) return;

    const now = Date.now();
    const newItems: DisplayItem[] = [
      {
        id: `sim-${now}-0`,
        kind: "message",
        time: now,
        response: {
          FromUser: selectedUser?.Username ?? "User",
          UserID: selectedUserID,
          Message: text,
          TimeStamp: now,
          fromBot: false,
        },
      },
    ];

    const program = findMatchingProgram(programs, text);
    if (!program) {
      newItems.push({
        id: `sim-${now}-1`,
        kind: "note",
        time: Date.now(),
        text: "No program matched this message — the bot would stay silent.",
      });
    } else {
      newItems.push({
        id: `sim-${Date.now()}-note`,
        kind: "note",
        time: Date.now(),
        text: `Matched program: ${program.name}`,
      });
      const replies = executeProgram(program, text);
      if (replies.length === 0) {
        newItems.push({
          id: `sim-${Date.now()}-emptynote`,
          kind: "note",
          time: Date.now(),
          text: "The program matched but produced no reply.",
        });
      } else {
        replies.forEach((reply, index) => {
          newItems.push({
            id: `sim-${Date.now()}-${index + 1}`,
            kind: "message",
            time: Date.now(),
            response: {
              FromUser: "Bot",
              UserID: selectedUserID,
              Message: reply,
              TimeStamp: Date.now(),
              fromBot: true,
            },
          });
        });
      }
    }

    setSimulated((prev) => [...prev, ...newItems]);
    setMessage("");
  };

  const send = () => {
    if (testMode) {
      simulate();
      return;
    }
    if (selectedUserID === null || !bot || message.trim() === "") return;
    bot.sendMessage(selectedUserID, message);
    dispatch(
      addResponse({
        FromUser: "Bot",
        UserID: selectedUserID,
        Message: message,
        TimeStamp: Date.now(),
        fromBot: true,
      })
    );
    setMessage("");
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography variant="h3" sx={{ mb: 2 }}>
        Chat
      </Typography>

      <Paper
        data-testid="chat-panel"
        sx={{ flex: 1, minHeight: 0, display: "flex", bgcolor: "background.paper" }}
      >
      {/* Sidebar / user picker */}
      <Box sx={{ width: 240, borderRight: 1, borderColor: "divider", overflowY: "auto", p: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, py: 1 }}>
          Conversations
        </Typography>
        {userList.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
            No users yet — start the bot and wait for users to message you.
          </Typography>
        ) : (
          <List dense disablePadding>
            {userList.map((user) => (
              <ListItemButton
                key={user.UserID}
                data-testid={`chat-user-${user.UserID}`}
                selected={user.UserID === selectedUserID}
                onClick={() => {
                  setSelectedUserID(user.UserID);
                  setMessage("");
                  setSimulated([]);
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>{user.Username.charAt(0).toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.Username}
                  secondary={String(user.UserID)}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      {/* Main conversation area */}
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column" }}>
          {selectedUser === null ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ alignSelf: "center", my: "auto" }}
            >
              Select a user to view their conversation.
            </Typography>
          ) : displayItems.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ alignSelf: "center", my: "auto" }}
            >
              No messages yet.
            </Typography>
          ) : (
            displayItems.map((item, index) => {
              if (item.kind === "note") {
                return (
                  <Box
                    key={item.id}
                    data-testid="chat-system-note"
                    sx={{ textAlign: "center", mb: 1 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {item.text}
                    </Typography>
                  </Box>
                );
              }
              const response = item.response;
              const isBot = response.fromBot === true;
              return (
                <Stack
                  key={`${item.kind}-${item.time}-${index}`}
                  data-testid={`chat-message-${response.TimeStamp}${isBot ? "-bot" : ""}`}
                  direction="row"
                  justifyContent={isBot ? "flex-start" : "flex-end"}
                  spacing={1}
                  alignItems="flex-end"
                  sx={{ mb: 1.5 }}
                >
                  {isBot && (
                    <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>Bot</Avatar>
                  )}
                  <Box sx={{ maxWidth: "70%", textAlign: isBot ? "left" : "right" }}>
                    <Typography variant="caption" component="span" color="text.secondary">
                      {isBot ? `Bot · ${timeLabel(response.TimeStamp)}` : `${response.FromUser} · ${timeLabel(response.TimeStamp)}`}
                    </Typography>
                    <Paper
                      data-testid="chat-bubble"
                      elevation={0}
                      sx={{
                        mt: 0.5,
                        p: 1.25,
                        borderRadius: 2.5,
                        display: "inline-block",
                        textAlign: "left",
                        ...(isBot
                          ? { bgcolor: "background.default", color: "text.primary" }
                          : { bgcolor: "primary.main", color: "primary.contrastText" }),
                      }}
                    >
                      <Typography variant="body2">{response.Message}</Typography>
                    </Paper>
                  </Box>
                </Stack>
              );
            })
          )}
        </Box>

        <Divider />

        {testMode && (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ px: 2, pt: 1 }}
          >
            Test mode — messages are simulated and nothing is sent to Telegram.
          </Typography>
        )}

        {/* Composer */}
        <Stack direction="row" spacing={1} sx={{ p: 2 }}>
          <ToggleButton
            value="test"
            selected={testMode}
            onChange={() => setTestMode((m) => !m)}
            size="small"
            color="primary"
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          >
            Test
          </ToggleButton>
          <TextField
            fullWidth
            size="small"
            placeholder={testMode ? "Type a message to simulate…" : "Type your message…"}
            value={message}
            disabled={selectedUserID === null}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <Button
            variant="contained"
            disabled={selectedUserID === null}
            onClick={send}
          >
            {testMode ? "Simulate" : "Send"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
    </Box>
  );
};
