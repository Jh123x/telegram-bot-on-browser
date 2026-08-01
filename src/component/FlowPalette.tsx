import React, { useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import type { FlowNodeCategory, FlowNodeType } from "../interfaces/flow.ts";
import { nodeCategory, TRANSFORM_TYPES, TRIGGER_TYPES, TRIGGER_LABELS } from "../logic/flow.ts";
import { GRAPH_COLORS } from "../theme.ts";

// Two-level palette: the top level is a CATEGORY (start/transform/condition/
// send), and each category expands to the ACTUAL node types it contains. Every
// node type is now a concrete operation, so a category may hold several items
// (e.g. all five transforms).
interface PaletteItem {
  type: FlowNodeType;
  label: string;
  accent: string;
}

const CATEGORY_ORDER: FlowNodeCategory[] = ["start", "transform", "condition", "send"];

const CATEGORY_ITEMS: Record<FlowNodeCategory, PaletteItem[]> = {
  start: [
    { type: "start", label: "Start", accent: GRAPH_COLORS.node.start.accent },
  ],
  transform: TRANSFORM_TYPES.map((type) => ({
    type,
    label: type === "extractRegex" ? "Extract Regex" : type.charAt(0).toUpperCase() + type.slice(1),
    accent: GRAPH_COLORS.node.transform.accent,
  })),
  condition: TRIGGER_TYPES.map((type) => ({
    type,
    label: TRIGGER_LABELS[type],
    accent: GRAPH_COLORS.node.condition.accent,
  })),
  send: [
    { type: "send", label: "Send", accent: GRAPH_COLORS.node.send.accent },
    { type: "random", label: "Random", accent: GRAPH_COLORS.node.send.accent },
  ],
};

const CATEGORY_LABELS: Record<FlowNodeCategory, string> = {
  start: "Start",
  transform: "Transform",
  condition: "Condition",
  send: "Send",
};

interface FlowPaletteProps {
  onPick?: (type: FlowNodeType) => void;
}

export const FlowPalette = ({ onPick }: FlowPaletteProps) => {
  const [category, setCategory] = useState<FlowNodeCategory>("start");
  const items = CATEGORY_ITEMS[category];

  return (
    <Paper
      data-testid="flow-palette"
      sx={{ p: 2, width: 160, flexShrink: 0 }}
    >
      <Typography variant="subtitle2">Palette</Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Pick a category, then a node to add.
      </Typography>

      {/* Top level: category selector */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
        {CATEGORY_ORDER.map((cat) => (
          <Box
            key={cat}
            data-testid={`palette-category-${cat}`}
            role="button"
            tabIndex={0}
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setCategory(cat);
              }
            }}
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              fontSize: 12,
              fontWeight: category === cat ? 700 : 500,
              color: category === cat ? "#f2f2f7" : "#8e8e93",
              bgcolor: category === cat ? "#2c2c2e" : "transparent",
              border: "1px solid",
              borderColor: category === cat ? "#3a3a3c" : "transparent",
              cursor: "pointer",
            }}
          >
            {CATEGORY_LABELS[cat]}
          </Box>
        ))}
      </Box>

      {/* Second level: the actual nodes in the selected category */}
      {items.map((item) => (
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
};

// Re-export for callers that need the category helper (e.g. FlowEditor).
export { nodeCategory };
