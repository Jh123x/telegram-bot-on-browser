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
import { Box, Typography } from "@mui/material";
import { FlowPalette } from "./FlowPalette.tsx";
import { FlowSamples } from "./FlowSamples.tsx";
import { FlowInspector } from "./FlowInspector.tsx";
import {
  createFlow,
  createFlowNode,
  dropNodeDimensionChanges,
  flowEdgeLabel,
  removeFlowEdge,
  removeFlowNode,
  validateFlow,
  ALL_NODE_TYPES,
  nodeCategory,
} from "../logic/flow.ts";
import { generateId } from "../logic/flow.ts";
import { addFlow, setFlows, updateFlow } from "../redux/botSlice.ts";
import { BotWithConfig } from "../redux/types.ts";
import { Flow, FlowEdge, FlowNodeType } from "../interfaces/flow.ts";
import { edgeColorFor } from "../theme.ts";
import {
  StartNode,
  TransformNode,
  ConditionNode,
  SendNode,
  RandomNode,
  PollNode,
} from "./flowNodes.tsx";

// Canvas node renderers keyed by the FlowNodeType. Passed to <ReactFlow> so
// each flow node renders as its dedicated MUI card. Must be module-level (a
// stable object identity) so React Flow does not remount nodes on re-render.
// Transform/condition types share one renderer each — the concrete type
// arrives via React Flow's `type` prop.
const nodeTypes: Record<string, React.ComponentType<any>> = {
  start: StartNode,
  send: SendNode,
  random: RandomNode,
  poll: PollNode,
};
ALL_NODE_TYPES.forEach((type) => {
  const category = nodeCategory(type);
  if (category === "transform") nodeTypes[type] = TransformNode;
  if (category === "condition") nodeTypes[type] = ConditionNode;
});

const EditorCanvas = ({
  flow,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
}: {
  flow: Flow;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
}) => {
  const dispatch = useDispatch();
  const { screenToFlowPosition } = useReactFlow();

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
        style: {
          stroke: edgeColorFor(edge.sourceHandle),
          strokeWidth: 2,
        },
        labelStyle: {
          fill: edgeColorFor(edge.sourceHandle),
          fontSize: 11,
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: "#1c1c1e",
          stroke: edgeColorFor(edge.sourceHandle),
          strokeWidth: 1,
        },
        labelBgPadding: [6, 3],
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
    if (!ALL_NODE_TYPES.includes(type)) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const node = createFlowNode(type, { x: position.x, y: position.y });
    // If no flow exists (the EmptyFlow placeholder is shown), create one
    // containing the dropped node instead of silently discarding it.
    if (flow.id === "") {
      const created = createFlow();
      dispatch(addFlow({ ...created, nodes: [node], startNodeId: type === "start" ? node.id : "" }));
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

  // Deletes the currently selected node (and its connected edges) or edge.
  // Mirrors the canvas Delete-key semantics; used by the inspector's Delete
  // button so deletion is discoverable without knowing the shortcut.
  const handleDelete = () => {
    const current = flowRef.current;
    if (current.id === "") return;
    let next: Flow | null = null;
    if (selectedNodeId) {
      next = removeFlowNode(current, selectedNodeId);
      onSelectNode(null);
    } else if (selectedEdgeId) {
      next = removeFlowEdge(current, selectedEdgeId);
      onSelectEdge(null);
    }
    if (next) persistFlow(next);
  };

  return (
    <Box
      data-testid="flow-canvas"
      sx={{
        flex: 1,
        minHeight: 320,
        display: "flex",
        gap: 1.5,
        minWidth: 0,
      }}
    >
      <Box
        data-testid="flow-canvas-stage"
        sx={{
          flex: 1,
          minWidth: 0,
          border: "1px solid #3a3a3c",
          borderRadius: 2,
          overflow: "hidden",
        }}
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
            onSelectNode(node.id);
            onSelectEdge(null);
          }}
          onPaneClick={() => {
            onSelectNode(null);
            onSelectEdge(null);
          }}
          onEdgeClick={(_, edge) => {
            onSelectEdge(edge.id);
            onSelectNode(null);
          }}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Box>
      <Box
        data-testid="flow-inspector-panel"
        sx={{
          width: 280,
          flexShrink: 0,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        <FlowInspector
          flow={flow}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onUpdate={persistFlow}
          onDelete={handleDelete}
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
  // The app is single-flow: the first flow is THE flow. No rail, no naming,
  // no creating/deleting flows — samples and drops just replace or fill it.
  const flow = flows[0] ?? null;

  // Selection state is lifted here so palette picks can auto-select the freshly
  // added node (and clear any edge selection), opening the inspector on it.
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

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

  const handlePalettePick = (type: FlowNodeType) => {
    const node = createFlowNode(type, { x: 120, y: 80 });
    // Auto-select the freshly added node so the inspector opens on it
    // immediately (and clear any lingering edge selection).
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    // No flow yet: create one containing the picked node, mirroring the
    // onDrop empty-case (createFlow + addFlow).
    if (flow === null) {
      const created = createFlow();
      dispatch(
        addFlow({
          ...created,
          nodes: [node],
          startNodeId: type === "start" ? node.id : "",
        })
      );
      return;
    }
    // Add the node to the single flow, offset for each new node so they do
    // not stack exactly on top of one another.
    const offset = (flow.nodes.length % 5) * 40;
    dispatch(
      updateFlow({
        ...flow,
        nodes: [
          ...flow.nodes,
          { ...node, position: { x: 120 + offset, y: 80 + offset } },
        ],
        startNodeId: type === "start" ? node.id : flow.startNodeId,
      })
    );
  };

  // Samples replace the single flow (never append — multiple flows are not
  // allowed). setFlows([loaded]) also covers the no-flow case.
  const handleSampleLoaded = (loaded: Flow) => {
    dispatch(setFlows([loaded]));
  };

  const errors = flow ? validateFlow(flow) : [];

  return (
    <Box
      data-testid="flow-editor"
      sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <Typography variant="h3" sx={{ mb: 0.5 }}>Flow</Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Build a conversational flow by dragging nodes from the palette onto the
        canvas and connecting them.
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flex: 1, minHeight: 0 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
          <FlowPalette onPick={handlePalettePick} />
          <FlowSamples onLoaded={handleSampleLoaded} />
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
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
            <EditorCanvas
              flow={flow ?? EmptyFlow}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onSelectNode={setSelectedNodeId}
              onSelectEdge={setSelectedEdgeId}
            />
          </ReactFlowProvider>

          {flow === null && (
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              No flow yet — add a node from the palette or load a sample.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

