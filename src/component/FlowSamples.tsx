import React from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { SAMPLE_FLOWS } from "../logic/flowSamples.ts";
import { flowFromSample } from "../logic/flow.ts";
import { Flow } from "../interfaces/flow.ts";

interface FlowSamplesProps {
  onLoaded?: (flow: Flow) => void;
}

// Buttons that prepare a pre-built sample flow (with fresh ids so the loaded
// copy is independent of the sample) and hand it to the parent. The parent
// decides how to store it — the app is single-flow, so the parent replaces
// the current flow rather than appending.
export const FlowSamples = ({ onLoaded }: FlowSamplesProps) => {
  const load = (name: string) => {
    const sample = SAMPLE_FLOWS.find((s) => s.name === name);
    if (!sample) return;
    const flow = flowFromSample(sample);
    onLoaded?.(flow);
  };

  return (
    <Paper data-testid="flow-samples" sx={{ p: 2, width: 260, flexShrink: 0 }}>
      <Typography variant="subtitle2">Samples</Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Load a pre-built flow.
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5 }}>
        {SAMPLE_FLOWS.map((sample) => (
          <Button
            key={sample.name}
            variant="outlined"
            size="small"
            fullWidth
            data-testid={`flow-sample-${sample.name}`}
            onClick={() => load(sample.name)}
            sx={{ textTransform: "none", justifyContent: "flex-start" }}
          >
            {sample.name}
          </Button>
        ))}
      </Box>
    </Paper>
  );
};
