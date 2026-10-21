import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, ROOM, isReady, objectivesCompleted, remainingObjectives } from './levels.js';

test('contains three distinct and increasingly difficult first-person missions', () => {
  assert.equal(LEVELS.length,3);
  assert.deepEqual(LEVELS.map(x=>x.id),[1,2,3]);
  assert.equal(new Set(LEVELS.map(x=>x.name)).size,3);
  assert.ok(LEVELS[0].timer > LEVELS[1].timer);
  assert.ok(LEVELS[1].timer > LEVELS[2].timer);
  assert.ok(LEVELS[0].maxNoise > LEVELS[1].maxNoise);
  assert.ok(LEVELS[1].maxNoise > LEVELS[2].maxNoise);
});
for (const level of LEVELS) {
  test(level.name+': valid interactables and win conditions', () => {
    assert.equal(level.objectives.length,3);
    const ids=level.objectives.map(x=>x.id);
    assert.equal(new Set(ids).size,3);
    assert.equal(level.objectives.filter(x=>x.timer).length,1);
    assert.ok(level.bed.length===2 && level.start.length===2);
    for (const o of level.objectives) {
      assert.equal(o.position.length,2);
      assert.ok(Math.abs(o.position[0]) < ROOM.halfX);
      assert.ok(Math.abs(o.position[1]) < ROOM.halfZ);
      assert.ok(o.noise > 0);
      if (o.requires) assert.ok(ids.includes(o.requires),o.id+' has unknown prerequisite');
    }
    const finished = new Set(ids);
    assert.equal(objectivesCompleted(level,new Set()),false);
    assert.equal(objectivesCompleted(level,finished),true);
    assert.equal(remainingObjectives(level,finished).length,0);
    const last=level.objectives.at(-1);
    assert.ok(last.requires, 'final objective must require a key');
    assert.equal(isReady(last,new Set()),false);
    assert.equal(isReady(last,new Set([last.requires])),true);
  });
}
