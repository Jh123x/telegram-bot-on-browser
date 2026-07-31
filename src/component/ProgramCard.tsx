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
  Action,
  ActionType,
  Program,
  TriggerType,
} from "../interfaces/program.ts";
import { ACTION_LABELS, TRIGGER_LABELS, createAction } from "../logic/program.ts";
import { BotWithConfig } from "../redux/types.ts";

const TRIGGER_TYPES: TriggerType[] = ["equals", "contains", "startsWith"];
const ACTION_TYPES: ActionType[] = ["reply", "random", "echo"];

interface ProgramCardProps {
  program: Program;
  index: number;
  total: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

interface ActionRowProps {
  action: Action;
  actionIndex: number;
  onChange: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}

const ActionRow = ({ action, actionIndex, onChange, onDelete }: ActionRowProps) => (
  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }} key={action.id}>
    <Typography sx={{ minWidth: 140 }}>{ACTION_LABELS[action.type]}</Typography>
    {action.type === "echo" ? (
      <Typography variant="body2">(the user's message)</Typography>
    ) : (
      <TextField
        size="small"
        label={action.type === "reply" ? "Response" : "One option per line"}
        value={action.value}
        multiline={action.type === "random"}
        onChange={(e) => onChange(action.id, e.target.value)}
      />
    )}
    <IconButton
      aria-label={`Delete action ${actionIndex}`}
      onClick={() => onDelete(action.id)}
    >
      ✕
    </IconButton>
  </Box>
);

export const ProgramCard = ({ program, index, total, onMoveUp, onMoveDown }: ProgramCardProps) => {
  const dispatch = useDispatch();
  const live = useSelector<BotWithConfig, Program | undefined>(
    (state) => state.bot.programs.find((p) => p.id === program.id)
  );
  const current: Program = live ?? program;
  const update = (patch: Partial<Program>) =>
    dispatch(updateProgram({ ...current, ...patch }));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    let payload: { kind: string; type: string };
    try {
      payload = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    if (payload.kind === "trigger") {
      update({ trigger: { ...current.trigger, type: payload.type as TriggerType } });
    } else if (payload.kind === "action") {
      update({ actions: [...current.actions, createAction(payload.type as ActionType)] });
    }
  };

  const changeActionValue = (id: string, value: string) =>
    update({ actions: current.actions.map((a) => (a.id === id ? { ...a, value } : a)) });
  const deleteAction = (id: string) =>
    update({ actions: current.actions.filter((a) => a.id !== id) });

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
        <IconButton aria-label="Move up" disabled={index === 0} onClick={() => onMoveUp(current.id)}>
          ↑
        </IconButton>
        <IconButton
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMoveDown(current.id)}
        >
          ↓
        </IconButton>
        <Button variant="contained" color="error" onClick={() => dispatch(removeProgram(current.id))}>
          Delete Program
        </Button>
      </Box>

      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }} data-testid={`trigger-zone-${current.id}`}>
        <Typography>When</Typography>
        <Select
          value={current.trigger.type}
          onChange={(e) =>
            update({ trigger: { ...current.trigger, type: e.target.value as TriggerType } })
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
          onChange={(e) => update({ trigger: { ...current.trigger, value: e.target.value } })}
        />
      </Box>

      <Box data-testid={`actions-zone-${current.id}`}>
        <Typography sx={{ mb: 1 }}>Then reply</Typography>
        {current.actions.length === 0 ? (
          <Typography variant="body2" sx={{ mb: 1 }}>
            No actions yet — drag an action block here or click add below.
          </Typography>
        ) : (
          current.actions.map((action, i) => (
            <ActionRow
              key={action.id}
              action={action}
              actionIndex={i + 1}
              onChange={changeActionValue}
              onDelete={deleteAction}
            />
          ))
        )}
        <Box display="flex" gap={1} sx={{ mt: 1 }}>
          {ACTION_TYPES.map((t) => (
            <Button
              key={t}
              size="small"
              onClick={() => update({ actions: [...current.actions, createAction(t)] })}
            >
              Add {t}
            </Button>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
