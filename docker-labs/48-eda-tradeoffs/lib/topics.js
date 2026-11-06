/* Har topic ki ek line, ek consumer. read() nahi mitata;
   ack() head ki sahi id par entry hataata hai. RAM mein, no disk. */
function createTopics() {
  const lines = new Map();
  const line = name => {
    if (!lines.has(name)) lines.set(name, []);
    return lines.get(name);
  };
  return {
    publish(topic, event) {
      if (!event.id || !event.type) throw Error('id aur type chahiye');
      line(topic).push(structuredClone(event));
    },
    read: topic => structuredClone(line(topic)[0] || null),
    ack(topic, id) {
      const q = line(topic);
      if (!q.length || q[0].id !== id) return false;
      q.shift();
      return true;
    },
  };
}
module.exports = { createTopics };
