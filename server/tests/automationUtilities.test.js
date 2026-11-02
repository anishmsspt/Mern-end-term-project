const test = require('node:test');
const assert = require('node:assert/strict');
const { pointsForDifficulty } = require('../src/utils/scoring');
const { istDateKey, istDayBounds, parseIstDateBoundary } = require('../src/utils/istDate');
const { parseDateBoundary, toLocalDateString } = require('../src/utils/dateUtils');

test('server scoring is fixed by verified difficulty', () => {
  assert.equal(pointsForDifficulty('Easy'), 10);
  assert.equal(pointsForDifficulty('Medium'), 25);
  assert.equal(pointsForDifficulty('Hard'), 50);
  assert.throws(() => pointsForDifficulty('Unknown'));
});

test('IST date key and boundaries are independent of server timezone', () => {
  const instant = new Date('2026-11-02T18:45:00.000Z');
  assert.equal(istDateKey(instant), '2026-11-03');
  const { start, end } = istDayBounds(instant);
  assert.equal(start.toISOString(), '2026-11-02T18:30:00.000Z');
  assert.equal(end.toISOString(), '2026-11-03T18:29:59.999Z');
  assert.equal(parseIstDateBoundary('2026-11-03', 'start').toISOString(), start.toISOString());
  assert.equal(toLocalDateString('2026-11-02T20:00:00.000Z'), '2026-11-03');
  assert.equal(parseDateBoundary('2026-11-02T20:00:00.000Z', 'start').toISOString(), '2026-11-02T18:30:00.000Z');
});
