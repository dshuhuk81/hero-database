import test from 'node:test';
import assert from 'node:assert/strict';
import { getBossTeams } from '../src/utils/bossTeams.js';

const heroes = [
  { id: 'zeus', name: 'Zeus' },
  { id: 'idunn', name: 'Idunn' },
  { id: 'hladgunnr', name: 'Hladgunnr' },
];

test('keeps every recommendation and prefers the explicit hero-comp order', () => {
  const teams = getBossTeams({ recommendedComps: [
    { id: 'first', label: 'Meta', 'hero-comp': 'idunn, zeus', heroes: ['zeus', 'idunn'] },
    { id: 'second', label: '', heroes: ['hladgunnr', 'zeus'] },
  ], beginnerComp: ['', ''] }, heroes);
  assert.equal(teams.length, 2);
  assert.deepEqual(teams[0].members.map(h => h.id), ['idunn', 'zeus']);
  assert.deepEqual(teams[1].members.map(h => h.id), ['hladgunnr', 'zeus']);
  assert.equal(teams[0].label, 'Meta');
  assert.equal(teams[1].label, 'Team 2');
});

test('resolves mixed-case names and retains the separate beginner variant', () => {
  const teams = getBossTeams({ recommendedComps: [
    { id: 'alternative', label: 'Beginner', heroes: ['zeus'] },
  ], beginnerComp: [' Hladgunnr ', 'IDUNN', '', '  '] }, heroes);
  assert.equal(teams.length, 2);
  assert.equal(teams[0].label, 'Beginner');
  assert.equal(teams[1].label, 'Beginner Comp');
  assert.deepEqual(teams[1].members, [
    { id: 'hladgunnr', name: 'Hladgunnr' },
    { id: 'idunn', name: 'Idunn' },
  ]);
});

test('unknown heroes stay visible instead of silently reducing the team', () => {
  const [team] = getBossTeams({ recommendedComps: [
    { id: 'future', label: 'New', 'hero-comp': 'zeus, Future Hero, idunn' },
  ] }, heroes);
  assert.equal(team.members.length, 3);
  assert.deepEqual(team.members[1], { id: null, name: 'Future Hero' });
});

test('falls back to heroes for blank hero-comp and omits empty teams', () => {
  assert.deepEqual(getBossTeams({ recommendedComps: [], beginnerComp: ['', ' '] }, heroes), []);
  const teams = getBossTeams({ recommendedComps: [
    { id: 'empty', label: 'Empty', 'hero-comp': ', ' },
    { id: 'fallback', label: 'Recommended', 'hero-comp': ' ', heroes: ['zeus'] },
  ] }, heroes);
  assert.equal(teams.length, 1);
  assert.deepEqual(teams[0].members, [{ id: 'zeus', name: 'Zeus' }]);
});
