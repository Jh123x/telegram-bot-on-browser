import React from "react";
import { MenuItem, Paper, Select, TextField, Typography } from "@mui/material";
import { TRIGGER_TYPES, TRIGGER_LABELS } from "../logic/flow.ts";
import { Flow, FlowEdgeTriggerType } from "../interfaces/flow.ts";

interface FlowInspectorProps {
  flow: Flow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdate: (next: Flow) => void;
}

// All trigger kinds (the 6 message matchers) plus "fallback" = any message.
const TRIGGER_OPTIONS: FlowEdgeTriggerType[] = [...TRIGGER_TYPES, "fallback"];

// Edits the node or edge selected on the canvas. The node panel edits labels
// and per-state replies; the edge panel edits the transition trigger.
export const FlowInspector = ({
  flow,
  selectedNodeId,
  selectedEdgeId,
  onUpdate,
}: FlowInspectorProps) => {
  const selectedNode = selectedNodeId
    ? flow.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;
  const selectedEdge = selectedEdgeId
    ? flow.edges.find((e) => e.id === selectedEdgeId) ?? null
    : null;

  if (!selectedNode && !selectedEdge) {
    return (
      <Paper sx={{ p: 1.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Select a node or edge to edit it.
        </Typography>
      </Paper>
    );
  }

  if (selectedNode) {
    const isStart = selectedNode.type === "start";
    const updateLabel = (label: string) => {
      onUpdate({
        ...flow,
        nodes: flow.nodes.map((n) =>
          n.id === selectedNode.id ? { ...n, data: { ...n.data, label } } : n
        ),
      });
    };
    const updateReplies = (text: string) => {
      onUpdate({
        ...flow,
        nodes: flow.nodes.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, replies: text.split("\n") } }
            : n
        ),
      });
    };

    return (
      <Paper sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {isStart ? "Start Node" : "State Node"}
        </Typography>
        <TextField
          label="State label"
          size="small"
          fullWidth
          value={selectedNode.data.label}
          onChange={(e) => updateLabel(e.target.value)}
        />
        {!isStart && (
          <TextField
            label="Replies (one per line)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1 }}
            value={selectedNode.data.replies.join("\n")}
            onChange={(e) => updateReplies(e.target.value)}
          />
        )}
      </Paper>
    );
  }

  // Edge panel
  const trigger = selectedEdge!.data.trigger;
  const updateTrigger = (next: { type: FlowEdgeTriggerType; value: string }) => {
    onUpdate({
      ...flow,
      edges: flow.edges.map((e) =>
        e.id === selectedEdge!.id ? { ...e, data: { trigger: next } } : e
      ),
    });
  };

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Edge Trigger
      </Typography>
      <Select
        label="Trigger type"
        size="small"
        fullWidth
        value={trigger.type}
        onChange={(e) =>
          updateTrigger({ type: e.target.value as FlowEdgeTriggerType, value: trigger.value })
        }
        data-testid="flow-inspector-trigger-type"
      >
        {TRIGGER_OPTIONS.map((type) => (
          <MenuItem key={type} value={type}>
            {type === "fallback" ? "any other message" : TRIGGER_LABELS[type]}
          </MenuItem>
        ))}
      </Select>
      {trigger.type !== "fallback" && (
        <TextField
          label="Trigger value"
          size="small"
          fullWidth
          sx={{ mt: 1 }}
          value={trigger.value}
          onChange={(e) => updateTrigger({ type: trigger.type, value: e.target.value })}
        />
      )}
    </Paper>
  );
};
