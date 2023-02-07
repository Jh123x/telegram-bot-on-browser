console.log("Worker started");

self.addEventListener("message", async (e) => {
  console.log("Starting work");
  const updateURL = e.data;
  let currUpdateId = 0;
  while (true) {
    const response = await fetch(`${updateURL}?offset=${currUpdateId}`);
    const updateData = await response.json();

    if (!updateData.ok) {
      console.log(
        `Error: with fetching updates: ${updateData} at URL ${updateURL}`
      );
      return;
    }

    const updates = updateData.result;
    if (updates.length > 0) {
      currUpdateId = updates[updates.length - 1].update_id + 1;
    }

    for (const update of updates) {
      const { message } = update;
      if (!message) continue;
      const { text, chat } = message;
      if (!text) continue;
      self.postMessage([text, chat.id]);
    }
    console.log(`Current update id: ${currUpdateId}`);
    console.log("Waiting for 5 seconds");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
});
