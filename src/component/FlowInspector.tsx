import React, { useEffect, useRef } from "react";
import { Button, Paper, TextField, Typography } from "@mui/material";
import { nodeCategory } from "../logic/flow.ts";
import {
  Flow,
  FlowNodeData,
  FlowTriggerType,
  TransformNodeType,
} from "../interfaces/flow.ts";

interface FlowInspectorProps {
  flow: Flow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdate: (next: Flow) => void;
  onDelete?: () => void;
}

// Deep-merge helper that replaces just the selected node's data while keeping
// every other node/field byte-for-byte identical.
const updateNodeData = (
  flow: Flow,
  nodeId: string,
  patch: Partial<FlowNodeData>
): Flow => ({
  ...flow,
  nodes: flow.nodes.map((n) =>
    n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
  ),
});

// Module-level components ONLY. A component defined inside the render body
// gets a fresh identity every render, so React unmounts/remounts the field on
// each keystroke and the input loses focus (the "label deselects itself"
// bug). Hoisting keeps the identity stable and the DOM node alive.

interface LabelFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const LabelField = ({ value, onChange }: LabelFieldProps) => (
  <TextField
    label="Node label"
    size="small"
    fullWidth
    value={value}
    onChange={(e) => onChange(e.target.value)}
  />
);

const DeleteButton = ({ label, onDelete }: { label: string; onDelete: () => void }) => (
  <Button
    data-testid="flow-inspector-delete"
    variant="outlined"
    color="error"
    size="small"
    fullWidth
    sx={{ mt: 1.5 }}
    onClick={onDelete}
  >
    {label}
  </Button>
);

// Edits the node or edge selected on the canvas. The node panel switches on
// node category (start/transform/condition/send) and, within a category, on
// the concrete node type — every operation is its own node type now, so there
// are no per-node type selectors, only the value fields the type needs.
// The edge panel is read-only and just labels the branch (if/else/plain).
export const FlowInspector = ({
  flow,
  selectedNodeId,
  selectedEdgeId,
  onUpdate,
  onDelete,
}: FlowInspectorProps) => {
  const selectedNode = selectedNodeId
    ? flow.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;
  const selectedEdge = selectedEdgeId
    ? flow.edges.find((e) => e.id === selectedEdgeId) ?? null
    : null;

  // The panel lives beside the canvas; on small screens it can sit below the
  // fold. When the user selects a node/edge, bring the panel into view so the
  // edit fields are actually visible (snappy scroll, no fade).
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selectedNodeId && !selectedEdgeId) return;
    // Optional-call: jsdom has no scrollIntoView; browsers do.
    panelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [selectedNodeId, selectedEdgeId]);

  if (!selectedNode && !selectedEdge) {
    return (
      <Paper ref={panelRef} sx={{ p: 1.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Select a node or edge to edit it.
        </Typography>
      </Paper>
    );
  }

  const setNodeData = (patch: Partial<FlowNodeData>) => {
    onUpdate(updateNodeData(flow, selectedNode!.id, patch));
  };

  if (selectedNode) {
    const category = nodeCategory(selectedNode.type);

    if (category === "start") {
      return (
        <Paper ref={panelRef} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Start Node
          </Typography>
          <LabelField
            value={selectedNode.data.label}
            onChange={(label) => setNodeData({ label })}
          />
          {onDelete && <DeleteButton label="Delete node" onDelete={onDelete} />}
        </Paper>
      );
    }

    if (category === "transform") {
      const type = selectedNode.type as TransformNodeType;
      return (
        <Paper ref={panelRef} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Transform Node
          </Typography>
          <LabelField
            value={selectedNode.data.label}
            onChange={(label) => setNodeData({ label })}
          />
          {type === "replace" && (
            <>
              <TextField
                label="Find"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                value={selectedNode.data.find ?? ""}
                onChange={(e) => setNodeData({ find: e.target.value })}
              />
              <TextField
                label="Replacement"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                value={selectedNode.data.replacement ?? ""}
                onChange={(e) => setNodeData({ replacement: e.target.value })}
              />
            </>
          )}
          {type === "extractRegex" && (
            <TextField
              label="Pattern"
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              value={selectedNode.data.pattern ?? ""}
              onChange={(e) => setNodeData({ pattern: e.target.value })}
            />
          )}
          {type === "randomNumber" && (
            <>
              <TextField
                label="Min"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                value={selectedNode.data.min ?? ""}
                onChange={(e) => setNodeData({ min: e.target.value })}
              />
              <TextField
                label="Max"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                value={selectedNode.data.max ?? ""}
                onChange={(e) => setNodeData({ max: e.target.value })}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                Picks a random whole number between Min and Max (inclusive).
              </Typography>
            </>
          )}
          {onDelete && <DeleteButton label="Delete node" onDelete={onDelete} />}
        </Paper>
      );
    }

    if (category === "condition") {
      const type = selectedNode.type as FlowTriggerType;
      return (
        <Paper ref={panelRef} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Condition Node
          </Typography>
          <LabelField
            value={selectedNode.data.label}
            onChange={(label) => setNodeData({ label })}
          />
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
            {type}
          </Typography>
          <TextField
            label="Trigger value"
            size="small"
            fullWidth
            sx={{ mt: 0.5 }}
            value={selectedNode.data.value ?? ""}
            onChange={(e) => setNodeData({ value: e.target.value })}
          />
          {onDelete && <DeleteButton label="Delete node" onDelete={onDelete} />}
        </Paper>
      );
    }

    // send category (send / random)
    if (selectedNode.type === "poll") {
      return (
        <Paper ref={panelRef} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Poll Node
          </Typography>
          <LabelField
            value={selectedNode.data.label}
            onChange={(label) => setNodeData({ label })}
          />
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", mt: 1 }}
          >
            Parses /poll &lt;title&gt; option1, option2, option3 from the message.
          </Typography>
          {onDelete && <DeleteButton label="Delete node" onDelete={onDelete} />}
        </Paper>
      );
    }

    const isRandom = selectedNode.type === "random";
    const replies = selectedNode.data.replies ?? [];
    return (
      <Paper ref={panelRef} sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {isRandom ? "Random Node" : "Send Node"}
        </Typography>
        <LabelField
          value={selectedNode.data.label}
          onChange={(label) => setNodeData({ label })}
        />
        <TextField
          label={isRandom ? "Options (one per line)" : "Replies (one per line)"}
          size="small"
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 1 }}
          value={replies.join("\n")}
          onChange={(e) => setNodeData({ replies: e.target.value.split("\n") })}
        />
        {isRandom && (
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
            Sends one of these lines, chosen at random.
          </Typography>
        )}
        {onDelete && <DeleteButton label="Delete node" onDelete={onDelete} />}
      </Paper>
    );
  }

  // Edge panel: read-only caption describing the branch.
  const caption =
    selectedEdge!.sourceHandle === "if"
      ? "If branch (condition true)"
      : selectedEdge!.sourceHandle === "else"
      ? "Else branch (condition false)"
      : "Connection";

  return (
    <Paper ref={panelRef} sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Edge
      </Typography>
      <Typography variant="body2" data-testid="flow-inspector-edge-caption">
        {caption}
      </Typography>
      {onDelete && <DeleteButton label="Delete edge" onDelete={onDelete} />}
    </Paper>
  );
};
