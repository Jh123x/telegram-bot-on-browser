import React from "react";
import { Chip, Tooltip, Typography, Box } from "@mui/material";
import { NodeHint } from "../logic/program.ts";
import { BLOCK_COLORS } from "../theme.ts";

// Round input/output port marker for a pipeline node.
export const Port = ({
  testId,
  color,
  label,
}: {
  testId: string;
  color: string;
  label?: string;
}) => (
  <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
    <Box
      data-testid={testId}
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        bgcolor: "background.paper",
        flexShrink: 0,
      }}
    />
    {label && (
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", fontSize: 10, lineHeight: 1 }}
      >
        {label}
      </Typography>
    )}
  </Box>
);

// Vertical connector line showing the message flowing between nodes.
export const Connector = ({ color }: { color: string }) => (
  <Box
    sx={{
      width: 2,
      height: 14,
      bgcolor: color,
      margin: "0 auto",
      opacity: 0.6,
    }}
  />
);

// Small chip showing the flowing value / gate / reply shape for a node.
export const HintChip = ({ hint }: { hint: NodeHint }) => {
  if (hint.category === "transform") {
    const label =
      hint.outputVar && hint.outputVar !== ""
        ? `{${hint.outputVar}} = ${hint.text}`
        : hint.text;
    const chip = (
      <Chip
        size="small"
        label={label}
        sx={{
          bgcolor: BLOCK_COLORS.transform.bg,
          color: BLOCK_COLORS.transform.main,
          fontFamily: "monospace",
        }}
      />
    );
    if (hint.outputVar && hint.outputVar !== "") {
      return (
        <Tooltip
          title={`Saved as {${hint.outputVar}}. Use {${hint.outputVar}} in any later reply, random option, or fallback.`}
          enterDelay={0}
        >
          {chip}
        </Tooltip>
      );
    }
    return chip;
  }
  if (hint.category === "logic") {
    const label = hint.fallback ? `else → ${hint.fallback}` : "else → silent";
    return (
      <Chip
        size="small"
        label={label}
        sx={{ bgcolor: BLOCK_COLORS.logic.bg, color: BLOCK_COLORS.logic.main }}
      />
    );
  }
  return (
    <Chip
      size="small"
      label={hint.text}
      sx={{ bgcolor: BLOCK_COLORS.action.bg, color: BLOCK_COLORS.action.main }}
    />
  );
};
