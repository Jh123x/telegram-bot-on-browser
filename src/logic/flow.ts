import {
  Flow,
  FlowNodeCategory,
  FlowNodeData,
  FlowNodeType,
  FlowTriggerType,
  PollReply,
  QuestionReply,
  SendNodeType,
  TargetedReply,
  TransformNodeType,
} from "../interfaces/flow.ts";
import type { FlowSample } from "./flowSamples.ts";

export const TRIGGER_TYPES: FlowTriggerType[] = [
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
  "notStartsWith",
  "notEndsWith",
];

export const TRIGGER_LABELS: Record<FlowTriggerType, string> = {
  equals: "message equals",
  contains: "message contains",
  startsWith: "message starts with",
  endsWith: "message ends with",
  notEquals: "message does not equal",
  notContains: "message does not contain",
  notStartsWith: "message does not start with",
  notEndsWith: "message does not end with",
};

export const TRANSFORM_TYPES: TransformNodeType[] = [
  "lowercase",
  "uppercase",
  "trim",
  "replace",
  "extractRegex",
  "randomNumber",
  "concatFront",
  "concatBack",
  "template",
];

export const SEND_TYPES: SendNodeType[] = ["send", "poll", "sendTo", "question"];

export const ALL_NODE_TYPES: FlowNodeType[] = [
  "start",
  ...TRANSFORM_TYPES,
  ...TRIGGER_TYPES,
  ...SEND_TYPES,
];

// Display names for every concrete node type, used by the node palette.
// Record<FlowNodeType, string> forces a new node type to get a label here
// (and in NODE_DESCRIPTIONS) before it can be added anywhere else.
export const NODE_LABELS: Record<FlowNodeType, string> = {
  start: "Start",
  lowercase: "Lowercase",
  uppercase: "Uppercase",
  trim: "Trim",
  replace: "Replace",
  extractRegex: "Extract Regex",
  randomNumber: "Random Number",
  concatFront: "Concat Front",
  concatBack: "Concat Back",
  template: "Template",
  equals: "Equals",
  contains: "Contains",
  startsWith: "Starts With",
  endsWith: "Ends With",
  notEquals: "Not Equals",
  notContains: "Not Contains",
  notStartsWith: "Not Starts With",
  notEndsWith: "Not Ends With",
  send: "Send",
  poll: "Poll",
  sendTo: "Send To User",
  question: "Question",
};

// One-line plain-English descriptions for every concrete node type, used by
// the node palette. See NODE_LABELS for the same exhaustiveness guarantee.
export const NODE_DESCRIPTIONS: Record<FlowNodeType, string> = {
  start: "Flow entry point.",
  lowercase: "Make text lowercase.",
  uppercase: "Make text uppercase.",
  trim: "Remove surrounding spaces.",
  replace: "Find and replace text.",
  extractRegex: "Keep text matching a pattern.",
  randomNumber: "Replace with a random number.",
  concatFront: "Add text before the message.",
  concatBack: "Add text after the message.",
  template: "Build text from a template with {msg}.",
  equals: "Message equals the value.",
  contains: "Message contains the value.",
  startsWith: "Message starts with the value.",
  endsWith: "Message ends with the value.",
  notEquals: "Message is not equal to the value.",
  notContains: "Message does not contain the value.",
  notStartsWith: "Message does not start with the value.",
  notEndsWith: "Message does not end with the value.",
  send: "Send one or more messages.",
  poll: "Send a Telegram poll.",
  sendTo: "Send a message to the @mentioned user.",
  question: "Ask a question and wait for the answer.",
};

// Maps a concrete node type to its category. Start is its own category; every
// transform/trigger/send type maps to its respective group.
export function nodeCategory(type: FlowNodeType): FlowNodeCategory {
  if (type === "start") return "start";
  if ((TRANSFORM_TYPES as string[]).includes(type)) return "transform";
  if ((TRIGGER_TYPES as string[]).includes(type)) return "condition";
  if ((SEND_TYPES as string[]).includes(type)) return "send";
  return "send";
}

export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Replaces every {key} token in the template with variables[key] when present.
// Tokens with no matching key are left as-is. An empty template returns an
// empty string.
export function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  if (template === "") return "";
  return template.replace(/\{([^}]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match
  );
}

// Interpolates a list of reply templates with the current message. Module
// level so loop closures never capture loop-scoped variables (no-loop-func).
function interpolateReplies(replies: string[], message: string): string[] {
  return replies.map((reply) => interpolate(reply, { msg: message }));
}

// Splits a message into its first @mention and the remaining text. Returns
// undefined when the message has no @mention. The mention is the username
// WITHOUT the @ (Telegram usernames are [A-Za-z0-9_]); the remainder is the
// message with the mention removed, whitespace collapsed and trimmed.
export function parseMention(
  message: string
): { to: string; text: string } | undefined {
  const m = message.match(/@(\w+)/);
  if (!m) return undefined;
  return {
    to: m[1],
    text: message.replace(m[0], "").replace(/\s+/g, " ").trim(),
  };
}

// Usage hint shown when a /poll command is malformed. Kept byte-identical to
// the hint inlined in the Poll Bot sample.
export const POLL_USAGE_HINT = "Please use /poll <title> option1, option2, option3";

// Usage hint shown when a /dice roll is malformed. Kept byte-identical to the
// hint inlined in the Dice Bot sample.
export const DICE_USAGE_HINT = "Please use /dice d4, d6, d8, d10, d12, d20 or d100";

// Parses a "/poll ..." message into a structured PollReply. The convention is
// "<title> option1, ..." where the FIRST part holds the title and the first
// option separated by a space; the remaining comma-separated parts are extra
// options. Returns POLL_USAGE_HINT when the message cannot form a valid poll
// (fewer than 2 options or more than 10).
export function parsePoll(message: string): PollReply | string {
  const body = message.trim().replace(/^\/poll\s*/i, "").trim();
  const parts = body
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (parts.length < 2) return POLL_USAGE_HINT;

  let question = parts[0];
  let firstOption: string | undefined;
  const firstSpace = parts[0].lastIndexOf(" ");
  if (firstSpace !== -1) {
    question = parts[0].slice(0, firstSpace).trim();
    firstOption = parts[0].slice(firstSpace + 1).trim();
  }

  const options = [firstOption, ...parts.slice(1)].filter(
    (o): o is string => o !== undefined && o !== ""
  );

  if (question === "") return POLL_USAGE_HINT;
  if (options.length < 2 || options.length > 10) return POLL_USAGE_HINT;

  return { kind: "poll", question, options };
}

// Merges a poll node's config data into a parsed PollReply. Values that match
// Telegram's defaults are omitted so the API payload stays minimal; invalid
// numbers (non-numeric, out of range) are ignored.
export function applyPollConfig(
  poll: PollReply,
  data: FlowNodeData
): PollReply {
  const next: PollReply = { ...poll };
  if (data.pollType === "quiz") next.type = "quiz";
  if (data.isAnonymous === "false") next.isAnonymous = false;
  if (data.allowsMultipleAnswers === "true") next.allowsMultipleAnswers = true;
  if (data.correctOptionId !== undefined && data.correctOptionId !== "") {
    const id = Number(data.correctOptionId);
    if (Number.isInteger(id) && id >= 0) next.correctOptionId = id;
  }
  if (data.explanation !== undefined && data.explanation !== "") {
    next.explanation = data.explanation;
  }
  if (data.openPeriod !== undefined && data.openPeriod !== "") {
    const seconds = Number(data.openPeriod);
    if (Number.isInteger(seconds) && seconds >= 5 && seconds <= 600) {
      next.openPeriod = seconds;
    }
  }
  return next;
}

// Formats a poll for the local chat log (Telegram gets the real poll via
// sendPoll; this is just the human-readable echo). Quiz polls are labeled
// as such so the preview matches what Telegram will show.
export function pollDisplay(poll: PollReply): string {
  const label = poll.type === "quiz" ? "📊 Quiz" : "📊 Poll";
  return `${label}: ${poll.question}\n${poll.options.map((o) => `• ${o}`).join("\n")}`;
}

// Evaluates a trigger against a message. equals/notEquals trim both sides;
// the contains/startsWith/endsWith/notContains checks are raw string ops.
export function matchTrigger(
  type: FlowTriggerType,
  value: string,
  message: string
): boolean {
  switch (type) {
    case "equals":
      return message.trim() === value.trim();
    case "contains":
      return message.includes(value);
    case "startsWith":
      return message.startsWith(value);
    case "endsWith":
      return message.endsWith(value);
    case "notEquals":
      return message.trim() !== value.trim();
    case "notContains":
      return !message.includes(value);
    case "notStartsWith":
      return !message.startsWith(value);
    case "notEndsWith":
      return !message.endsWith(value);
    default:
      return false;
  }
}

// Applies a concrete transform to a message. replace with an empty (or
// undefined) find leaves the message unchanged; an invalid extractRegex
// pattern yields an empty string.
export function applyTransform(
  type: TransformNodeType,
  data: FlowNodeData,
  message: string
): string {
  switch (type) {
    case "lowercase":
      return message.toLowerCase();
    case "uppercase":
      return message.toUpperCase();
    case "trim":
      return message.trim();
    case "replace":
      if (data.find === "" || data.find === undefined) return message;
      return message
        .split(data.find)
        .join(data.replacement ?? "");
    case "extractRegex":
      try {
        const m = message.match(new RegExp(data.pattern ?? ""));
        return m ? m[0] : "";
      } catch {
        return "";
      }
    case "randomNumber": {
      const min = Number(data.min);
      const max = Number(data.max);
      if (
        data.min === undefined ||
        data.max === undefined ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min > max
      ) {
        return message;
      }
      const roll = Math.floor(Math.random() * (max - min + 1)) + min;
      return String(roll);
    }
    case "concatFront":
      return (data.text ?? "") === "" ? message : data.text + message;
    case "concatBack":
      return (data.text ?? "") === "" ? message : message + data.text;
    case "template":
      return interpolate(data.template ?? "", { msg: message });
    default:
      return message;
  }
}

// Labels a condition edge by its source handle. Edges without a handle
// (start/transform/plain connections) carry no label.
export function flowEdgeLabel(
  sourceHandle: "if" | "else" | undefined
): string | undefined {
  if (sourceHandle === "if" || sourceHandle === "else") return sourceHandle;
  return undefined;
}

// React Flow fires "dimensions" changes after measuring nodes. Applying them
// to the app's own node state and persisting makes React Flow re-adopt the
// nodes (without their measured size), which resets the internal measurement
// and leaves nodes stuck at `visibility: hidden`. These bookkeeping changes
// must be dropped before applying/persisting node changes.
export function dropNodeDimensionChanges<T extends { type: string }>(
  changes: T[]
): T[] {
  return changes.filter((change) => change.type !== "dimensions");
}

// Removes a node and every edge connected to it (the same semantics as the
// canvas Delete key: a node cannot stay wired to a graph it is no longer in).
// Deleting the start node also clears startNodeId so validation reports it.
export function removeFlowNode(flow: Flow, nodeId: string): Flow {
  return {
    ...flow,
    nodes: flow.nodes.filter((n) => n.id !== nodeId),
    edges: flow.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    ),
    startNodeId: flow.startNodeId === nodeId ? "" : flow.startNodeId,
  };
}

// Removes a single edge by id; nodes are untouched.
export function removeFlowEdge(flow: Flow, edgeId: string): Flow {
  return { ...flow, edges: flow.edges.filter((e) => e.id !== edgeId) };
}

// Default on-canvas label for a condition node. Delegates to NODE_LABELS so
// the palette and the canvas stay in lockstep.
const CONDITION_DEFAULT_LABELS: Record<FlowTriggerType, string> = {
  equals: NODE_LABELS.equals,
  notEquals: NODE_LABELS.notEquals,
  startsWith: NODE_LABELS.startsWith,
  endsWith: NODE_LABELS.endsWith,
  contains: NODE_LABELS.contains,
  notContains: NODE_LABELS.notContains,
  notStartsWith: NODE_LABELS.notStartsWith,
  notEndsWith: NODE_LABELS.notEndsWith,
};

export function createFlowNode(
  type: FlowNodeType,
  position?: { x: number; y: number }
): Flow["nodes"][number] {
  const base = {
    id: generateId(),
    type,
    position: position ?? { x: 0, y: 0 },
  };
  switch (type) {
    case "start":
      return { ...base, data: { label: NODE_LABELS.start } };
    case "lowercase":
      return { ...base, data: { label: NODE_LABELS.lowercase } };
    case "uppercase":
      return { ...base, data: { label: NODE_LABELS.uppercase } };
    case "trim":
      return { ...base, data: { label: NODE_LABELS.trim } };
    case "replace":
      return {
        ...base,
        data: { label: NODE_LABELS.replace, find: "", replacement: "" },
      };
    case "extractRegex":
      return { ...base, data: { label: NODE_LABELS.extractRegex, pattern: "" } };
    case "randomNumber":
      return {
        ...base,
        data: { label: NODE_LABELS.randomNumber, min: "1", max: "6" },
      };
    case "concatFront":
      return {
        ...base,
        data: { label: NODE_LABELS.concatFront, text: "" },
      };
    case "concatBack":
      return {
        ...base,
        data: { label: NODE_LABELS.concatBack, text: "" },
      };
    case "template":
      return {
        ...base,
        data: { label: NODE_LABELS.template, template: "" },
      };
    case "equals":
    case "notEquals":
    case "startsWith":
    case "endsWith":
    case "contains":
    case "notContains":
    case "notStartsWith":
    case "notEndsWith":
      return {
        ...base,
        data: { label: CONDITION_DEFAULT_LABELS[type], value: "" },
      };
    case "send":
      return { ...base, data: { label: "New Send", replies: [] } };
    case "sendTo":
      return {
        ...base,
        data: {
          label: NODE_LABELS.sendTo,
          replies: [],
          confirm: "Sent to @{to}",
        },
      };
    case "question":
      return {
        ...base,
        data: {
          label: NODE_LABELS.question,
          prompt: "",
          answers: [],
          correctReply: "✅ Correct!",
          wrongReply: "❌ Wrong! The answer is {answer}.",
        },
      };
    case "poll":
      return {
        ...base,
        data: {
          label: NODE_LABELS.poll,
          pollType: "regular",
          isAnonymous: "true",
          allowsMultipleAnswers: "false",
        },
      };
  }
}

export function createFlow(name = "New Flow"): Flow {
  return {
    id: generateId(),
    name,
    startNodeId: "",
    nodes: [],
    edges: [],
  };
}

// Walks the flow graph starting at flow.startNodeId, applying transforms and
// evaluating conditions, until a send node is reached. Returns the send
// node's replies interpolated with the (possibly transformed) message, or
// undefined if the walk cannot reach a send node (dead end, cycle, missing
// start, missing branch edge).
export function executeFlow(
  flow: Flow,
  message: string
): (string | PollReply | TargetedReply | QuestionReply)[] | undefined {
  if (flow.startNodeId === "") return undefined;

  const nodesById = new Map(flow.nodes.map((n) => [n.id, n]));
  let current = nodesById.get(flow.startNodeId);
  if (!current) return undefined;

  const edgesOut = new Map<string, Flow["edges"]>();
  for (const edge of flow.edges) {
    const list = edgesOut.get(edge.source) ?? [];
    list.push(edge);
    edgesOut.set(edge.source, list);
  }

  let currentMessage = message;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) return undefined; // cycle guard
    visited.add(current.id);

    const category = nodeCategory(current.type);

    if (category === "start") {
      const outgoing = edgesOut.get(current.id) ?? [];
      if (outgoing.length === 0) return undefined;
      const next = nodesById.get(outgoing[0].target);
      if (!next) return undefined;
      // start transitions are unconditional; follow the first outgoing edge
      current = next;
      continue;
    }

    if (category === "transform") {
      currentMessage = applyTransform(
        current.type as TransformNodeType,
        current.data,
        currentMessage
      );
      const outgoing = edgesOut.get(current.id) ?? [];
      if (outgoing.length === 0) return undefined;
      const next = nodesById.get(outgoing[0].target);
      if (!next) return undefined;
      current = next;
      continue;
    }

    if (category === "condition") {
      const matched = matchTrigger(
        current.type as FlowTriggerType,
        current.data.value ?? "",
        currentMessage
      );
      const handle = matched ? "if" : "else";
      const outgoing = edgesOut.get(current.id) ?? [];
      const branch = outgoing.find((e) => e.sourceHandle === handle);
      if (!branch) return undefined;
      const next = nodesById.get(branch.target);
      if (!next) return undefined;
      current = next;
      continue;
    }

    // send category (send / poll / sendTo / question)
    if (current.type === "poll") {
      const parsed = parsePoll(currentMessage);
      if (typeof parsed === "string") return [parsed];
      return [applyPollConfig(parsed, current.data)];
    }
    if (current.type === "sendTo") {
      // Target is the FIRST @mention in the current message. No mention →
      // decline (undefined) so later rules/flows still get a chance.
      const mention = parseMention(currentMessage);
      if (!mention) return undefined;
      const vars = { msg: mention.text, to: mention.to };
      const forwarded = (current.data.replies ?? [])
        .map((reply) => interpolate(reply, vars))
        .filter((text) => text !== "");
      const confirm = interpolate(
        current.data.confirm ?? "Sent to @{to}",
        vars
      );
      return [
        {
          kind: "sendTo",
          to: mention.to,
          texts: forwarded,
          confirm,
        },
      ];
    }
    if (current.type === "question") {
      const question: QuestionReply = {
        kind: "question",
        prompt: current.data.prompt ?? "",
        answers: current.data.answers ?? [],
        correctReply: current.data.correctReply ?? "✅ Correct!",
        wrongReply: current.data.wrongReply ?? "❌ Wrong! The answer is {answer}.",
      };
      return [question];
    }
    return interpolateReplies(
      current.data.replies ?? [],
      currentMessage
    );
  }

  return undefined;
}

// Per-user state stored by a question node: the accepted answers and the
// reply templates used when the user answers.
interface PendingQuestion {
  answers: string[];
  correctReply: string;
  wrongReply: string;
}

// Evaluates a user's answer against a pending question. Any message counts as
// an answer attempt; the state is cleared before returning so the next
// message runs the flow from the start again. {answer} in the reply templates
// is the FIRST accepted answer.
function evaluateAnswer(
  pending: PendingQuestion,
  message: string
): string {
  const normalized = message.trim().toLowerCase();
  const isCorrect = pending.answers.some(
    (answer) => answer.trim().toLowerCase() === normalized
  );
  const answer = pending.answers[0] ?? "";
  const template = isCorrect ? pending.correctReply : pending.wrongReply;
  return interpolate(template, { answer });
}

// Wraps executeFlow with per-user state for question nodes. Unlike the
// pre-2026-08-04 runtime, userId is NOT ignored: a user with a pending
// question gets their next message evaluated against it instead of running
// the flow again.
export class FlowRuntime {
  private pending = new Map<number, PendingQuestion>();

  constructor(private flow: Flow) {}

  // Clears every user's pending question state (used by tests; editing a
  // flow rebuilds the runtime, which resets state naturally).
  reset() {
    this.pending.clear();
  }

  // Evaluates the message for one user:
  //   - a user with a pending question: their message is checked against the
  //     answers and the result is returned (state cleared).
  //   - otherwise the flow runs from the start node. A question node reached
  //     during the walk registers pending state and returns its prompt as a
  //     plain string reply.
  //   - undefined -> no send node reached (caller falls through to next rule)
  //   - []        -> a send node was reached but has empty replies (consumed)
  //   - string    -> a single string reply
  //   - PollReply -> a poll reply
  //   - TargetedReply -> a sendTo reply (transport sends it to another user)
  handleMessage(
    userId: number,
    message: string
  ): string | string[] | PollReply | TargetedReply | undefined {
    const pending = this.pending.get(userId);
    if (pending !== undefined) {
      this.pending.delete(userId);
      return evaluateAnswer(pending, message);
    }

    const replies = executeFlow(this.flow, message);
    if (replies === undefined) return undefined;
    if (replies.length === 0) return [];

    // A question node in the result registers per-user state; the transport
    // only needs the prompt text (the answers are checked on the NEXT
    // message, which never re-runs the flow).
    const question = replies.find(
      (reply): reply is QuestionReply => reply.kind === "question"
    );
    if (question !== undefined) {
      this.pending.set(userId, {
        answers: question.answers,
        correctReply: question.correctReply,
        wrongReply: question.wrongReply,
      });
      const replaced = replies.map((reply) =>
        reply.kind === "question" ? reply.prompt : reply
      );
      return replaced.length === 1 ? replaced[0] : replaced;
    }

    if (replies.length === 1) return replies[0];
    return replies;
  }
}

// Validates a flow's structure, returning a list of human-readable error
// strings (empty array = valid). Duplicate node ids report one error per id.
export function validateFlow(flow: Flow): string[] {
  const errors: string[] = [];

  if (flow.name.trim() === "") {
    errors.push("Flow name is required");
  }

  const startNodes = flow.nodes.filter((n) => n.type === "start");
  if (startNodes.length === 0) {
    errors.push("Flow must have a start node");
  } else if (startNodes.length > 1) {
    errors.push("Flow can only have one start node");
  }

  const seen = new Set<string>();
  for (const node of flow.nodes) {
    if (seen.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    } else {
      seen.add(node.id);
    }
  }

  const nodeIds = new Set(flow.nodes.map((n) => n.id));
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references a missing node`);
    }
  }

  // startNodeId must be consistent with the flow's actual node structure.
  if (flow.startNodeId !== "") {
    if (!nodeIds.has(flow.startNodeId)) {
      errors.push(`Start node id "${flow.startNodeId}" points to a missing node`);
    } else if (
      startNodes.length === 1 &&
      flow.startNodeId !== startNodes[0].id
    ) {
      errors.push("startNodeId must point to the start node");
    }
  }

  // A start or transform node has exactly one deterministic output; any extra
  // outgoing edges are unreachable dead branches.
  for (const node of flow.nodes) {
    if (node.type === "start" || nodeCategory(node.type) === "transform") {
      const outgoing = flow.edges.filter((e) => e.source === node.id);
      if (outgoing.length > 1) {
        errors.push(
          `Node ${node.id} has multiple outgoing edges; only the first is reachable`
        );
      }
    }
  }

  // A condition node has exactly one if branch and one else branch.
  for (const node of flow.nodes) {
    if (nodeCategory(node.type) === "condition") {
      const outgoing = flow.edges.filter((e) => e.source === node.id);
      const ifCount = outgoing.filter((e) => e.sourceHandle === "if").length;
      const elseCount = outgoing.filter((e) => e.sourceHandle === "else").length;
      if (ifCount > 1) {
        errors.push(
          `Node ${node.id} has multiple if edges; only the first is reachable`
        );
      }
      if (elseCount > 1) {
        errors.push(
          `Node ${node.id} has multiple else edges; only the first is reachable`
        );
      }
    }
  }

  // A send node (send or poll) is terminal and cannot lead anywhere.
  for (const node of flow.nodes) {
    if (nodeCategory(node.type) === "send") {
      const outgoing = flow.edges.filter((e) => e.source === node.id);
      if (outgoing.length > 0) {
        errors.push(
          `Node ${node.id} is a send node and cannot have outgoing edges`
        );
      }
    }
  }

  if (startNodes.length === 1 && nodeIds.has(startNodes[0].id)) {
    for (const edge of flow.edges) {
      if (edge.target === startNodes[0].id) {
        errors.push("Start node cannot have incoming edges");
      }
    }
  }

  return errors;
}

// Deep-copies a sample's flow with FRESH ids for the flow, every node, and
// every edge so loading a sample twice creates two independent flows. Node
// data (label and the flat optional fields) and edge sourceHandle are
// deep-copied too. The startNodeId is remapped to the freshly generated start
// node.
export function flowFromSample(sample: FlowSample): Flow {
  const nodes = sample.flow.nodes.map((node) => {
    const data: FlowNodeData = { label: node.data.label };
    if (node.data.value !== undefined) data.value = node.data.value;
    if (node.data.find !== undefined) data.find = node.data.find;
    if (node.data.replacement !== undefined)
      data.replacement = node.data.replacement;
    if (node.data.pattern !== undefined) data.pattern = node.data.pattern;
    if (node.data.min !== undefined) data.min = node.data.min;
    if (node.data.max !== undefined) data.max = node.data.max;
    if (node.data.text !== undefined) data.text = node.data.text;
    if (node.data.template !== undefined) data.template = node.data.template;
    if (node.data.confirm !== undefined) data.confirm = node.data.confirm;
    if (node.data.prompt !== undefined) data.prompt = node.data.prompt;
    if (node.data.answers !== undefined) data.answers = [...node.data.answers];
    if (node.data.correctReply !== undefined)
      data.correctReply = node.data.correctReply;
    if (node.data.wrongReply !== undefined) data.wrongReply = node.data.wrongReply;
    if (node.data.pollType !== undefined) data.pollType = node.data.pollType;
    if (node.data.isAnonymous !== undefined) data.isAnonymous = node.data.isAnonymous;
    if (node.data.allowsMultipleAnswers !== undefined)
      data.allowsMultipleAnswers = node.data.allowsMultipleAnswers;
    if (node.data.correctOptionId !== undefined)
      data.correctOptionId = node.data.correctOptionId;
    if (node.data.explanation !== undefined) data.explanation = node.data.explanation;
    if (node.data.openPeriod !== undefined) data.openPeriod = node.data.openPeriod;
    if (node.data.replies !== undefined) data.replies = [...node.data.replies];
    return {
      ...node,
      id: generateId(),
      position: { ...node.position },
      data,
    };
  });
  const oldToNew = new Map<string, string>();
  sample.flow.nodes.forEach((node, i) => {
    oldToNew.set(node.id, nodes[i].id);
  });
  const edges = sample.flow.edges.map((edge) => ({
    id: generateId(),
    source: oldToNew.get(edge.source) ?? edge.source,
    target: oldToNew.get(edge.target) ?? edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
  }));
  const startNode = nodes.find((node) => node.type === "start");
  return {
    id: generateId(),
    name: sample.name,
    startNodeId: startNode ? startNode.id : "",
    nodes,
    edges,
  };
}
