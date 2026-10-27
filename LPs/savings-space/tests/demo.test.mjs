import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialDemo,understandIntent,setContribution,confirmPlan,SAMPLE_REQUEST} from '../dist/demo-state.mjs';
import {calculate} from '../dist/plan.mjs';
test('natural request becomes the approved financial scenario',()=>{
  const plan=understandIntent(SAMPLE_REQUEST),r=calculate(plan);
  assert.equal(plan.target,3000);assert.equal(plan.monthly,375);assert.equal(r.finish,'2027-06');assert.equal(r.buffer,145);
});
test('custom holiday goal produces a new recommendation and explains late finish honestly',()=>{
  const plan=understandIntent('Save €4,000 for a holiday next summer');
  assert.equal(plan.target,4000);assert.equal(plan.monthly,375);assert.equal(calculate(plan).finish,'2027-09');
});
test('unhandled intent and invalid amounts do not silently become a holiday recommendation',()=>{
  for(const text of ['Hi','Buy a car for €3,000','I want a holiday next summer','€0 for a holiday','€100001 for a holiday'])assert.throws(()=>understandIntent(text));
});
test('adjustment preserves goal and updates buffer, date and final transfer',()=>{
  const state=setContribution(initialDemo(),300),r=calculate(state.plan);
  assert.equal(state.plan.target,3000);assert.equal(r.count,10);assert.equal(r.finish,'2027-08');assert.equal(r.buffer,220);
  const custom=calculate(setContribution(state,325).plan);
  assert.equal(custom.lastAmount,75);assert.equal(custom.count,10);assert.equal(custom.buffer,195);
});
test('approval is required and every contribution change revokes it',()=>{
  const state=initialDemo();assert.throws(()=>confirmPlan(state));
  const approved={...state,approved:true};
  assert.equal(confirmPlan(approved).created,true);
  assert.equal(setContribution(approved,300).approved,false);
  assert.throws(()=>confirmPlan(setContribution(approved,300)));
});
