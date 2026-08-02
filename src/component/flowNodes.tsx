import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  FlowNodeData,
  FlowTriggerType,
  TransformNodeType,
} from "../interfaces/flow.ts";
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
export function transformSummary(
  type: TransformNodeType,
  data: FlowNodeData
): string {
  switch (type) {
    case "lowercase":
      return "lowercase";
    case "uppercase":
      return "uppercase";
    case "trim":
      return "trim";
    case "replace":
      return data.find
        ? `replace "${data.find}" → "${data.replacement ?? ""}"`
        : "replace";
    case "extractRegex":
      return "extract regex";
    case "randomNumber":
      return data.min && data.max ? `random ${data.min}–${data.max}` : "random number";
    default:
      return "transform";
  }
}

// Human-readable caption for a condition node: `message contains "hi"`.
export function conditionSummary(
  type: FlowTriggerType,
  value: string
): string {
  return `${TRIGGER_LABELS[type]} "${value}"`;
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

// One renderer for every concrete transform type; the specific type arrives
// via the `type` prop React Flow passes to custom nodes.
export const TransformNode = ({
  type,
  data,
  selected,
}: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.transform;
  return (
    <Box data-testid="flow-node-transform" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label={type} color={accent} />
      <CardCaption>
        {transformSummary(type as TransformNodeType, data)}
      </CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: accent }} />
      <Handle type="source" position={Position.Right} style={{ background: accent }} />
    </Box>
  );
};

// One renderer for every concrete trigger type (equals, contains, ...). The
// specific type arrives via the `type` prop; the caption is the trigger
// label + the configured value.
export const ConditionNode = ({
  type,
  data,
  selected,
}: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.condition;
  return (
    <Box data-testid="flow-node-condition" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label={type} color={accent} />
      <CardCaption>
        {conditionSummary(type as FlowTriggerType, data.value ?? "")}
      </CardCaption>
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

// A RandomNode sends exactly ONE of its reply lines, chosen at random. Also
// terminal: a single target handle, no source.
export const RandomNode = ({ data, selected }: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.send;
  const replyCount = (data.replies ?? []).length;
  return (
    <Box data-testid="flow-node-random" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label="random" color={accent} />
      <CardCaption>
        {replyCount === 0
          ? "no replies"
          : `1 of ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
      </CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: accent }} />
    </Box>
  );
};

// A PollNode sends a Telegram poll. The poll question/options are parsed from
// the incoming `/poll <title> option1, option2, ...` message, so the node
// carries no replies of its own. Terminal: a single target handle, no source.
export const PollNode = ({ data, selected }: NodeProps<FlowNodeData>) => {
  const { accent, bg } = GRAPH_COLORS.node.send;
  return (
    <Box data-testid="flow-node-poll" sx={cardSx(accent, bg, selected)}>
      <CardLabel>{data.label}</CardLabel>
      <TypeBadge label="poll" color={accent} />
      <CardCaption>sends a Telegram poll</CardCaption>
      <Handle type="target" position={Position.Left} style={{ background: accent }} />
    </Box>
  );
};
