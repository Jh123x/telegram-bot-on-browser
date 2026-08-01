import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { FlowNodeType } from "../interfaces/flow.ts";

const ITEMS: { type: FlowNodeType; label: string }[] = [
  { type: "start", label: "Start" },
  { type: "transform", label: "Transform" },
  { type: "condition", label: "Condition" },
  { type: "send", label: "Send" },
];

interface FlowPaletteProps {
  onPick?: (type: FlowNodeType) => void;
}

export const FlowPalette = ({ onPick }: FlowPaletteProps) => (
  <Paper
    data-testid="flow-palette"
    sx={{ p: 2, width: 160, flexShrink: 0, height: "100%" }}
  >
    <Typography variant="subtitle2">Palette</Typography>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      Drag a node onto the canvas.
    </Typography>
    {ITEMS.map((item) => (
      <Box
        key={item.type}
        data-testid={`palette-item-${item.type}`}
        role="button"
        aria-label={`Add ${item.label} node`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("application/reactflow", item.type);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => onPick?.(item.type)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPick?.(item.type);
          }
        }}
        sx={{
          mt: 1.5,
          px: 1.5,
          py: 1,
          border: "1px solid #3a3a3c",
          borderRadius: 2,
          bgcolor: "#1c1c1e",
          cursor: "grab",
          fontSize: 14,
          fontWeight: 600,
          color: "#f2f2f7",
          "&:hover": { borderColor: "#7c3aed" },
        }}
      >
        {item.label}
      </Box>
    ))}
  </Paper>
);
