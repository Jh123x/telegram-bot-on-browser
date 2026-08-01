import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
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

  const send = () => {
    const text = input.trim();
    if (text === "") return;

    const next: Message[] = [...messages, { id: generateId(), from: "user", text }];

    // First matching program wins, exactly like the real bot.
    const program = findMatchingProgram(programs, text);
    if (!program) {
      next.push({
        id: generateId(),
        from: "system",
        text: "No program matched this message — the bot would stay silent.",
      });
    } else {
      next.push({ id: generateId(), from: "system", text: `Matched program: ${program.name}` });
      const replies = executeProgram(program, text);
      if (replies.length === 0) {
        next.push({
          id: generateId(),
          from: "system",
          text: "The program matched but produced no reply.",
        });
      } else {
        for (const reply of replies) {
          next.push({ id: generateId(), from: "bot", text: reply });
        }
      }
    }

    setMessages(next);
    setInput("");
  };

  const clear = () => setMessages([]);

  return (
    <Paper data-testid="test-chat" sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6">Test Chat</Typography>
      <Typography variant="caption">
        Type a message to see how the whole bot responds. The first matching
        program replies.
      </Typography>
      <Box sx={{ maxHeight: 320, overflowY: "auto", mb: 1 }}>
        {messages.map((message) => {
          if (message.from === "user") {
            return (
              <Box
                key={message.id}
                sx={{ display: "flex", justifyContent: "flex-end", mb: 0.5 }}
              >
                <Paper
                  variant="outlined"
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
              </Box>
            );
          }
          if (message.from === "bot") {
            return (
              <Box
                key={message.id}
                sx={{ display: "flex", justifyContent: "flex-start", mb: 0.5 }}
              >
                <Paper variant="outlined" sx={{ px: 1.5, py: 0.75, borderRadius: 2 }}>
                  {message.text}
                </Paper>
              </Box>
            );
          }
          return (
            <Box key={message.id} sx={{ textAlign: "center", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {message.text}
              </Typography>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>
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
        <Button variant="text" onClick={clear}>
          Clear
        </Button>
      </Box>
    </Paper>
  );
};
