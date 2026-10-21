import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from './levels.js';
import { chooseInteraction } from './interaction.js';

for(const level of LEVELS){
 test(level.name+': E selects all 3 objectives near their furniture',()=>{
  const markers=new Map(level.objectives.map(o=>[o.id,{pos:{x:o.position[0],z:o.position[1]}}]));
  for(const def of level.objectives){
   const completed=new Set(level.objectives.filter(x=>x.id!==def.id).map(x=>x.id));
   const look={x:0,z:1};
   const candidate=chooseInteraction({objectives:level.objectives,completed,markers,
     player:{x:def.position[0]+.5,z:def.position[1]+.5},forward:look,exit:{x:6.5,z:6.3},done:false});
   assert.equal(candidate?.def?.id,def.id,'E should work within 0.7m of '+def.id);
  }
 });
 test(level.name+': E works from side of inaccessible desk center',()=>{
  const def=level.objectives[1];
  const markers=new Map(level.objectives.map(o=>[o.id,{pos:{x:o.position[0],z:o.position[1]}}]));
  const completed=new Set(level.objectives.filter(o=>o.id!==def.id).map(o=>o.id));
  const focused=chooseInteraction({objectives:level.objectives,completed,markers,
    player:{x:def.position[0],z:def.position[1]+1.6},forward:{x:1,z:0},
    exit:{x:6.5,z:6.3},done:false});
  assert.equal(focused?.def?.id,def.id);
 });
 test(level.name+': exit only becomes interactive once missions finish',()=>{
  const markers=new Map(level.objectives.map(o=>[o.id,{pos:{x:o.position[0],z:o.position[1]}}]));
  const input={objectives:level.objectives,completed:new Set(),
    markers,player:{x:6.4,z:6.0},forward:{x:0,z:1},exit:{x:6.5,z:6.3}};
  assert.notEqual(chooseInteraction({...input,done:false})?.exit,true);
  assert.equal(chooseInteraction({...input,done:true})?.exit,true);
 });
}
test('E does not interact through the room from far away',()=>{
 const level=LEVELS[0];
 const markers=new Map(level.objectives.map(o=>[o.id,{pos:{x:o.position[0],z:o.position[1]}}]));
 assert.equal(chooseInteraction({objectives:level.objectives,completed:new Set(),markers,
  player:{x:7.3,z:6.0},forward:{x:-1,z:0},exit:{x:6.5,z:6.3},done:false}),null);
});
