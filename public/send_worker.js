onmessage = async (e) => {
  console.debug("Received message from main thread: " + e.data);

  const [baseUrl, message, toId] = e.data;
  // The payload is either a plain string (sendMessage text) or an object
  // { question, options } (sendPoll payload from a poll flow node).
  const isPoll = typeof message === "object" && message !== null && Array.isArray(message.options);
  const body = isPoll
    ? { chat_id: toId, question: message.question, options: message.options }
    : { chat_id: toId, text: message };
  console.debug(`Sending ${isPoll ? "poll" : "message"}: ${JSON.stringify(body)} to ${toId}`);

  const resp = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  console.debug(`[Send Worker] Response: ${JSON.stringify(data)}`);
};
