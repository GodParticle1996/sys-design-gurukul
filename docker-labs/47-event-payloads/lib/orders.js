function createOrders() {
  const rows = new Map();
  let reads = 0;
  return {
    save(id, changes) {
      const old = rows.get(id) || { id, version: 0 };
      const row = { ...old, ...structuredClone(changes), id, version: old.version + 1 };
      rows.set(id, row);
      return structuredClone(row);
    },
    read(id) {
      reads++;
      if (!rows.has(id)) throw Error('order missing');
      return structuredClone(rows.get(id));
    },
    stats: () => ({ reads, orders: rows.size }),
  };
}
module.exports = { createOrders };
