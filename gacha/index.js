// gacha core logic
function pick (table, rval) {
  let accum = 0;
  for (const entry of table) {
    accum += entry.prob;
    if (rval < accum) return entry;
  }
  return null;
}

// filtering, validation, normalization
function createFilteredTable (table, pred) {
  const filtered = table.filter(pred);
  const summed = filtered.reduce((acc, x) => acc + x.prob, 0);
  return filtered.map(x => ({ ...x, prob: x.prob / summed }));
};

function gachaInternal (table, env, rval) {
  const { ceil, insure } = env;
  const newTable = ceil
    ? createFilteredTable(table, x => x.rarity === 5)
    : insure
      ? createFilteredTable(table, x => x.rarity > 3)
      : createFilteredTable(table, () => true); // normalization
  return pick(newTable, rval);
}

// API: doGacha
function doGacha (table, counter = 0, rval = null) {
  const env = { ceil: counter === 99 };
  const result = gachaInternal(table, env, rval || Math.random());
  return { result, counter: result.rarity === 5 ? 0 : counter + 1 };
}

// API: doGachaTen
function doGachaTen (table, counter = 0, vals = null) {
  const results = [];
  let ceilCount = counter;
  let insureCount = 0;
  const rvals = vals || Array(10).fill(0).map(() => Math.random());
  for (const rval of rvals) {
    const env = { ceil: ceilCount === 99, insure: insureCount === 9 };
    const result = gachaInternal(table, env, rval);
    results.push(result);
    ceilCount = result.rarity === 5 ? 0 : ceilCount + 1;
    insureCount = result.rarity > 3 ? 0 : insureCount + 1;
  }
  return { results, counter: ceilCount };
}

module.exports = {
  __pick: pick,
  __createFilteredTable: createFilteredTable,
  __gachaInternal: gachaInternal,
  doGacha,
  doGachaTen,
};
