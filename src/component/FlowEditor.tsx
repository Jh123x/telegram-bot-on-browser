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
  dropNodeDimensionChanges,
  flowEdgeLabel,
  validateFlow,
} from "../logic/flow.ts";
import { generateId } from "../logic/flow.ts";
import { addFlow, removeFlow, updateFlow } from "../redux/botSlice.ts";
import { BotWithConfig } from "../redux/types.ts";
import { Flow, FlowEdge, FlowNodeType } from "../interfaces/flow.ts";
import {
  StartNode,
  TransformNode,
  ConditionNode,
  SendNode,
} from "./flowNodes.tsx";

// Canvas node renderers keyed by the FlowNodeType. Passed to <ReactFlow> so
// each flow node renders as its dedicated MUI card. Must be module-level (a
// stable object identity) so React Flow does not remount nodes on re-render.
const nodeTypes = {
  start: StartNode,
  transform: TransformNode,
  condition: ConditionNode,
  send: SendNode,
};

const EditorCanvas = ({
  flow,
  onFlowCreated,
}: {
  flow: Flow;
  onFlowCreated?: (id: string) => void;
}) => {
  const dispatch = useDispatch();
  const { screenToFlowPosition } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Mirrors the latest `flow` prop so the change/connect handlers never read a
  // stale closure. React Flow can deliver several change events before the
  // Redux round-trip lands (so `flow` prop is still the old object); reading
  // the ref keeps every edit based on the most recent flow.
  const flowRef = useRef(flow);
  flowRef.current = flow;

  // Derive React Flow's node/edge shape from the selected flow. Edges carry a
  // sourceHandle ("if" | "else") so condition branches render distinctly, and
  // a human-readable label derived from that handle.
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
        sourceHandle: edge.sourceHandle,
        label: flowEdgeLabel(edge.sourceHandle),
      })),
    [flow]
  );

  const persistFlow = (next: Flow) => {
    dispatch(updateFlow(next));
  };

  const onNodesChange = (changes) => {
    // The EmptyFlow placeholder (id === "") is a virtual render target, not a
    // real flow — React Flow's bookkeeping edits to it must not be persisted.
    if (flowRef.current.id === "") return;
    const current = flowRef.current;
    // React Flow fires "dimensions" changes after measuring nodes. Dropping
    // them here (rather than applying/persisting) keeps the measured size out
    // of the store: persisting them would make React Flow re-adopt the nodes
    // without measured dimensions and leave every node stuck invisible.
    const meaningful = dropNodeDimensionChanges(changes);
    // A dimensions-only event must not dispatch at all — even an unchanged
    // persist would hand React Flow a fresh node array, which resets the
    // internal measurement and re-triggers the dimensions change forever.
    if (meaningful.length === 0) return;
    const nextNodes = applyNodeChanges(
      meaningful,
      // React Flow adds measured/dragging props onto the nodes; strip them
      // back to our stored shape before persisting.
      current.nodes.map((n) => ({
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
      current.startNodeId !== "" && removed.includes(current.startNodeId);
    persistFlow({
      ...current,
      nodes: nextNodes,
      startNodeId: startNodeRemoved ? "" : current.startNodeId,
    });
  };

  const onEdgesChange = (changes) => {
    // Ignore edits to the EmptyFlow placeholder (see onNodesChange).
    if (flowRef.current.id === "") return;
    const current = flowRef.current;
    const nextEdges = applyEdgeChanges(changes, rfEdges);
    persistFlow({
      ...current,
      edges: nextEdges.map((e) => {
        const original = current.edges.find((edge) => edge.id === e.id);
        // Defensive fallback for edges React Flow fabricates: keep a valid
        // (triggerless) edge so the inspector never sees a missing source.
        return (
          original ?? {
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle as "if" | "else" | undefined,
          }
        );
      }),
    });
  };

  const onConnect = (connection) => {
    // Ignore connects while the EmptyFlow placeholder is shown — there is no
    // flow to connect into yet (onDrop handles flow creation instead).
    if (flowRef.current.id === "") return;
    const current = flowRef.current;
    if (!connection.source || !connection.target) return;
    const newEdge: FlowEdge = {
      id: generateId(),
      source: connection.source,
      target: connection.target,
      sourceHandle:
        connection.sourceHandle === "if" || connection.sourceHandle === "else"
          ? connection.sourceHandle
          : undefined,
    };
    persistFlow({ ...current, edges: [...current.edges, newEdge] });
  };

  const onDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    if (type !== "start" && type !== "transform" && type !== "condition" && type !== "send") return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const node = createFlowNode(type, { x: position.x, y: position.y });
    // If no flow exists (the EmptyFlow placeholder is shown), create one
    // containing the dropped node instead of silently discarding it.
    if (flow.id === "") {
      const created = createFlow();
      dispatch(addFlow({ ...created, nodes: [node], startNodeId: type === "start" ? node.id : "" }));
      onFlowCreated?.(created.id);
      return;
    }
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

  // Persist flow edits to localStorage on every change. Guard: the first
  // effect run (including StrictMode's simulated remount) establishes a
  // baseline and never writes, so we do not clobber saved flows before App
  // hydrates them on startup.
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
    const start = createFlowNode("start", { x: 0, y: 0 });
    dispatch(addFlow({ ...flow, nodes: [start], startNodeId: start.id }));
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

  const handlePalettePick = (type: FlowNodeType) => {
    const node = createFlowNode(type, { x: 120, y: 80 });
    // No flow selected yet: create one containing the picked node, mirroring
    // the onDrop empty-case (createFlow + addFlow + select the new flow).
    if (selectedFlow === null) {
      const created = createFlow();
      dispatch(
        addFlow({
          ...created,
          nodes: [node],
          startNodeId: type === "start" ? node.id : "",
        })
      );
      setSelectedFlowId(created.id);
      return;
    }
    // Add the node to the selected flow, offset for each new node so they do
    // not stack exactly on top of one another.
    const offset = (selectedFlow.nodes.length % 5) * 40;
    dispatch(
      updateFlow({
        ...selectedFlow,
        nodes: [
          ...selectedFlow.nodes,
          { ...node, position: { x: 120 + offset, y: 80 + offset } },
        ],
        startNodeId: type === "start" ? node.id : selectedFlow.startNodeId,
      })
    );
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FlowPalette onPick={handlePalettePick} />
          <FlowSamples onLoaded={(flow) => setSelectedFlowId(flow.id)} />
        </Box>

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
                  role="button"
                  tabIndex={0}
                  aria-pressed={flow.id === selectedFlowId}
                  onClick={() => setSelectedFlowId(flow.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedFlowId(flow.id);
                    }
                  }}
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
            <EditorCanvas flow={selectedFlow ?? EmptyFlow} onFlowCreated={setSelectedFlowId} />
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

