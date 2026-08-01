import React, { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import {
  BlockCategory,
} from "../interfaces/program.ts";
import {
  ACTION_LABELS,
  ACTION_TYPES,
  BLOCK_CATEGORY_LABELS,
  BLOCK_DESCRIPTIONS,
  LOGIC_LABELS,
  LOGIC_TYPES,
  TRIGGER_LABELS,
  TRIGGER_TYPES,
  TRANSFORM_LABELS,
  TRANSFORM_TYPES,
} from "../logic/program.ts";
import { BLOCK_COLORS } from "../theme.ts";

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

// A section of the block reference rendered as a small table. Each row pairs
// the existing block label with a short plain description of what it does.
const SectionTable = ({
  category,
  rows,
  testId,
}: {
  category: BlockCategory | "trigger";
  rows: { type: string; label: string }[];
  testId: string;
}) => (
  <TableContainer
    component={Paper}
    variant="outlined"
    sx={{ mt: 1 }}
    data-testid={testId}
  >
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600 }}>Block Type</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(({ type, label }) => (
          <TableRow key={type} hover>
            <TableCell>{label}</TableCell>
            <TableCell data-testid={`palette-description-${category}-${type}`}>
              {BLOCK_DESCRIPTIONS[category][type]}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export const ProgramPalette = () => {
  const [open, setOpen] = useState(true);

  const triggerRows = TRIGGER_TYPES.map((type) => ({
    type,
    label: `When ${TRIGGER_LABELS[type]}`,
  }));
  const logicRows = LOGIC_TYPES.map((type) => ({
    type,
    label: LOGIC_LABELS[type],
  }));
  const transformRows = TRANSFORM_TYPES.map((type) => ({
    type,
    label: TRANSFORM_LABELS[type],
  }));
  const actionRows = ACTION_TYPES.map((type) => ({
    type,
    label: ACTION_LABELS[type],
  }));

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Blocks</Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Typography variant="caption">
          What each block does. Add blocks with the buttons on each program card.
        </Typography>
        <Button
          size="small"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="palette-collapse"
          data-testid="palette-toggle"
        >
          {open ? "Hide block reference" : "Show block reference"}
        </Button>
      </Box>

      <Collapse in={open} id="palette-collapse" data-testid="palette-collapse">
        <SectionHeader label="Triggers" color={BLOCK_COLORS.trigger.main} first />
        <SectionTable
          category="trigger"
          rows={triggerRows}
          testId="palette-table-trigger"
        />

        <SectionHeader
          label={BLOCK_CATEGORY_LABELS.logic}
          color={BLOCK_COLORS.logic.main}
        />
        <SectionTable
          category="logic"
          rows={logicRows}
          testId="palette-table-logic"
        />

        <SectionHeader
          label={BLOCK_CATEGORY_LABELS.transform}
          color={BLOCK_COLORS.transform.main}
        />
        <SectionTable
          category="transform"
          rows={transformRows}
          testId="palette-table-transform"
        />

        <SectionHeader
          label={BLOCK_CATEGORY_LABELS.action}
          color={BLOCK_COLORS.action.main}
        />
        <SectionTable
          category="action"
          rows={actionRows}
          testId="palette-table-action"
        />
      </Collapse>
    </Paper>
  );
};
