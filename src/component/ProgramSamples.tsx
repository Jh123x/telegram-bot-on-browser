import React from "react";
import { Button, Paper, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { SAMPLE_PROGRAMS, programFromSample } from "../logic/samples.ts";
import { addProgram } from "../redux/botSlice.ts";

export const ProgramSamples = () => {
  const dispatch = useDispatch();

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Samples</Typography>
      <Typography variant="caption">
        Click a sample to add it as a program.
      </Typography>
      {SAMPLE_PROGRAMS.map((sample) => (
        <Button
          key={sample.name}
          variant="outlined"
          onClick={() => dispatch(addProgram(programFromSample(sample)))}
        >
          {sample.name}
        </Button>
      ))}
    </Paper>
  );
};
