import React, { Fragment } from "react";
import {
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { updateProgram, removeProgram } from "../redux/botSlice.ts";
import {
  ActionType,
  Block,
  BlockCategory,
  LogicType,
  Program,
  TransformType,
  TriggerType,
} from "../interfaces/program.ts";
import {
  ACTION_LABELS,
  BLOCK_CATEGORY_LABELS,
  LOGIC_LABELS,
  TRIGGER_LABELS,
  TRANSFORM_LABELS,
  createBlock,
  transformPreview,
} from "../logic/program.ts";
import { BotWithConfig } from "../redux/types.ts";
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
  "concat",
];
const ACTION_TYPES: ActionType[] = ["reply", "random", "echo"];

interface ProgramCardProps {
  program: Program;
  index: number;
  total: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

// A hint describing what value/label flows out of a node in the pipeline.
type NodeHint =
  | { category: "transform"; text: string; outputVar?: string }
  | { category: "logic"; fallback: string }
  | { category: "action"; text: string };

interface BlockRowProps {
  block: Block;
  blockIndex: number;
  hint?: NodeHint;
  echoPreview?: string;
  onChange: (id: string, patch: Partial<Block>) => void;
  onKindChange: (id: string, kind: Block["kind"]) => void;
  onDelete: (id: string) => void;
}

// Round input/output port marker for a pipeline node.
const Port = ({
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
const Connector = ({ color }: { color: string }) => (
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
const HintChip = ({ hint }: { hint: NodeHint }) => {
  if (hint.category === "transform") {
    const label =
      hint.outputVar && hint.outputVar !== ""
        ? `{${hint.outputVar}} = ${hint.text}`
        : hint.text;
    return (
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

const BlockRow = ({
  block,
  blockIndex,
  hint,
  echoPreview,
  onChange,
  onKindChange,
  onDelete,
}: BlockRowProps) => {
  const renderKindOptions = () => {
    switch (block.category) {
      case "logic":
        return LOGIC_TYPES.map((t) => (
          <MenuItem key={t} value={t}>
            {LOGIC_LABELS[t]}
          </MenuItem>
        ));
      case "transform":
        return TRANSFORM_TYPES.map((t) => (
          <MenuItem key={t} value={t}>
            {TRANSFORM_LABELS[t]}
          </MenuItem>
        ));
      default:
        return ACTION_TYPES.map((t) => (
          <MenuItem key={t} value={t}>
            {ACTION_LABELS[t]}
          </MenuItem>
        ));
    }
  };

  const renderValueInputs = () => {
    if (block.category === "logic") {
      return (
        <>
          {block.kind === "lengthGreater" || block.kind === "lengthLess" ? (
            <TextField
              size="small"
              label="Number"
              value={block.value}
              onChange={(e) => onChange(block.id, { value: e.target.value })}
            />
          ) : (
            <TextField
              size="small"
              label="Regex"
              value={block.value}
              onChange={(e) => onChange(block.id, { value: e.target.value })}
            />
          )}
          <TextField
            size="small"
            label="Else reply (optional)"
            value={block.fallback}
            onChange={(e) => onChange(block.id, { fallback: e.target.value })}
          />
        </>
      );
    }
    if (block.category === "transform") {
      const variableField = (
        <TextField
          size="small"
          label="Variable name (optional)"
          value={block.outputVar ?? ""}
          onChange={(e) => onChange(block.id, { outputVar: e.target.value })}
        />
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

  return (
    <Box sx={{ mb: 1 }}>
      <Box display="flex" alignItems="center" gap={1}>
        <Port
          testId={`block-input-${block.id}`}
          color={BLOCK_COLORS[block.category].main}
          label="in"
        />
        <Typography
          variant="body2"
          sx={{ minWidth: 20, color: "text.secondary" }}
        >
          {blockIndex}.
        </Typography>
        <Chip
          size="small"
          label={BLOCK_CATEGORY_LABELS[block.category]}
          sx={{
            bgcolor: BLOCK_COLORS[block.category].bg,
            color: BLOCK_COLORS[block.category].main,
            fontWeight: 600,
          }}
        />
        <Select
          size="small"
          value={block.kind}
          onChange={(e) => onKindChange(block.id, e.target.value as Block["kind"])}
        >
          {renderKindOptions()}
        </Select>
        {renderValueInputs()}
        <IconButton aria-label="Delete block" onClick={() => onDelete(block.id)}>
          ✕
        </IconButton>
        <Port
          testId={`block-output-${block.id}`}
          color={BLOCK_COLORS[block.category].main}
          label="out"
        />
      </Box>
      {hint && (
        <Box sx={{ ml: 6, mt: 0.5 }} data-testid={`value-hint-${block.id}`}>
          <HintChip hint={hint} />
        </Box>
      )}
    </Box>
  );
};

export const ProgramCard = ({
  program,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: ProgramCardProps) => {
  const dispatch = useDispatch();
  const live = useSelector<BotWithConfig, Program | undefined>(
    (state) => state.bot.programs.find((p) => p.id === program.id)
  );
  const current: Program = live ?? program;
  const update = (patch: Partial<Program>) =>
    dispatch(updateProgram({ ...current, ...patch }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    let payload: { kind: string; type: string; category?: string };
    try {
      payload = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    if (payload.kind === "trigger") {
      update({
        trigger: { ...current.trigger, type: payload.type as TriggerType },
      });
    } else if (payload.kind === "block") {
      const category = payload.category as BlockCategory;
      const type = payload.type as LogicType | TransformType | ActionType;
      update({ blocks: [...current.blocks, createBlock(category, type)] });
    }
  };

  const changeBlockValue = (id: string, patch: Partial<Block>) =>
    update({
      blocks: current.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  const changeBlockKind = (id: string, kind: Block["kind"]) =>
    update({
      blocks: current.blocks.map((b) =>
        b.id === id ? { ...b, kind, value: "", value2: "", fallback: "" } : b
      ),
    });
  const deleteBlock = (id: string) =>
    update({ blocks: current.blocks.filter((b) => b.id !== id) });

  // Compute the value that flows out of each node (a live preview of the
  // pipeline using the default "Hello World" user message).
  const hints = new Map<string, NodeHint>();
  const flowingByBlock = new Map<string, string>();
  let flowing = "Hello World";
  for (const b of current.blocks) {
    flowingByBlock.set(b.id, flowing);
    if (b.category === "transform") {
      flowing = transformPreview(b, flowing);
      hints.set(b.id, {
        category: "transform",
        text: flowing,
        outputVar: b.outputVar,
      });
    } else if (b.category === "logic") {
      hints.set(b.id, { category: "logic", fallback: b.fallback });
    } else {
      let text: string;
      if (b.kind === "reply") {
        text = `reply: ${b.value || "(empty)"}`;
      } else if (b.kind === "random") {
        const opts = b.value
          .split("\n")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
        text =
          opts.length > 0
            ? `random: ${opts.map((o) => `"${o}"`).join(", ")}`
            : "random: (no options)";
      } else {
        text = `echo: ${flowing}`;
      }
      hints.set(b.id, { category: "action", text });
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 2 }}
      data-testid={`program-card-${current.name}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <TextField
          label="Program name"
          value={current.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <IconButton
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMoveUp(current.id)}
        >
          ↑
        </IconButton>
        <IconButton
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMoveDown(current.id)}
        >
          ↓
        </IconButton>
        <Button
          variant="contained"
          color="error"
          onClick={() => dispatch(removeProgram(current.id))}
        >
          Delete Program
        </Button>
      </Box>

      <Box
        data-testid={`trigger-zone-${current.id}`}
        sx={{ mb: 2 }}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ border: 1, borderColor: BLOCK_COLORS.trigger.main, borderRadius: 1.5, p: 1 }}
        >
          <Port
            testId={`trigger-input-${current.id}`}
            color={BLOCK_COLORS.trigger.main}
            label="user message"
          />
          <Chip
            size="small"
            label="message"
            sx={{
              bgcolor: BLOCK_COLORS.trigger.bg,
              color: BLOCK_COLORS.trigger.main,
            }}
          />
          <Typography>When</Typography>
          <Select
            value={current.trigger.type}
            onChange={(e) =>
              update({
                trigger: { ...current.trigger, type: e.target.value as TriggerType },
              })
            }
          >
            {TRIGGER_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </MenuItem>
            ))}
          </Select>
          <TextField
            label="Trigger value"
            value={current.trigger.value}
            onChange={(e) =>
              update({ trigger: { ...current.trigger, value: e.target.value } })
            }
          />
          <Port
            testId={`trigger-output-${current.id}`}
            color={BLOCK_COLORS.trigger.main}
            label="out"
          />
        </Box>
      </Box>

      <Box data-testid={`blocks-zone-${current.id}`}>
        <Typography sx={{ mb: 1 }}>Then</Typography>
        {current.blocks.length === 0 ? (
          <Typography variant="body2" sx={{ mb: 1 }}>
            No blocks yet — drag a logic, transform or action block here or
            click add below.
          </Typography>
        ) : (
          <Box data-testid={`pipeline-${current.id}`} sx={{ mb: 1 }}>
            {current.blocks.map((block, i) => (
              <Fragment key={block.id}>
                <Connector
                  color={BLOCK_COLORS[block.category].main}
                />
                <BlockRow
                  block={block}
                  blockIndex={i + 1}
                  hint={hints.get(block.id)}
                  echoPreview={flowingByBlock.get(block.id)}
                  onChange={changeBlockValue}
                  onKindChange={changeBlockKind}
                  onDelete={deleteBlock}
                />
              </Fragment>
            ))}
          </Box>
        )}
        <Box display="flex" gap={1} sx={{ mt: 1 }}>
          <Button
            size="small"
            onClick={() =>
              update({ blocks: [...current.blocks, createBlock("logic", "lengthGreater")] })
            }
          >
            Add logic
          </Button>
          <Button
            size="small"
            onClick={() =>
              update({ blocks: [...current.blocks, createBlock("transform", "uppercase")] })
            }
          >
            Add transform
          </Button>
          <Button
            size="small"
            onClick={() =>
              update({ blocks: [...current.blocks, createBlock("action", "reply")] })
            }
          >
            Add reply
          </Button>
          <Button
            size="small"
            onClick={() =>
              update({ blocks: [...current.blocks, createBlock("action", "random")] })
            }
          >
            Add random
          </Button>
          <Button
            size="small"
            onClick={() =>
              update({ blocks: [...current.blocks, createBlock("action", "echo")] })
            }
          >
            Add echo
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
