import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, Typography } from "@mui/material";
import { ProgramPalette } from "./ProgramPalette.tsx";
import { ProgramSamples } from "./ProgramSamples.tsx";
import { ProgramCard } from "./ProgramCard.tsx";
import { TestChat } from "./TestChat.tsx";
import { Program } from "../interfaces/program.ts";
import { createProgram } from "../logic/program.ts";
import { addProgram, setPrograms } from "../redux/botSlice.ts";
import { BotWithConfig } from "../redux/types.ts";

export const ProgramEditor = () => {
  const dispatch = useDispatch();
  const programs = useSelector<BotWithConfig, Program[]>(
    (state) => state.bot.programs
  );

  // Persist user-entered program details to localStorage on every change.
  // Guard: the first effect run (including StrictMode's simulated remount)
  // establishes a baseline and never writes, so we do not clobber saved
  // programs before App hydrates them on startup.
  const lastWritten = useRef<string | null>(null);
  useEffect(() => {
    const serialized = JSON.stringify(programs);
    if (lastWritten.current === serialized) return;
    if (lastWritten.current === null) {
      lastWritten.current = serialized;
      return;
    }
    lastWritten.current = serialized;
    localStorage.setItem("programs", serialized);
  }, [programs]);

  const moveProgram = (id: string, direction: -1 | 1) => {
    const index = programs.findIndex((program) => program.id === id);
    if (index === -1) return;
    const target = index + direction;
    if (target < 0 || target >= programs.length) return;
    const next = [...programs];
    [next[index], next[target]] = [next[target], next[index]];
    dispatch(setPrograms(next));
  };

  return (
    <div>
      <Typography variant="h3">Programs</Typography>
      <Typography variant="body1">
        Add blocks with the buttons on each program card. When a
        user sends a message, the first program whose trigger matches replies
        with its actions.
      </Typography>
      <ProgramPalette />
      <Box sx={{ mt: 2 }}>
        <ProgramSamples />
      </Box>
      <Button
        variant="contained"
        sx={{ mt: 2, mb: 2 }}
        onClick={() => dispatch(addProgram(createProgram()))}
      >
        + New Program
      </Button>
      {programs.length === 0 ? (
        <Typography variant="body2">
          No programs yet — add a new program and use its buttons, or load a sample above.
        </Typography>
      ) : (
        programs.map((program, index) => (
          <ProgramCard
            key={program.id}
            program={program}
            index={index}
            total={programs.length}
            onMoveUp={(id) => moveProgram(id, -1)}
            onMoveDown={(id) => moveProgram(id, 1)}
          />
        ))
      )}
      <TestChat />
    </div>
  );
};
