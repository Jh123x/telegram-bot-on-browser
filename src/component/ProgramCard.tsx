import React, { Fragment, useState } from "react";
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
import { useDispatch } from "react-redux";
import { updateProgram, removeProgram } from "../redux/botSlice.ts";
import {
  Block,
  Program,
  TriggerType,
} from "../interfaces/program.ts";
import {
  ACTION_LABELS,
  ACTION_TYPES,
  BLOCK_CATEGORY_LABELS,
  LOGIC_LABELS,
  LOGIC_TYPES,
  TRIGGER_LABELS,
  TRIGGER_TYPES,
  TRANSFORM_LABELS,
  TRANSFORM_TYPES,
  createBlock,
  computeFlowPreview,
  NodeHint,
  moveBlock,
  moveBlockToIndex,
} from "../logic/program.ts";
import { BLOCK_COLORS } from "../theme.ts";
import { Port, Connector, HintChip } from "./pipeline.tsx";
import { BlockValueInputs } from "./BlockValueInputs.tsx";

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
  hint?: NodeHint;
  echoPreview?: string;
  isFirst: boolean;
  isLast: boolean;
  onChange: (id: string, patch: Partial<Block>) => void;
  onKindChange: (id: string, kind: Block["kind"]) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

const BlockRow = ({
  block,
  blockIndex,
  hint,
  echoPreview,
  isFirst,
  isLast,
  onChange,
  onKindChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
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

  return (
    <Box
      sx={{
        mb: 1,
        opacity: isDragging ? 0.5 : 1,
        bgcolor: isOver ? "action.selected" : "transparent",
        borderRadius: 1,
      }}
      data-testid={`block-row-${block.id}`}
      onDragOver={(e) => onDragOver(e, block.id)}
      onDrop={(e) => onDrop(e, block.id)}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <IconButton
          aria-label="Drag to reorder"
          draggable
          data-testid={`block-drag-handle-${block.id}`}
          onDragStart={(e) => onDragStart(e, block.id)}
          onDragEnd={onDragEnd}
          sx={{
            minWidth: 32,
            p: 0.5,
            color: "text.secondary",
            cursor: "grab",
            userSelect: "none",
          }}
        >
          ⠿
        </IconButton>
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
        <BlockValueInputs
          block={block}
          onChange={onChange}
          echoPreview={echoPreview}
        />
        <IconButton
          aria-label="Move block up"
          disabled={isFirst}
          onClick={() => onMoveUp(block.id)}
        >
          ↑
        </IconButton>
        <IconButton
          aria-label="Move block down"
          disabled={isLast}
          onClick={() => onMoveDown(block.id)}
        >
          ↓
        </IconButton>
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
  const current: Program = program;
  const update = (patch: Partial<Program>) =>
    dispatch(updateProgram({ ...current, ...patch }));

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
  const moveBlockUp = (id: string) =>
    update({ blocks: moveBlock(current.blocks, id, -1) });
  const moveBlockDown = (id: string) =>
    update({ blocks: moveBlock(current.blocks, id, 1) });

  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [overBlockId, setOverBlockId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ blockId: id }));
    e.dataTransfer.effectAllowed = "move";
    setDraggedBlockId(id);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverBlockId(id);
  };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setOverBlockId(null);
    setDraggedBlockId(null);
    let draggedId = "";
    try {
      draggedId = JSON.parse(e.dataTransfer.getData("text/plain")).blockId ?? "";
    } catch {
      return;
    }
    if (!draggedId || draggedId === targetId) return;
    const targetIndex = current.blocks.findIndex((b) => b.id === targetId);
    if (targetIndex === -1) return;
    update({ blocks: moveBlockToIndex(current.blocks, draggedId, targetIndex) });
  };
  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setOverBlockId(null);
  };

  // Live preview of the value that flows out of each node, computed from the
  // default "Hello World" user message.
  const { hints, flowingByBlock } = computeFlowPreview(current.blocks);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, mb: 2 }}
      data-testid={`program-card-${current.name}`}
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
            No blocks yet — use the buttons below to add logic, transform and
            action blocks.
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
                  isFirst={i === 0}
                  isLast={i === current.blocks.length - 1}
                  hint={hints.get(block.id)}
                  echoPreview={flowingByBlock.get(block.id)}
                  onChange={changeBlockValue}
                  onKindChange={changeBlockKind}
                  onDelete={deleteBlock}
                  onMoveUp={moveBlockUp}
                  onMoveDown={moveBlockDown}
                  isDragging={draggedBlockId === block.id}
                  isOver={overBlockId === block.id}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
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
