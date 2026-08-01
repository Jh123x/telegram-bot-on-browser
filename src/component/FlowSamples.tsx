import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { SAMPLE_FLOWS } from "../logic/flowSamples.ts";
import { flowFromSample } from "../logic/flow.ts";
import { addFlow } from "../redux/botSlice.ts";
import { Flow } from "../interfaces/flow.ts";

interface FlowSamplesProps {
  onLoaded?: (flow: Flow) => void;
}

// Buttons that load a pre-built sample flow into the store (with fresh ids so
// loading the same sample twice yields two independent flows).
export const FlowSamples = ({ onLoaded }: FlowSamplesProps) => {
  const dispatch = useDispatch();

  const load = (name: string) => {
    const sample = SAMPLE_FLOWS.find((s) => s.name === name);
    if (!sample) return;
    const flow = flowFromSample(sample);
    dispatch(addFlow(flow));
    onLoaded?.(flow);
  };

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography variant="subtitle2">Samples</Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
        {SAMPLE_FLOWS.map((sample) => (
          <Button
            key={sample.name}
            variant="outlined"
            size="small"
            data-testid={`flow-sample-${sample.name}`}
            onClick={() => load(sample.name)}
          >
            {sample.name}
          </Button>
        ))}
      </Box>
    </Paper>
  );
};
