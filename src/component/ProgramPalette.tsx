import React from "react";
import { Paper, Typography, Box } from "@mui/material";
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
  BLOCK_DESCRIPTIONS,
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
  "notEquals",
  "notContains",
];
const LOGIC_TYPES: LogicType[] = [
  "lengthGreater",
  "lengthLess",
  "matchesRegex",
  "lengthEquals",
  "isNumber",
];
const TRANSFORM_TYPES: TransformType[] = [
  "uppercase",
  "lowercase",
  "trim",
  "replace",
  "concat",
  "capitalize",
  "titleCase",
  "reverse",
  "remove",
];
const ACTION_TYPES: ActionType[] = ["reply", "random", "echo"];

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

// A single block reference entry: the existing label plus a short plain
// description of what the block does.
const BlockReference = ({
  category,
  type,
  label,
  testId,
}: {
  category: BlockCategory | "trigger";
  type: string;
  label: string;
  testId: string;
}) => (
  <Box sx={{ mt: 0.5 }}>
    <Typography variant="body2">{label}</Typography>
    <Typography
      variant="caption"
      sx={{ color: "text.secondary" }}
      data-testid={testId}
    >
      {BLOCK_DESCRIPTIONS[category][type]}
    </Typography>
  </Box>
);

export const ProgramPalette = () => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Blocks</Typography>
      <Typography variant="caption">
        What each block does. Add blocks with the buttons on each program card.
      </Typography>

      <SectionHeader label="Triggers" color={BLOCK_COLORS.trigger.main} first />
      {TRIGGER_TYPES.map((type) => (
        <BlockReference
          key={type}
          category="trigger"
          type={type}
          label={`When ${TRIGGER_LABELS[type]}`}
          testId={`palette-description-trigger-${type}`}
        />
      ))}

      <SectionHeader
        label={BLOCK_CATEGORY_LABELS.logic}
        color={BLOCK_COLORS.logic.main}
      />
      {LOGIC_TYPES.map((type) => (
        <BlockReference
          key={type}
          category="logic"
          type={type}
          label={LOGIC_LABELS[type]}
          testId={`palette-description-logic-${type}`}
        />
      ))}

      <SectionHeader
        label={BLOCK_CATEGORY_LABELS.transform}
        color={BLOCK_COLORS.transform.main}
      />
      {TRANSFORM_TYPES.map((type) => (
        <BlockReference
          key={type}
          category="transform"
          type={type}
          label={TRANSFORM_LABELS[type]}
          testId={`palette-description-transform-${type}`}
        />
      ))}

      <SectionHeader
        label={BLOCK_CATEGORY_LABELS.action}
        color={BLOCK_COLORS.action.main}
      />
      {ACTION_TYPES.map((type) => (
        <BlockReference
          key={type}
          category="action"
          type={type}
          label={ACTION_LABELS[type]}
          testId={`palette-description-action-${type}`}
        />
      ))}
    </Paper>
  );
};
