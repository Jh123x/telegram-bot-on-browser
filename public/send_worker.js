onmessage = async (e) => {
  console.log("Received message from main thread: " + e.data);

  const [baseUrl, message, toId] = e.data;
  console.log(`Sending message: ${message} to ${toId}`);

  const resp = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: toId, text: message }),
  });

  const data = await resp.json();
  console.log(`[Worker] Response: ${JSON.stringify(data)}`);
  postMessage(data)
};
