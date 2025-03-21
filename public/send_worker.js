onmessage = async (e) => {
  console.debug("Received message from main thread: " + e.data);

  const [baseUrl, message, toId] = e.data;
  console.debug(`Sending message: ${message} to ${toId}`);

  const resp = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: toId, text: message }),
  });

  const data = await resp.json();
  console.debug(`[Send Worker] Response: ${JSON.stringify(data)}`);
};
