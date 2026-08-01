import React, { useEffect, useRef } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { TRIGGER_TYPES, TRIGGER_LABELS } from "../logic/flow.ts";
import {
  Flow,
  FlowNodeData,
  FlowTriggerType,
  TransformType,
} from "../interfaces/flow.ts";

interface FlowInspectorProps {
  flow: Flow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdate: (next: Flow) => void;
}

// The four flow node types, keyed by the kind of panel they render.
const TRANSFORM_TYPES: { value: TransformType; label: string }[] = [
  { value: "lowercase", label: "lowercase" },
  { value: "uppercase", label: "uppercase" },
  { value: "trim", label: "trim" },
  { value: "replace", label: "replace text" },
  { value: "extractRegex", label: "extract regex" },
];

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

// Edits the node or edge selected on the canvas. The node panel switches on
// node type (start/transform/condition/send); the edge panel is read-only and
// just labels the branch (if/else/plain).
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

  // The panel lives BELOW the 500px canvas, so on small screens it can sit
  // below the fold. When the user selects a node/edge, bring the panel into
  // view so the edit fields are actually visible (snappy scroll, no fade).
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

  const LabelField = ({ label, value }: { label: string; value: string }) => (
    <TextField
      label={label}
      size="small"
      fullWidth
      value={value}
      onChange={(e) =>
        onUpdate(updateNodeData(flow, selectedNode!.id, { label: e.target.value }))
      }
    />
  );

  if (selectedNode) {
    if (selectedNode.type === "transform") {
      const transform = selectedNode.data.transform ?? {
        type: "lowercase" as TransformType,
        find: "",
        replacement: "",
        pattern: "",
      };
      const setTransformType = (type: TransformType) => {
        onUpdate(
          updateNodeData(flow, selectedNode.id, {
            transform: { ...transform, type },
          })
        );
      };
      const setTransformField = (k: "find" | "replacement" | "pattern") => (
        e: React.ChangeEvent<HTMLInputElement>
      ) => {
        onUpdate(
          updateNodeData(flow, selectedNode.id, {
            transform: { ...transform, [k]: e.target.value },
          })
        );
      };

      return (
        <Paper ref={panelRef} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Transform Node
          </Typography>
          <LabelField label="Node label" value={selectedNode.data.label} />
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="transform-type-label">Transform type</InputLabel>
            <Select
              labelId="transform-type-label"
              label="Transform type"
              value={transform.type}
              onChange={(e) => setTransformType(e.target.value as TransformType)}
              data-testid="flow-inspector-transform-type"
            >
              {TRANSFORM_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {transform.type === "replace" && (
            <>
              <TextField
                label="Find"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                value={transform.find}
                onChange={setTransformField("find")}
              />
              <TextField
                label="Replacement"
                size="small"
                fullWidth
                sx={{ mt: 1 }}
                value={transform.replacement}
                onChange={setTransformField("replacement")}
              />
            </>
          )}
          {transform.type === "extractRegex" && (
            <TextField
              label="Pattern"
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              value={transform.pattern}
              onChange={setTransformField("pattern")}
            />
          )}
        </Paper>
      );
    }

    if (selectedNode.type === "condition") {
      const trigger = selectedNode.data.trigger ?? {
        type: "contains" as FlowTriggerType,
        value: "",
      };
      const setTriggerType = (type: FlowTriggerType) => {
        onUpdate(
          updateNodeData(flow, selectedNode.id, {
            trigger: { ...trigger, type },
          })
        );
      };
      const setTriggerValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate(
          updateNodeData(flow, selectedNode.id, {
            trigger: { ...trigger, value: e.target.value },
          })
        );
      };

      return (
        <Paper ref={panelRef} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Condition Node
          </Typography>
          <LabelField label="Node label" value={selectedNode.data.label} />
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="trigger-type-label">Trigger type</InputLabel>
            <Select
              labelId="trigger-type-label"
              label="Trigger type"
              value={trigger.type}
              onChange={(e) => setTriggerType(e.target.value as FlowTriggerType)}
              data-testid="flow-inspector-trigger-type"
            >
              {TRIGGER_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {TRIGGER_LABELS[type]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Trigger value"
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            value={trigger.value}
            onChange={setTriggerValue}
          />
        </Paper>
      );
    }

    if (selectedNode.type === "send") {
      const replies = selectedNode.data.replies ?? [];
      const updateReplies = (text: string) => {
        onUpdate(
          updateNodeData(flow, selectedNode.id, { replies: text.split("\n") })
        );
      };

      return (
        <Paper ref={panelRef} sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Send Node
          </Typography>
          <LabelField label="Node label" value={selectedNode.data.label} />
          <TextField
            label="Replies (one per line)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1 }}
            value={replies.join("\n")}
            onChange={(e) => updateReplies(e.target.value)}
          />
        </Paper>
      );
    }

    // start node: label only.
    return (
      <Paper ref={panelRef} sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Start Node
        </Typography>
        <LabelField label="Node label" value={selectedNode.data.label} />
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
    </Paper>
  );
};
