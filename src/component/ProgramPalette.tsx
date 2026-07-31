import React from "react";
import { Paper, Typography } from "@mui/material";
import {
  ActionType,
  BlockCategory,
  LogicType,
  TransformType,
  TriggerType,
} from "../interfaces/program.ts";
import {
  ACTION_LABELS,
  BLOCK_CATEGORY_LABELS,
  LOGIC_LABELS,
  TRIGGER_LABELS,
  TRANSFORM_LABELS,
} from "../logic/program.ts";
import { BLOCK_COLORS } from "../theme.ts";

const TRIGGER_TYPES: TriggerType[] = [
  "equals",
  "contains",
  "startsWith",
  "endsWith",
];
const LOGIC_TYPES: LogicType[] = ["lengthGreater", "lengthLess", "matchesRegex"];
const TRANSFORM_TYPES: TransformType[] = [
  "uppercase",
  "lowercase",
  "trim",
  "replace",
];
const ACTION_TYPES: ActionType[] = ["reply", "random", "echo"];

const blockStyle = (category: BlockCategory) => {
  const colors = BLOCK_COLORS[category];
  return {
    padding: "8px",
    margin: "4px 0",
    border: `1px solid ${colors.main}40`,
    borderRadius: "6px",
    cursor: "grab",
    backgroundColor: colors.bg,
    color: colors.main,
  };
};

const Dot = ({ color }: { color: string }) => (
  <span
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: color,
      marginRight: 6,
    }}
  />
);

const SectionHeader = ({
  label,
  color,
  first,
}: {
  label: string;
  color: string;
  first?: boolean;
}) => (
  <Typography
    variant="subtitle2"
    sx={{ fontWeight: 600, mt: first ? 0 : 2 }}
  >
    <Dot color={color} />
    {label}
  </Typography>
);

const handleTriggerDragStart = (
  e: React.DragEvent<HTMLDivElement>,
  type: TriggerType
) => {
  e.dataTransfer.setData(
    "text/plain",
    JSON.stringify({ kind: "trigger", type })
  );
};

const handleBlockDragStart = (
  e: React.DragEvent<HTMLDivElement>,
  category: BlockCategory,
  type: LogicType | TransformType | ActionType
) => {
  e.dataTransfer.setData(
    "text/plain",
    JSON.stringify({ kind: "block", category, type })
  );
};

export const ProgramPalette = () => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Blocks</Typography>
      <Typography variant="caption">
        Drag a block onto a program below.
      </Typography>

      <SectionHeader label="Triggers" color={BLOCK_COLORS.trigger.main} first />
      {TRIGGER_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-trigger-${type}`}
          onDragStart={(e) => handleTriggerDragStart(e, type)}
          style={blockStyle("trigger")}
        >
          <Dot color={BLOCK_COLORS.trigger.main} />
          When {TRIGGER_LABELS[type]}
        </div>
      ))}

      <SectionHeader
        label={BLOCK_CATEGORY_LABELS.logic}
        color={BLOCK_COLORS.logic.main}
      />
      {LOGIC_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-logic-${type}`}
          onDragStart={(e) => handleBlockDragStart(e, "logic", type)}
          style={blockStyle("logic")}
        >
          <Dot color={BLOCK_COLORS.logic.main} />
          {LOGIC_LABELS[type]}
        </div>
      ))}

      <SectionHeader
        label={BLOCK_CATEGORY_LABELS.transform}
        color={BLOCK_COLORS.transform.main}
      />
      {TRANSFORM_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-transform-${type}`}
          onDragStart={(e) => handleBlockDragStart(e, "transform", type)}
          style={blockStyle("transform")}
        >
          <Dot color={BLOCK_COLORS.transform.main} />
          {TRANSFORM_LABELS[type]}
        </div>
      ))}

      <SectionHeader
        label={BLOCK_CATEGORY_LABELS.action}
        color={BLOCK_COLORS.action.main}
      />
      {ACTION_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-action-${type}`}
          onDragStart={(e) => handleBlockDragStart(e, "action", type)}
          style={blockStyle("action")}
        >
          <Dot color={BLOCK_COLORS.action.main} />
          {ACTION_LABELS[type]}
        </div>
      ))}
    </Paper>
  );
};
