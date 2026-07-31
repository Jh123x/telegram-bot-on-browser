import React from "react";
import { Paper, Typography } from "@mui/material";
import { TriggerType } from "../interfaces/program.ts";
import { TRIGGER_LABELS, ACTION_LABELS } from "../logic/program.ts";
import { ActionType } from "../interfaces/program.ts";

type DragKind = "trigger" | "action";

const TRIGGER_TYPES: TriggerType[] = ["equals", "contains", "startsWith"];
const ACTION_TYPES: ActionType[] = ["reply", "random", "echo"];

const handleDragStart = (
  e: React.DragEvent<HTMLDivElement>,
  kind: DragKind,
  type: TriggerType | ActionType
) => {
  e.dataTransfer.setData("text/plain", JSON.stringify({ kind, type }));
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
          onDragStart={(e) => handleDragStart(e, "trigger", type)}
          style={{
            padding: "8px",
            margin: "4px 0",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "grab",
            backgroundColor: "#f5f5f5",
          }}
        >
          When {TRIGGER_LABELS[type]}
        </div>
      ))}

      <Typography variant="subtitle2">Actions</Typography>
      {ACTION_TYPES.map((type) => (
        <div
          key={type}
          draggable
          data-testid={`palette-action-${type}`}
          onDragStart={(e) => handleDragStart(e, "action", type)}
          style={{
            padding: "8px",
            margin: "4px 0",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "grab",
            backgroundColor: "#f5f5f5",
          }}
        >
          {ACTION_LABELS[type]}
        </div>
      ))}
    </Paper>
  );
};
