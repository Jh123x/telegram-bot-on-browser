import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { FlowNodeType } from "../interfaces/flow.ts";
import { GRAPH_COLORS } from "../theme.ts";

const ITEMS: { type: FlowNodeType; label: string; accent: string }[] = [
  { type: "start", label: "Start", accent: GRAPH_COLORS.node.start.accent },
  { type: "transform", label: "Transform", accent: GRAPH_COLORS.node.transform.accent },
  { type: "condition", label: "Condition", accent: GRAPH_COLORS.node.condition.accent },
  { type: "send", label: "Send", accent: GRAPH_COLORS.node.send.accent },
];

interface FlowPaletteProps {
  onPick?: (type: FlowNodeType) => void;
}

export const FlowPalette = ({ onPick }: FlowPaletteProps) => (
  <Paper
    data-testid="flow-palette"
    sx={{ p: 2, width: 160, flexShrink: 0 }}
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
          display: "flex",
          alignItems: "center",
          border: "1px solid #3a3a3c",
          borderRadius: 2,
          bgcolor: "#1c1c1e",
          cursor: "grab",
          fontSize: 14,
          fontWeight: 600,
          color: "#f2f2f7",
          "&:hover": { borderColor: item.accent },
        }}
      >
        <Box
          data-testid={`palette-dot-${item.type}`}
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: item.accent,
            mr: 1,
            flexShrink: 0,
          }}
        />
        {item.label}
      </Box>
    ))}
  </Paper>
);
