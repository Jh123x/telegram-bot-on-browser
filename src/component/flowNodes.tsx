import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FlowNodeData,
  TransformData,
} from "../interfaces/flow.ts";
import { TRIGGER_LABELS } from "../logic/flow.ts";

// Shared card styling for the small, clean (Stripe/Apple-minimal) node cards.
const cardSx = {
  minWidth: 120,
  maxWidth: 180,
  px: 1.5,
  py: 1,
  border: "1px solid #3a3a3c",
  borderRadius: 2,
  bgcolor: "#1c1c1e",
  boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
  "&:hover": { borderColor: "#7c3aed" },
};

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

const StartHint = () => (
  <Chip
    label="start"
    size="small"
    sx={{
      height: 18,
      my: 0.5,
      fontSize: 10,
      fontWeight: 700,
      color: "#7c3aed",
      bgcolor: "transparent",
      border: "1px solid #7c3aed",
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

export const StartNode = ({ data }: NodeProps<FlowNodeData>) => (
  <Box data-testid="flow-node-start" sx={cardSx}>
    <CardLabel>{data.label}</CardLabel>
    <StartHint />
    <Handle type="source" position={Position.Right} style={{ background: "#7c3aed" }} />
  </Box>
);

export const TransformNode = ({ data }: NodeProps<FlowNodeData>) => (
  <Box data-testid="flow-node-transform" sx={cardSx}>
    <CardLabel>{data.label}</CardLabel>
    <CardCaption>{transformSummary(data.transform)}</CardCaption>
    <Handle type="target" position={Position.Left} style={{ background: "#8e8e93" }} />
    <Handle type="source" position={Position.Right} style={{ background: "#8e8e93" }} />
  </Box>
);

export const ConditionNode = ({ data }: NodeProps<FlowNodeData>) => {
  const trigger = data.trigger;
  const caption = trigger
    ? `${TRIGGER_LABELS[trigger.type]} "${trigger.value}"`
    : "condition";
  return (
    <Box data-testid="flow-node-condition" sx={cardSx}>
      <CardLabel>{data.label}</CardLabel>
      <CardCaption>{caption}</CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: "#8e8e93" }} />
      <Handle
        id="if"
        type="source"
        position={Position.Right}
        style={{ background: "#16a34a", top: 6 }}
      />
      <Handle
        id="else"
        type="source"
        position={Position.Right}
        style={{ background: "#dc2626", bottom: 6 }}
      />
    </Box>
  );
};

export const SendNode = ({ data }: NodeProps<FlowNodeData>) => {
  const replyCount = (data.replies ?? []).length;
  return (
    <Box data-testid="flow-node-send" sx={cardSx}>
      <CardLabel>{data.label}</CardLabel>
      <CardCaption>
        {replyCount} {replyCount === 1 ? "reply" : "replies"}
      </CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: "#8e8e93" }} />
    </Box>
  );
};
