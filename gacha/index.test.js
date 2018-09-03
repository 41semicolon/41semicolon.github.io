const gacha = require('./index.js');

test('pick', () => {
  const p = gacha.__pick;
  const table = [
    { id: '0001', prob: 0.01, rarity: 5 },
    { id: '0002', prob: 0.10, rarity: 4 },
    { id: '0003', prob: 0.89, rarity: 3 },
  ];
  expect(p(table, 0.009).id).toBe('0001');
  expect(p(table, 0.02).id).toBe('0002');
  expect(p(table, 0.5).id).toBe('0003');
});

test('filterTable', () => {
  const f = gacha.__createFilteredTable;
  const table = [
    { id: '0001', prob: 0.01, rarity: 5 },
    { id: '0002', prob: 0.10, rarity: 4 },
    { id: '0003', prob: 0.89, rarity: 3 },
  ];

  expect(f(table, x => x.rarity === 5).length).toBe(1);
  expect(f(table, x => x.rarity > 3).length).toBe(2);
});

test('gacha', () => {
  const f = gacha.doGacha;
  const table = [
    { id: '0001', prob: 0.01, rarity: 5 },
    { id: '0002', prob: 0.10, rarity: 4 },
    { id: '0003', prob: 0.89, rarity: 3 },
  ];

  expect(f(table, 0, 0.005).result.id).toBe('0001');
  expect(f(table, 0, 0.02).result.id).toBe('0002');
  expect(f(table, 0, 0.3).result.id).toBe('0003');

  expect(f(table, 98, 0.02).result.id).toBe('0002');
  expect(f(table, 99, 0.02).result.id).toBe('0001');

  expect(f(table, 98, 0.3).result.id).toBe('0003');
  expect(f(table, 99, 0.3).result.id).toBe('0001');
});

test('gacha10', () => {
  const f = gacha.doGachaTen;
  const table = [
    { id: '0001', prob: 0.01, rarity: 5 },
    { id: '0002', prob: 0.10, rarity: 4 },
    { id: '0003', prob: 0.89, rarity: 3 },
  ];

  expect(f(table, 0, Array(10).fill(0.001)).results[0].id).toBe('0001');
  expect(f(table, 0, Array(10).fill(0.02)).results[0].id).toBe('0002');
  expect(f(table, 0, Array(10).fill(0.5)).results[0].id).toBe('0003');

  expect(f(table, 85, Array(10).fill(0.5)).results.map(x => x.id)).toContain('0002');
  expect(f(table, 85, Array(10).fill(0.5)).counter).toBe(95);

  expect(f(table, 95, Array(10).fill(0.5)).results.map(x => x.id)).toContain('0001');
  expect(f(table, 95, Array(10).fill(0.5)).counter).toBe(5);
});
