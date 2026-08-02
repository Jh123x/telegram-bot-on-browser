import React, { useState } from "react";
import { Box, Paper, TextField, Typography } from "@mui/material";
import {
  PlayArrow,
  ArrowDownward,
  ArrowUpward,
  TextFields,
  FindReplace,
  ManageSearch,
  Numbers,
  HorizontalRule,
  ShortText,
  CallMade,
  CallReceived,
  Close,
  Block,
  Send,
  Casino,
  Poll,
} from "@mui/icons-material";
import type { FlowNodeCategory, FlowNodeType } from "../interfaces/flow.ts";
import {
  ALL_NODE_TYPES,
  NODE_DESCRIPTIONS,
  NODE_LABELS,
  nodeCategory,
} from "../logic/flow.ts";
import { GRAPH_COLORS } from "../theme.ts";

// Flat, always-visible palette: every node type is grouped by category and
// rendered at once, with a filter box on top to narrow the list. A category
// group is hidden entirely only when all of its members are filtered out.
const CATEGORY_ORDER: FlowNodeCategory[] = ["start", "transform", "condition", "send"];

const CATEGORY_LABELS: Record<FlowNodeCategory, string> = {
  start: "Start",
  transform: "Transform",
  condition: "Condition",
  send: "Send",
};

// Per-node-type accent icon chip so palette items scan faster than plain dots.
const NODE_ICONS: Record<FlowNodeType, React.ComponentType<any>> = {
  start: PlayArrow,
  lowercase: ArrowDownward,
  uppercase: ArrowUpward,
  trim: TextFields,
  replace: FindReplace,
  extractRegex: ManageSearch,
  randomNumber: Numbers,
  equals: HorizontalRule,
  contains: ShortText,
  startsWith: CallMade,
  endsWith: CallReceived,
  notEquals: Close,
  notContains: Block,
  send: Send,
  random: Casino,
  poll: Poll,
};

interface FlowPaletteProps {
  onPick?: (type: FlowNodeType) => void;
}

export const FlowPalette = ({ onPick }: FlowPaletteProps) => {
  const [filter, setFilter] = useState("");
  const trimmed = filter.trim().toLowerCase();

  const visible = (type: FlowNodeType): boolean =>
    trimmed === "" ||
    NODE_LABELS[type].toLowerCase().includes(trimmed) ||
    NODE_DESCRIPTIONS[type].toLowerCase().includes(trimmed);

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: ALL_NODE_TYPES.filter((t) => nodeCategory(t) === cat && visible(t)),
  })).filter((group) => group.items.length > 0);

  return (
    <Paper
      data-testid="flow-palette"
      sx={{
        p: 2,
        width: 200,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Typography variant="subtitle2">Palette</Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        All nodes, grouped by category.
      </Typography>

      <TextField
        data-testid="palette-filter"
        size="small"
        fullWidth
        placeholder="Filter nodes…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        sx={{ mt: 1 }}
      />

      <Box data-testid="palette-list" sx={{ flex: 1, minHeight: 0, overflowY: "auto", mt: 0.5 }}>
        {groups.map(({ cat, items }) => (
          <Box key={cat}>
            <Typography
              variant="overline"
              data-testid={`palette-group-${cat}`}
              sx={{
                display: "block",
                mt: 1.5,
                color: GRAPH_COLORS.node[cat].accent,
              }}
            >
              {CATEGORY_LABELS[cat]}
            </Typography>

            {items.map((type) => {
              const accent = GRAPH_COLORS.node[cat].accent;
              const bg = GRAPH_COLORS.node[cat].bg;
              const Icon = NODE_ICONS[type];
              return (
                <Box
                  key={type}
                  data-testid={`palette-item-${type}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Add ${NODE_LABELS[type]} node`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", type);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => onPick?.(type)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPick?.(type);
                    }
                  }}
                  sx={{
                    mt: 1,
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    cursor: "grab",
                    "&:hover": { borderColor: accent },
                  }}
                >
                  <Box
                    data-testid={`palette-icon-${type}`}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: bg,
                      color: accent,
                      flexShrink: 0,
                    }}
                  >
                    {Icon && <Icon sx={{ fontSize: 18 }} />}
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, fontSize: 13, color: "text.primary" }}
                    >
                      {NODE_LABELS[type]}
                    </Typography>
                    <Typography
                      variant="caption"
                      data-testid={`palette-desc-${type}`}
                      sx={{ display: "block", color: "text.secondary" }}
                    >
                      {NODE_DESCRIPTIONS[type]}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}

        {groups.length === 0 && (
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 1 }}>
            No nodes match "{filter}".
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

// Re-export for callers that need the category helper (e.g. FlowEditor).
export { nodeCategory };
