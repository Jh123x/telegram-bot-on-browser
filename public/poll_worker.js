onmessage = async (e) => {
  const updateURL = e.data;
  let currUpdateId = 0;

  while (true) {
    const response = await fetch(`${updateURL}?offset=${currUpdateId}`);
    const updateData = await response.json();

    if (!updateData.ok) {
      console.debug(`[Poll Worker] Error: with fetching updates: ${updateData} at URL`);
      return;
    }

    const updates = updateData.result;
    if (updates.length > 0) {
      currUpdateId = updates[updates.length - 1].update_id + 1;
    }

    for (const update of updates) {
      const { message } = update;
      if (!message) continue;

      const { text, chat, date } = message;
      if (!text) continue;

      self.postMessage([date, chat.username, chat.id, text]);
    }

    console.debug(`[Poll Worker] Current update id: ${currUpdateId}`);
    console.debug(`[Poll Worker] Waiting for 5 seconds`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};
