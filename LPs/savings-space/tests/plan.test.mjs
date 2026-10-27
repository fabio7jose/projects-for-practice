import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN, calculate, suggestContribution, restorePlan, monthLabel } from '../dist/plan.mjs';

test('approved plan has exactly eight transfers and preserves the buffer', () => {
  const result=calculate({...DEFAULT_PLAN});
  assert.equal(result.count,8);assert.equal(result.finish,'2027-06');
  assert.equal(result.early,2);assert.equal(result.buffer,145);
  assert.deepEqual(result.schedule[3],{month:'2027-02',amount:375,cumulative:1500});
  assert.equal(result.schedule.reduce((sum,item)=>sum+item.amount,0),3000);
  assert.equal(suggestContribution({...DEFAULT_PLAN}),375);
});
test('adjusting contribution changes the finish date and buffer', () => {
  const faster=calculate({...DEFAULT_PLAN,monthly:500});
  assert.equal(faster.count,6);assert.equal(faster.finish,'2027-04');assert.equal(faster.buffer,20);assert.equal(faster.withinReserve,false);
  const slower=calculate({...DEFAULT_PLAN,monthly:250});
  assert.equal(slower.count,12);assert.equal(slower.finish,'2027-10');assert.equal(slower.early,-2);
  assert.equal(slower.minimumToDeadline,300);
});
test('final transfer is reduced to avoid overshooting, including cents and existing savings', () => {
  const p={...DEFAULT_PLAN,target:3000.23,saved:105.15,monthly:400};
  const r=calculate(p);
  assert.equal(r.count,8);assert.equal(r.lastAmount,95.08);
  assert.equal(r.schedule.at(-1).cumulative,3000.23);
});
test('a single contribution closes a small goal without a zero transfer', () => {
  const r=calculate({...DEFAULT_PLAN,target:100,monthly:375});
  assert.equal(r.count,1);assert.equal(r.lastAmount,100);assert.equal(r.finish,'2026-11');
});
test('invalid capacity, dates and amounts cannot create a plan', () => {
  for (const change of [{monthly:521},{monthly:0},{monthly:NaN},{saved:3000},{deadline:'2026-10'},{start:'2026-13'},{capacity:0},{reserve:520}]) assert.throws(()=>calculate({...DEFAULT_PLAN,...change}));
});
test('a goal beyond capacity produces a truthful late projection', () => {
  const p={...DEFAULT_PLAN,target:9000};
  p.monthly=suggestContribution(p);
  const r=calculate(p);assert.equal(p.monthly,375);assert.ok(r.early<0);assert.equal(r.schedule.at(-1).cumulative,9000);
});
test('stored plans are validated and corrupted storage falls back safely', () => {
  assert.equal(restorePlan('not-json'),null);
  assert.equal(restorePlan(JSON.stringify({version:2,plan:DEFAULT_PLAN})),null);
  assert.equal(restorePlan(JSON.stringify({version:1,plan:{...DEFAULT_PLAN,monthly:-1}})),null);
  const restored=restorePlan(JSON.stringify({version:1,plan:{...DEFAULT_PLAN,active:true,paused:true}}));
  assert.equal(restored.active,true);assert.equal(restored.paused,true);
});
test('month labels are stable across local timezones',()=>{assert.equal(monthLabel('2026-11'),'Nov 2026');});
