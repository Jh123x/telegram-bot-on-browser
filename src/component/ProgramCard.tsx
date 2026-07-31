import React from "react";
import {
  Button,
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
} from "../logic/program.ts";
import { BotWithConfig } from "../redux/types.ts";

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

interface ProgramCardProps {
  program: Program;
  index: number;
  total: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

interface BlockRowProps {
  block: Block;
  blockIndex: number;
  onChange: (id: string, patch: Partial<Block>) => void;
  onKindChange: (id: string, kind: Block["kind"]) => void;
  onDelete: (id: string) => void;
}

const BlockRow = ({
  block,
  blockIndex,
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
          </>
        );
      }
      return <Typography variant="body2">(no value needed)</Typography>;
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
    return <Typography variant="body2">(the user's message)</Typography>;
  };

  return (
    <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ minWidth: 70 }}>
        {BLOCK_CATEGORY_LABELS[block.category]}
      </Typography>
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
        display="flex"
        alignItems="center"
        gap={1}
        sx={{ mb: 2 }}
        data-testid={`trigger-zone-${current.id}`}
      >
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
      </Box>

      <Box data-testid={`blocks-zone-${current.id}`}>
        <Typography sx={{ mb: 1 }}>Then</Typography>
        {current.blocks.length === 0 ? (
          <Typography variant="body2" sx={{ mb: 1 }}>
            No blocks yet — drag a logic, transform or action block here or
            click add below.
          </Typography>
        ) : (
          current.blocks.map((block, i) => (
            <BlockRow
              key={block.id}
              block={block}
              blockIndex={i + 1}
              onChange={changeBlockValue}
              onKindChange={changeBlockKind}
              onDelete={deleteBlock}
            />
          ))
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
