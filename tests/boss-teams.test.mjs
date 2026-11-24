import test from 'node:test';
import assert from 'node:assert/strict';
import { getBossTeam } from '../src/utils/bossTeams.js';

const heroes = [
  { id: 'zeus', name: 'Zeus' },
  { id: 'idunn', name: 'Idunn' },
  { id: 'hladgunnr', name: 'Hladgunnr' },
];

test('keeps the team in the order given', () => {
  const team = getBossTeam({ team: ['idunn', 'zeus', 'hladgunnr'] }, heroes);
  assert.deepEqual(team.map(h => h.id), ['idunn', 'zeus', 'hladgunnr']);
});

test('resolves ids and names case-insensitively and trims blanks', () => {
  const team = getBossTeam({ team: [' Hladgunnr ', 'IDUNN', '', '  '] }, heroes);
  assert.deepEqual(team, [
    { id: 'hladgunnr', name: 'Hladgunnr' },
    { id: 'idunn', name: 'Idunn' },
  ]);
});

test('unknown heroes stay visible instead of silently reducing the team', () => {
  const team = getBossTeam({ team: ['zeus', 'Future Hero', 'idunn'] }, heroes);
  assert.equal(team.length, 3);
  assert.deepEqual(team[1], { id: null, name: 'Future Hero' });
});

test('a boss without a team gives an empty team', () => {
  assert.deepEqual(getBossTeam({}, heroes), []);
  assert.deepEqual(getBossTeam({ team: ['', ' '] }, heroes), []);
});
