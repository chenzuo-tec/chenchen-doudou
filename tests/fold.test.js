import test from 'node:test';
import assert from 'node:assert/strict';
import {foldGeometry} from '../fold.js';
const area=points=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0)/2);
test('moving crease partitions the paper without lost area',()=>{
  for(const backward of [false,true])for(const p of [.05,.25,.5,.8,1]){const g=foldGeometry(500,600,p,backward);assert.ok(Math.abs(area(g.remaining)+area(g.folded)-300000)<.01);assert.ok(g.matrix.every(Number.isFinite));assert.ok(Math.abs(g.matrix[0]*g.matrix[3]-g.matrix[1]*g.matrix[2]+1)<1e-8);}
});
test('completed fold lands precisely on the opposite half of the book',()=>{
  const forward=foldGeometry(500,600,1),backward=foldGeometry(500,600,1,true);
  assert.ok(area(forward.remaining)<.001);assert.ok(area(backward.remaining)<.001);
  assert.ok(Math.abs(forward.matrix[0]+1)<1e-8);assert.ok(Math.abs(forward.matrix[4])<1e-8);
  assert.ok(Math.abs(backward.matrix[4]-1000)<1e-8);
});
