import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Avatar, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { Program } from "../interfaces/program.ts";
import { BotWithConfig } from "../redux/types.ts";
import {
  executeProgram,
  findMatchingProgram,
  generateId,
} from "../logic/program.ts";

type Message = {
  id: string;
  from: "user" | "bot" | "system";
  text: string;
  time: number;
};

export const TestChat = () => {
  const programs = useSelector<BotWithConfig, Program[]>(
    (state) => state.bot.programs
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      bottomRef.current &&
      typeof bottomRef.current.scrollIntoView === "function"
    ) {
      bottomRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  const time = () => Date.now();
  const userMessage = (text: string): Message => ({
    id: generateId(),
    from: "user",
    text,
    time: time(),
  });
  const systemMessage = (text: string): Message => ({
    id: generateId(),
    from: "system",
    text,
    time: time(),
  });
  const botMessage = (text: string): Message => ({
    id: generateId(),
    from: "bot",
    text,
    time: time(),
  });

  const send = () => {
    const text = input.trim();
    if (text === "") return;

    const next: Message[] = [...messages, userMessage(text)];

    // First matching program wins, exactly like the real bot.
    const program = findMatchingProgram(programs, text);
    if (!program) {
      next.push(
        systemMessage("No program matched this message — the bot would stay silent.")
      );
    } else {
      next.push(systemMessage(`Matched program: ${program.name}`));
      const replies = executeProgram(program, text);
      if (replies.length === 0) {
        next.push(
          systemMessage("The program matched but produced no reply.")
        );
      } else {
        for (const reply of replies) {
          next.push(botMessage(reply));
        }
      }
    }

    setMessages(next);
    setInput("");
  };

  const clear = () => setMessages([]);

  const avatar = (
    <Avatar sx={{ bgcolor: "secondary.main", fontSize: 18 }}>🤖</Avatar>
  );

  return (
    <Paper data-testid="test-chat" sx={{ p: 2, mt: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1,
          pb: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {avatar}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Test Chat</Typography>
          <Typography variant="caption" color="text.secondary">
            Simulated bot — the first matching program replies.
          </Typography>
        </Box>
        <Button variant="text" onClick={clear}>
          Clear
        </Button>
      </Box>

      {/* Conversation */}
      <Box
        sx={{
          height: 360,
          overflowY: "auto",
          mb: 1,
          bgcolor: "action.hover",
          borderRadius: 1,
          p: 1.5,
        }}
      >
        {messages.map((message) => {
          if (message.from === "user") {
            return (
              <Box
                key={message.id}
                data-testid="test-chat-user-msg"
                sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}
              >
                <Stack direction="column" alignItems="flex-end" spacing={0.25}>
                  <Typography variant="caption" color="text.secondary" fontSize={10}>
                    You
                  </Typography>
                  <Paper
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      borderRadius: 2,
                    }}
                  >
                    {message.text}
                  </Paper>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontSize={10}
                    data-testid="test-chat-time"
                  >
                    {new Date(message.time).toLocaleTimeString()}
                  </Typography>
                </Stack>
              </Box>
            );
          }
          if (message.from === "bot") {
            return (
              <Box
                key={message.id}
                data-testid="test-chat-bot-msg"
                sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}
              >
                {avatar}
                <Stack direction="column" alignItems="flex-start" spacing={0.25}>
                  <Typography variant="caption" color="text.secondary" fontSize={10}>
                    Bot
                  </Typography>
                  <Paper sx={{ px: 1.5, py: 0.75, borderRadius: 2 }}>
                    {message.text}
                  </Paper>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontSize={10}
                    data-testid="test-chat-time"
                  >
                    {new Date(message.time).toLocaleTimeString()}
                  </Typography>
                </Stack>
              </Box>
            );
          }
          return (
            <Box key={message.id} sx={{ textAlign: "center", mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {message.text}
              </Typography>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>

      {/* Composer */}
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          size="small"
          label="Message"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <Button variant="contained" onClick={send}>
          Send
        </Button>
      </Box>
    </Paper>
  );
};
