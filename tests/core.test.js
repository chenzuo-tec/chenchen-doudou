import test from 'node:test';
import assert from 'node:assert/strict';
import {dateValue, addMonths, nextAnniversary, drawCard} from '../core.js';
test('calendar validates dates and clamps month-end anniversaries', () => {
  assert.equal(dateValue('2025-02-29'), null);
  assert.equal(dateValue('2024-02-29'), Date.UTC(2024, 1, 29));
  assert.equal(addMonths(dateValue('2024-01-31'), 1), dateValue('2024-02-29'));
  assert.equal(addMonths(dateValue('2024-01-31'), 2), dateValue('2024-03-31'));
});
test('anniversary includes today, moves past old dates and supports yearly leap dates', () => {
  assert.equal(nextAnniversary(dateValue('2026-05-14'), dateValue('2026-10-14')), dateValue('2026-10-14'));
  assert.equal(nextAnniversary(dateValue('2026-05-14'), dateValue('2026-10-15')), dateValue('2026-11-14'));
  assert.equal(nextAnniversary(dateValue('2024-02-29'), dateValue('2025-02-28'), 12), dateValue('2025-02-28'));
});
test('cards cannot be reused and chance limit prevents extra rewards', () => {
  const game = { limit: 2, draws: [] };
  assert.equal(drawCard(game, 0, ['a','b'], () => 0).reward, 'a');
  assert.equal(drawCard(game, 0, ['a']), null);
  assert.equal(drawCard(game, 1, ['a','b'], () => .9).reward, 'b');
  assert.equal(drawCard(game, 2, ['a']), null);
  assert.equal(game.draws.length, 2);
});
