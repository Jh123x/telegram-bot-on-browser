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

const blockStyle = {
  padding: "8px",
  margin: "4px 0",
  border: "1px solid #ccc",
  borderRadius: "4px",
  cursor: "grab",
  backgroundColor: "#f5f5f5",
};

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

      <Typography variant="subtitle2">Triggers</Typography>
      {TRIGGER_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-trigger-${type}`}
          onDragStart={(e) => handleTriggerDragStart(e, type)}
          style={blockStyle}
        >
          When {TRIGGER_LABELS[type]}
        </div>
      ))}

      <Typography variant="subtitle2">{BLOCK_CATEGORY_LABELS.logic}</Typography>
      {LOGIC_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-logic-${type}`}
          onDragStart={(e) => handleBlockDragStart(e, "logic", type)}
          style={blockStyle}
        >
          {LOGIC_LABELS[type]}
        </div>
      ))}

      <Typography variant="subtitle2">
        {BLOCK_CATEGORY_LABELS.transform}
      </Typography>
      {TRANSFORM_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-transform-${type}`}
          onDragStart={(e) => handleBlockDragStart(e, "transform", type)}
          style={blockStyle}
        >
          {TRANSFORM_LABELS[type]}
        </div>
      ))}

      <Typography variant="subtitle2">
        {BLOCK_CATEGORY_LABELS.action}
      </Typography>
      {ACTION_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-action-${type}`}
          onDragStart={(e) => handleBlockDragStart(e, "action", type)}
          style={blockStyle}
        >
          {ACTION_LABELS[type]}
        </div>
      ))}
    </Paper>
  );
};
