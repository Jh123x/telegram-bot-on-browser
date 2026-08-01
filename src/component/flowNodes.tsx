import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FlowNodeData, TransformData } from "../interfaces/flow.ts";
import { TRIGGER_LABELS } from "../logic/flow.ts";
import { GRAPH_COLORS } from "../theme.ts";

// Shared card styling for the small, clean (Stripe/Apple-minimal) node cards.
// Each node type passes its own accent/bg tokens so the graph reads visually
// distinct at a glance; a selected node gets a colored focus ring.
const cardSx = (accent: string, bg: string, selected?: boolean) => ({
  minWidth: 120,
  maxWidth: 180,
  px: 1.5,
  py: 1,
  border: `1.5px solid ${accent}`,
  borderRadius: 2,
  bgcolor: bg,
  boxShadow: selected ? `0 0 0 2px ${accent}` : "0 2px 8px rgba(0,0,0,0.35)",
  "&:hover": { borderColor: accent },
});

const CardLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    noWrap
    sx={{
      fontSize: 13,
      fontWeight: 600,
      color: "#f2f2f7",
      lineHeight: 1.4,
    }}
  >
    {children}
  </Typography>
);

const CardCaption = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      mt: 0.5,
      fontSize: 11,
      color: "#8e8e93",
      lineHeight: 1.3,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: 150,
    }}
  >
    {children}
  </Typography>
);

// Small colored badge showing the node type, tinted with the type's accent.
const TypeBadge = ({ label, color }: { label: string; color: string }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      height: 18,
      my: 0.5,
      fontSize: 10,
      fontWeight: 700,
      color,
      bgcolor: "transparent",
      border: `1px solid ${color}`,
      "& .MuiChip-label": { px: 1 },
    }}
  />
);

// Human-readable one-liner for a transform node's caption.
export function transformSummary(transform: TransformData | undefined): string {
  if (!transform) return "no transform";
  switch (transform.type) {
    case "lowercase":
      return "lowercase";
    case "uppercase":
      return "uppercase";
    case "trim":
      return "trim";
    case "replace":
      return transform.find
        ? `replace "${transform.find}" → "${transform.replacement}"`
        : "replace";
    case "extractRegex":
      return "extract regex";
    default:
      return "transform";
  }
}

export const StartNode = ({ data, selected }: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.start;
  return (
    <Box data-testid="flow-node-start" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label="start" color={accent} />
      <Handle type="source" position={Position.Right} style={{ background: accent }} />
    </Box>
  );
};

export const TransformNode = ({ data, selected }: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.transform;
  return (
    <Box data-testid="flow-node-transform" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label="transform" color={accent} />
      <CardCaption>{transformSummary(data.transform)}</CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: accent }} />
      <Handle type="source" position={Position.Right} style={{ background: accent }} />
    </Box>
  );
};

export const ConditionNode = ({ data, selected }: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.condition;
  const trigger = data.trigger;
  const caption = trigger
    ? `${TRIGGER_LABELS[trigger.type]} "${trigger.value}"`
    : "condition";
  return (
    <Box data-testid="flow-node-condition" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label="condition" color={accent} />
      <CardCaption>{caption}</CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: accent }} />
      <Handle
        id="if"
        type="source"
        position={Position.Right}
        style={{ background: GRAPH_COLORS.edge.if, top: 6 }}
      />
      <Handle
        id="else"
        type="source"
        position={Position.Right}
        style={{ background: GRAPH_COLORS.edge.else, bottom: 6 }}
      />
    </Box>
  );
};

// A SendNode is a terminal node: it consumes a flow but never branches onward,
// so it must keep EXACTLY ONE (target) handle.
export const SendNode = ({ data, selected }: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.send;
  const replyCount = (data.replies ?? []).length;
  return (
    <Box data-testid="flow-node-send" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label="send" color={accent} />
      <CardCaption>
        {replyCount} {replyCount === 1 ? "reply" : "replies"}
      </CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: accent }} />
    </Box>
  );
};
