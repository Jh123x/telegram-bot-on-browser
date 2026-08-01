import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Button, TextField, Typography } from "@mui/material";
import { FlowPalette } from "./FlowPalette.tsx";
import { FlowSamples } from "./FlowSamples.tsx";
import { FlowInspector } from "./FlowInspector.tsx";
import {
  createFlow,
  createFlowNode,
  flowEdgeLabel,
  validateFlow,
} from "../logic/flow.ts";
import { generateId } from "../logic/program.ts";
import { addFlow, removeFlow, updateFlow } from "../redux/botSlice.ts";
import { BotWithConfig } from "../redux/types.ts";
import { Flow, FlowEdge } from "../interfaces/flow.ts";
import { StartNode, StateNode } from "./flowNodes.tsx";

// Canvas node renderers keyed by the FlowNodeType. Passed to <ReactFlow> so
// each flow node renders as its dedicated MUI card.
const nodeTypes = { start: StartNode, state: StateNode };

const EditorCanvas = ({ flow }: { flow: Flow }) => {
  const dispatch = useDispatch();
  const { screenToFlowPosition } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Derive React Flow's node/edge shape from the selected flow. Edges carry a
  // human-readable label (e.g. `message contains "hi"`) for the canvas.
  const rfNodes = useMemo(
    () =>
      flow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
    [flow]
  );
  const rfEdges = useMemo(
    () =>
      flow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: flowEdgeLabel(edge.data.trigger),
      })),
    [flow]
  );

  const persistFlow = (next: Flow) => {
    dispatch(updateFlow(next));
  };

  const onNodesChange = (changes) => {
    const nextNodes = applyNodeChanges(
      changes,
      // React Flow adds measured/dragging props onto the nodes; strip them
      // back to our stored shape before persisting.
      rfNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }))
    );
    // If the start node was deleted, drop its startNodeId reference too.
    const removed = changes
      .filter((c) => c.type === "remove")
      .map((c) => c.id);
    const startNodeRemoved =
      flow.startNodeId !== "" && removed.includes(flow.startNodeId);
    persistFlow({
      ...flow,
      nodes: nextNodes,
      startNodeId: startNodeRemoved ? "" : flow.startNodeId,
    });
  };

  const onEdgesChange = (changes) => {
    const nextEdges = applyEdgeChanges(changes, rfEdges);
    persistFlow({
      ...flow,
      edges: nextEdges.map((e) => {
        const original = flow.edges.find((edge) => edge.id === e.id);
        // Defensive fallback for edges React Flow fabricates: keep a valid
        // (fallback) trigger so the inspector never sees a null trigger.
        return (
          original ?? {
            id: e.id,
            source: e.source,
            target: e.target,
            data: { trigger: { type: "fallback", value: "" } },
          }
        );
      }),
    });
  };

  const onConnect = (connection) => {
    if (!connection.source || !connection.target) return;
    const newEdge: FlowEdge = {
      id: generateId(),
      source: connection.source,
      target: connection.target,
      data: { trigger: { type: "fallback", value: "" } },
    };
    persistFlow({ ...flow, edges: [...flow.edges, newEdge] });
  };

  const onDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    if (type !== "start" && type !== "state") return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const node = createFlowNode(type, { x: position.x, y: position.y });
    persistFlow({
      ...flow,
      nodes: [...flow.nodes, node],
      startNodeId: type === "start" ? node.id : flow.startNodeId,
    });
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  return (
    <Box
      data-testid="flow-canvas"
      sx={{ flex: 1, height: 500, border: "1px solid #3a3a3c", borderRadius: 2, overflow: "hidden" }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          setSelectedNodeId(null);
        }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      <Box sx={{ p: 1.5 }}>
        <FlowInspector
          flow={flow}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onUpdate={persistFlow}
        />
      </Box>
    </Box>
  );
};

const EmptyFlow: Flow = {
  id: "",
  name: "",
  startNodeId: "",
  nodes: [],
  edges: [],
};

export const FlowEditor = () => {
  const dispatch = useDispatch();
  const flows = useSelector<BotWithConfig, Flow[]>((state) => state.bot.flows);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  // Persist flow edits to localStorage on every change, mirroring
  // ProgramEditor. Guard: the first effect run (including StrictMode's
  // simulated remount) establishes a baseline and never writes, so we do not
  // clobber saved flows before App hydrates them on startup.
  const lastWritten = useRef<string | null>(null);
  useEffect(() => {
    const serialized = JSON.stringify(flows);
    if (lastWritten.current === serialized) return;
    if (lastWritten.current === null) {
      lastWritten.current = serialized;
      return;
    }
    lastWritten.current = serialized;
    localStorage.setItem("flows", serialized);
  }, [flows]);

  // Keep a flow selected: default to the first flow; if flows empty, none.
  useEffect(() => {
    if (flows.length === 0) {
      if (selectedFlowId !== null) setSelectedFlowId(null);
      return;
    }
    if (!flows.some((f) => f.id === selectedFlowId)) {
      setSelectedFlowId(flows[0].id);
    }
  }, [flows, selectedFlowId]);

  const selectedFlow = flows.find((f) => f.id === selectedFlowId) ?? null;

  const handleNewFlow = () => {
    const flow = createFlow();
    dispatch(addFlow(flow));
    setSelectedFlowId(flow.id);
  };

  const handleDeleteFlow = (id: string) => {
    const remaining = flows.filter((f) => f.id !== id);
    dispatch(removeFlow(id));
    // Select a remaining flow (prefer the one at the same index).
    const index = flows.findIndex((f) => f.id === id);
    const nextSelected = remaining[Math.min(index, remaining.length - 1)];
    setSelectedFlowId(nextSelected ? nextSelected.id : null);
  };

  const handleRename = (name: string) => {
    if (!selectedFlow) return;
    dispatch(updateFlow({ ...selectedFlow, name }));
  };

  const errors = selectedFlow ? validateFlow(selectedFlow) : [];

  return (
    <Box data-testid="flow-editor">
      <Typography variant="h3" sx={{ mb: 0.5 }}>Flows</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Build conversational flows by dragging nodes from the palette onto the
        canvas and connecting them.
      </Typography>

      <Box sx={{ display: "flex", gap: 2 }}>
        <FlowPalette />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
            <Button variant="contained" size="small" onClick={handleNewFlow}>
              + New Flow
            </Button>
            {selectedFlow && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => handleDeleteFlow(selectedFlow.id)}
              >
                Delete Flow
              </Button>
            )}
            {selectedFlow && (
              <TextField
                label="Flow name"
                size="small"
                value={selectedFlow.name}
                onChange={(e) => handleRename(e.target.value)}
                sx={{ flex: 1, maxWidth: 320 }}
              />
            )}
            <FlowSamples
              onLoaded={(flow) => setSelectedFlowId(flow.id)}
            />
          </Box>

          {/* Flow rail (list) */}
          {flows.length > 0 && (
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                mb: 1.5,
                flexWrap: "wrap",
              }}
            >
              {flows.map((flow) => (
                <Box
                  key={flow.id}
                  data-testid={`flow-item-${flow.id}`}
                  onClick={() => setSelectedFlowId(flow.id)}
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor:
                      flow.id === selectedFlowId
                        ? "rgba(124,58,237,0.18)"
                        : "transparent",
                    border:
                      flow.id === selectedFlowId
                        ? "1px solid #7c3aed"
                        : "1px solid #3a3a3c",
                    fontSize: 14,
                  }}
                >
                  {flow.name}
                </Box>
              ))}
            </Box>
          )}

          {selectedFlow && (
            <Typography
              className="flow-name-display"
              variant="subtitle1"
              data-testid="flow-name-display"
              sx={{ mb: 1 }}
            >
              {selectedFlow.name}
            </Typography>
          )}

          {errors.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              {errors.map((error) => (
                <Typography
                  key={error}
                  variant="caption"
                  sx={{ color: "error.main", display: "block" }}
                >
                  {error}
                </Typography>
              ))}
            </Box>
          )}

          <ReactFlowProvider>
            <EditorCanvas flow={selectedFlow ?? EmptyFlow} />
          </ReactFlowProvider>

          {flows.length === 0 && (
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              No flows yet — create a new flow and drag nodes from the palette,
              or load a sample.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

