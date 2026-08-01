import React from "react";
import { TextField, Tooltip, Typography } from "@mui/material";
import { Block } from "../interfaces/program.ts";

interface BlockValueInputsProps {
  block: Block;
  onChange: (id: string, patch: Partial<Block>) => void;
  echoPreview?: string;
}

// Logic kinds that compare the message against a text value.
const CONTENT_MATCH_KINDS = new Set([
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
  "notStartsWith",
  "notEndsWith",
]);

export const BlockValueInputs = ({
  block,
  onChange,
  echoPreview,
}: BlockValueInputsProps) => {
  if (block.category === "logic") {
    let valueInput: React.ReactNode;
    if (
      block.kind === "lengthGreater" ||
      block.kind === "lengthLess" ||
      block.kind === "lengthEquals" ||
      block.kind === "notLengthGreater" ||
      block.kind === "notLengthLess" ||
      block.kind === "notLengthEquals"
    ) {
      valueInput = (
        <TextField
          size="small"
          label="Number"
          value={block.value}
          onChange={(e) => onChange(block.id, { value: e.target.value })}
        />
      );
    } else if (
      block.kind === "matchesRegex" ||
      block.kind === "notMatchesRegex"
    ) {
      valueInput = (
        <TextField
          size="small"
          label="Regex"
          value={block.value}
          onChange={(e) => onChange(block.id, { value: e.target.value })}
        />
      );
    } else if (CONTENT_MATCH_KINDS.has(block.kind)) {
      valueInput = (
        <TextField
          size="small"
          label="Value"
          value={block.value}
          onChange={(e) => onChange(block.id, { value: e.target.value })}
        />
      );
    } else {
      // isNumber / notIsNumber need no value input.
      valueInput = <Typography variant="body2">(no value needed)</Typography>;
    }
    return (
      <>
        {valueInput}
        <TextField
          size="small"
          label="Else reply (optional)"
          value={block.fallback}
          onChange={(e) => onChange(block.id, { fallback: e.target.value })}
          multiline
          minRows={2}
          maxRows={4}
          sx={{ minWidth: 260 }}
        />
      </>
    );
  }
  if (block.category === "transform") {
    const variableField = (
      <Tooltip
        title={
          "Save this block's output as a variable. Use {name} in any later " +
          'reply, random option, or fallback — e.g. "You said: {name}". ' +
          "{prev} always means the current message."
        }
        enterDelay={0}
      >
        <TextField
          size="small"
          label="Variable name (optional)"
          value={block.outputVar ?? ""}
          onChange={(e) => onChange(block.id, { outputVar: e.target.value })}
        />
      </Tooltip>
    );
    if (block.kind === "replace") {
      return (
        <>
          <TextField
            size="small"
            label="Find"
            value={block.value}
            onChange={(e) => onChange(block.id, { value: e.target.value })}
          />
          <TextField
            size="small"
            label="Replace with"
            value={block.value2}
            onChange={(e) => onChange(block.id, { value2: e.target.value })}
          />
          {variableField}
        </>
      );
    }
    if (block.kind === "concat") {
      return (
        <>
          <TextField
            size="small"
            label="Prepend text"
            value={block.value2}
            onChange={(e) => onChange(block.id, { value2: e.target.value })}
          />
          <TextField
            size="small"
            label="Append text"
            value={block.value}
            onChange={(e) => onChange(block.id, { value: e.target.value })}
          />
          {variableField}
        </>
      );
    }
    if (block.kind === "remove") {
      return (
        <>
          <TextField
            size="small"
            label="Remove text"
            value={block.value}
            onChange={(e) => onChange(block.id, { value: e.target.value })}
          />
          {variableField}
        </>
      );
    }
    return (
      <>
        <Typography variant="body2">(no value needed)</Typography>
        {variableField}
      </>
    );
  }
  // action
  if (block.kind === "reply") {
    return (
      <TextField
        size="small"
        label="Response"
        value={block.value}
        onChange={(e) => onChange(block.id, { value: e.target.value })}
        multiline
        minRows={2}
        maxRows={4}
        sx={{ minWidth: 260 }}
      />
    );
  }
  if (block.kind === "random") {
    return (
      <TextField
        size="small"
        label="One option per line"
        value={block.value}
        multiline
        onChange={(e) => onChange(block.id, { value: e.target.value })}
      />
    );
  }
  return (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      Echoes: "{echoPreview ?? ""}"
    </Typography>
  );
};
