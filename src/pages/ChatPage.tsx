import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addResponse,
  setResponse,
  setSelectedUserId,
  setUsers,
} from "../redux/botSlice.ts";
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
  Typography,
} from "@mui/material";
import { BrowserBot } from "../interfaces/bot.ts";
import { BotWithConfig, Response, User } from "../redux/types.ts";
import { Program } from "../interfaces/program.ts";
import { Flow } from "../interfaces/flow.ts";
import { executeProgram, findMatchingProgram } from "../logic/program.ts";
import { FlowRuntime } from "../logic/flow.ts";

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

// Virtual conversation used by test mode when there are no real users yet.
const TEST_USER: User = { Username: "Test User", UserID: -1 };

// Stable empty array so the flows selector never returns a fresh reference
// (a new [] each render would warn and cause unnecessary rerenders).
const EMPTY_FLOWS: Flow[] = [];

export const ChatPage = ({ bot }: { bot?: BrowserBot }) => {
  const dispatch = useDispatch();
  const storeUsers = useSelector<BotWithConfig, User[]>((state) => state.bot.users);
  const responses = useSelector<BotWithConfig, Response[]>((state) => state.bot.response);
  const programs = useSelector<BotWithConfig, Program[]>((state) => state.bot.programs);
  const flows = useSelector<BotWithConfig, Flow[]>(
    (state) => state.bot.flows ?? EMPTY_FLOWS
  );
  const selectedUserId = useSelector<BotWithConfig, number | null>(
    (state) => state.bot.selectedUserId ?? null
  );

  const [message, setMessage] = useState<string>("");
  const [simulated, setSimulated] = useState<DisplayItem[]>([]);
  const [chatStatus, setChatStatus] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-flow runtimes that track the Test User's position so the preview is
  // stateful, exactly like the production runtime. Rebuilt whenever the flow
  // definitions change (fresh FlowRuntime per rebuild matches useBot).
  const flowRuntimesRef = useRef<Map<string, FlowRuntime>>(new Map());
  useEffect(() => {
    const next = new Map<string, FlowRuntime>();
    flows.forEach((flow) => next.set(flow.id, new FlowRuntime(flow)));
    flowRuntimesRef.current = next;
  }, [flows]);

  const realUsers: User[] =
    storeUsers.length > 0 ? storeUsers : deriveUsersFromResponses(responses);

  // Test User is a first-class conversation, just like any real user. It is
  // always listed so the bot can be tested before anyone has messaged it.
  const userList: User[] = [...realUsers, TEST_USER];

  // Effective selection: a stored selection that still exists, otherwise the
  // Test User. TEST_USER is always in userList, so selectedUser is never null.
  const selectedUser = userList.find((user) => user.UserID === selectedUserId) ?? TEST_USER;

  const displayItems: DisplayItem[] = [
    ...responses
      .filter((response) => response.UserID === selectedUser.UserID)
      .map((response, index) => ({
        // index-based id keeps live messages unique even when the same user
        // sends identical text within the same second (TimeStamp has 1s
        // resolution, so it would otherwise collide).
        id: `r-${index}`,
        kind: "message" as const,
        time: response.TimeStamp,
        response,
      })),
    ...simulated,
  ].sort((a, b) => a.time - b.time);

  const simulate = () => {
    const text = message.trim();
    if (text === "") return;

    const now = Date.now();
    let i = 0;
    const nextTime = () => now + i++;
    const newItems: DisplayItem[] = [
      {
        id: `sim-${now}-${i++}`,
        kind: "message",
        time: now + (i - 1),
        response: {
          FromUser: TEST_USER.Username,
          UserID: TEST_USER.UserID,
          Message: text,
          TimeStamp: now + (i - 1),
          fromBot: false,
        },
      },
    ];

    const program = findMatchingProgram(programs, text);
    if (program) {
      newItems.push({
        id: `sim-${now}-${i++}`,
        kind: "note",
        time: nextTime(),
        text: `Matched program: ${program.name}`,
      });
      const replies = executeProgram(program, text);
      if (replies.length === 0) {
        newItems.push({
          id: `sim-${now}-${i++}`,
          kind: "note",
          time: nextTime(),
          text: "The program matched but produced no reply.",
        });
      } else {
        replies.forEach((reply) => {
          const t = nextTime();
          newItems.push({
            id: `sim-${now}-${i++}`,
            kind: "message",
            time: t,
            response: {
              FromUser: "Bot",
              UserID: TEST_USER.UserID,
              Message: reply,
              TimeStamp: t,
              fromBot: true,
            },
          });
        });
      }
      setSimulated((prev) => [...prev, ...newItems]);
      setMessage("");
      return;
    }

    // No program matched: give flows a chance. First flow whose current state
    // has a matching transition wins — the same per-user path production uses
    // (FlowRuntime keyed by user id, here the Test User).
    let matchedFlow: Flow | undefined;
    let flowReplies: string[] = [];
    for (const flow of flows) {
      const runtime = flowRuntimesRef.current.get(flow.id);
      if (!runtime) continue;
      const result = runtime.handleMessage(TEST_USER.UserID, text);
      if (result !== undefined) {
        matchedFlow = flow;
        flowReplies = Array.isArray(result) ? result : [result];
        break;
      }
    }

    if (!matchedFlow) {
      newItems.push({
        id: `sim-${now}-${i++}`,
        kind: "note",
        time: nextTime(),
        text: "No program matched this message — the bot would stay silent.",
      });
    } else {
      newItems.push({
        id: `sim-${now}-${i++}`,
        kind: "note",
        time: nextTime(),
        text: `Matched flow: ${matchedFlow.name}`,
      });
      if (flowReplies.length === 0) {
        newItems.push({
          id: `sim-${now}-${i++}`,
          kind: "note",
          time: nextTime(),
          text: "The flow matched but produced no reply.",
        });
      } else {
        flowReplies.forEach((reply) => {
          const t = nextTime();
          newItems.push({
            id: `sim-${now}-${i++}`,
            kind: "message",
            time: t,
            response: {
              FromUser: "Bot",
              UserID: TEST_USER.UserID,
              Message: reply,
              TimeStamp: t,
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
    if (selectedUser.UserID === TEST_USER.UserID) {
      simulate();
      return;
    }
    if (!bot || message.trim() === "") return;
    bot.sendMessage(selectedUser.UserID, message);
    dispatch(
      addResponse({
        FromUser: "Bot",
        UserID: selectedUser.UserID,
        Message: message,
        TimeStamp: Date.now(),
        fromBot: true,
      })
    );
    setMessage("");
  };

  const isValidUser = (u: unknown): boolean => {
    if (typeof u !== "object" || u === null) return false;
    const x = u as Record<string, unknown>;
    return typeof x.Username === "string" && typeof x.UserID === "number";
  };

  const isValidResponse = (r: unknown): boolean => {
    if (typeof r !== "object" || r === null) return false;
    const x = r as Record<string, unknown>;
    return (
      typeof x.FromUser === "string" &&
      typeof x.UserID === "number" &&
      typeof x.Message === "string" &&
      typeof x.TimeStamp === "number" &&
      (x.fromBot === undefined || typeof x.fromBot === "boolean")
    );
  };

  const handleExportChat = () => {
    const payload = { version: 1, users: storeUsers, response: responses };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "browserbot-chat.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportChat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (
          !Array.isArray(parsed.users) ||
          !parsed.users.every(isValidUser) ||
          !Array.isArray(parsed.response) ||
          !parsed.response.every(isValidResponse)
        ) {
          setChatStatus({
            kind: "error",
            text: "Could not import chat: invalid file.",
          });
          return;
        }
        dispatch(setUsers(parsed.users));
        dispatch(setResponse(parsed.response));
        setChatStatus({ kind: "success", text: "Chat imported." });
      } catch {
        setChatStatus({
          kind: "error",
          text: "Could not import chat: invalid file.",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography variant="h3" sx={{ mb: 2 }}>
        Chat
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <Button
          size="small"
          variant="outlined"
          onClick={handleExportChat}
          sx={{ textTransform: "none" }}
        >
          Export chat
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          sx={{ textTransform: "none" }}
        >
          Import chat
        </Button>
        <input
          type="file"
          accept="application/json,.json"
          data-testid="import-chat-input"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImportChat}
        />
        {chatStatus && (
          <Typography
            variant="caption"
            data-testid="chat-import-status"
            sx={{ color: chatStatus.kind === "error" ? "error.main" : "success.main" }}
          >
            {chatStatus.text}
          </Typography>
        )}
      </Stack>

      <Paper
        data-testid="chat-panel"
        sx={{ flex: 1, minHeight: 0, display: "flex", bgcolor: "background.paper" }}
      >
      {/* Sidebar / user picker */}
      <Box sx={{ width: 240, borderRight: 1, borderColor: "divider", overflowY: "auto", p: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, py: 1 }}>
          Conversations
        </Typography>
        {realUsers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
            No real users yet — start the bot to see them here, or try the
            Test User conversation.
          </Typography>
        ) : (
          <List dense disablePadding>
            {realUsers.map((user) => (
              <ListItemButton
                key={user.UserID}
                data-testid={`chat-user-${user.UserID}`}
                selected={user.UserID === selectedUser.UserID}
                onClick={() => {
                  dispatch(setSelectedUserId(user.UserID));
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
        <List dense disablePadding>
          <ListItemButton
            data-testid={`chat-user-${TEST_USER.UserID}`}
            selected={TEST_USER.UserID === selectedUser.UserID}
            onClick={() => {
              dispatch(setSelectedUserId(TEST_USER.UserID));
              setMessage("");
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ width: 28, height: 28, fontSize: 14, bgcolor: "secondary.main" }}>
                {TEST_USER.Username.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={TEST_USER.Username}
              secondary="Simulated"
              primaryTypographyProps={{ noWrap: true }}
            />
          </ListItemButton>
        </List>
      </Box>

      {/* Main conversation area */}
      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column" }}>
          {displayItems.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ alignSelf: "center", my: "auto" }}
            >
              No messages yet.
            </Typography>
          ) : (
            displayItems.map((item) => {
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
                  key={item.id}
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

        {selectedUser.UserID === TEST_USER.UserID && (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ px: 2, pt: 1 }}
          >
            This is a simulated test conversation — nothing is sent to Telegram.
          </Typography>
        )}

        {/* Composer */}
        <Stack direction="row" spacing={1} sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            aria-label="Message to send"
            placeholder={
              selectedUser.UserID === TEST_USER.UserID
                ? "Type a message to simulate…"
                : "Type your message…"
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <Button variant="contained" onClick={send}>
            {selectedUser.UserID === TEST_USER.UserID ? "Simulate" : "Send"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
    </Box>
  );
};
