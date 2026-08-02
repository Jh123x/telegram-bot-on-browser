onmessage = async (e) => {
  console.debug("Received message from main thread: " + e.data);

  const [baseUrl, message, toId] = e.data;
  // The payload is either a plain string (sendMessage text) or an object
  // (sendPoll payload from a poll flow node). Poll payloads carry camelCase
  // config fields that map onto the Telegram API's snake_case parameters.
  const isPoll = typeof message === "object" && message !== null && Array.isArray(message.options);
  const body = isPoll
    ? {
        chat_id: toId,
        question: message.question,
        options: message.options,
        ...(message.type !== undefined ? { type: message.type } : {}),
        ...(message.isAnonymous !== undefined ? { is_anonymous: message.isAnonymous } : {}),
        ...(message.allowsMultipleAnswers !== undefined
          ? { allows_multiple_answers: message.allowsMultipleAnswers }
          : {}),
        ...(message.correctOptionId !== undefined
          ? { correct_option_id: message.correctOptionId }
          : {}),
        ...(message.explanation !== undefined ? { explanation: message.explanation } : {}),
        ...(message.openPeriod !== undefined ? { open_period: message.openPeriod } : {}),
      }
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
