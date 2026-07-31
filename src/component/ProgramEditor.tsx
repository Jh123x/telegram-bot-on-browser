import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Typography } from "@mui/material";
import { ProgramPalette } from "./ProgramPalette.tsx";
import { ProgramSamples } from "./ProgramSamples.tsx";
import { ProgramCard } from "./ProgramCard.tsx";
import { Program } from "../interfaces/program.ts";
import { createProgram } from "../logic/program.ts";
import { addProgram, setPrograms } from "../redux/botSlice.ts";
import { BotWithConfig } from "../redux/types.ts";

export const ProgramEditor = () => {
  const dispatch = useDispatch();
  const programs = useSelector<BotWithConfig, Program[]>(
    (state) => state.bot.programs
  );

  // Skip writing on the very first mount so we do not clobber localStorage
  // before App hydrates saved programs/token on startup.
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    localStorage.setItem("programs", JSON.stringify(programs));
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
        Drag blocks from the palette onto a program, or click to add. When a
        user sends a message, the first program whose trigger matches replies
        with its actions.
      </Typography>
      <ProgramPalette />
      <ProgramSamples />
      <Button
        variant="contained"
        onClick={() => dispatch(addProgram(createProgram()))}
      >
        + New Program
      </Button>
      {programs.length === 0 ? (
        <Typography variant="body2">
          No programs yet — drag a block or load a sample above.
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
    </div>
  );
};
