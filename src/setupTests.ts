// jest-dom adds custom jest matchers for asserting on DOM nodes.
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Makes @xyflow/react testable in jsdom. React Flow's real components need
// ResizeObserver, DOMMatrix, real layout math and a canvas — none of which
// jsdom provides. The FlowEditor/flowNodes tests assert the *application*
// logic (which nodes/edges derive from a flow, how drags/drops/connects update
// the store), so we substitute simple render stubs for the canvas primitives
// and realistic pure helpers for the change-application functions.
jest.mock("@xyflow/react", () => {
  const React = require("react");
  const ce = React.createElement;

  const applyNodeChanges = (changes, nodes) => {
    let next = nodes;
    for (const change of changes) {
      const node = next.find((n) => n.id === change.id);
      if (!node) continue;
      if (change.type === "remove") {
        next = next.filter((n) => n.id !== change.id);
      } else if (change.type === "position") {
        next = next.map((n) =>
          n.id === change.id ? { ...n, position: { ...change.position } } : n
        );
      } else if (change.type === "dimensions") {
        next = next.map((n) =>
          n.id === change.id ? { ...n, measured: change.dimensions, ...change } : n
        );
      } else {
        next = next.map((n) => (n.id === change.id ? { ...n, ...change } : n));
      }
    }
    return next;
  };

  const applyEdgeChanges = (changes, edges) => {
    let next = edges;
    for (const change of changes) {
      const edge = next.find((e) => e.id === change.id);
      if (!edge) continue;
      if (change.type === "remove") {
        next = next.filter((e) => e.id !== change.id);
      } else {
        next = next.map((e) => (e.id === change.id ? { ...e, ...change } : e));
      }
    }
    return next;
  };

  return {
    ReactFlow: ({ children }) =>
      ce("div", { "data-testid": "reactflow-mock" }, children),
    ReactFlowProvider: ({ children }) =>
      ce("div", { "data-testid": "reactflow-provider" }, children),
    Background: () => ce("div", { "data-testid": "reactflow-background" }),
    Controls: () => ce("div", { "data-testid": "reactflow-controls" }),
    MiniMap: () => ce("div", { "data-testid": "reactflow-minimap" }),
    Handle: () => ce("span", { "data-testid": "reactflow-handle" }),
    Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
    applyNodeChanges,
    applyEdgeChanges,
    useReactFlow: () => ({
      screenToFlowPosition: (p) => p,
      project: (p) => p,
      getNode: () => undefined,
      getNodes: () => [],
      getEdges: () => [],
      setViewport: () => {},
    }),
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    useNodesState: (init) => {
      const [nodes] = React.useState(init);
      return [nodes, () => {}, () => {}];
    },
    useEdgesState: (init) => {
      const [edges] = React.useState(init);
      return [edges, () => {}, () => {}];
    },
  };
});
