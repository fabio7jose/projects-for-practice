import {DEFAULT_PLAN, calculate, suggestContribution} from './plan.mjs';
export const SAMPLE_REQUEST = 'I want to save €3,000 for a holiday next summer, but I don’t know how much I can afford to save every month.';
export function initialDemo(){return {plan:{...DEFAULT_PLAN},step:0,request:SAMPLE_REQUEST,approved:false,created:false};}
export function understandIntent(request){
  const text=String(request).trim();
  if(text.length<12)throw new Error('Tell us a little more about your savings goal.');
  if(text.length>500)throw new Error('Keep your request under 500 characters.');
  const match=text.match(/(?:€\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:euros?\b|eur\b))/i);
  if(!match)throw new Error('Include a goal amount, for example “€3,000 for a holiday next summer”.');
  if(!/\b(?:summer|holiday|vacation|trip|travel)\b/i.test(text))throw new Error('This focused demo supports holiday savings. Try a request with a euro amount and “holiday next summer”.');
  const target=Number((match[1]||match[2]).replaceAll(',',''));
  const plan={...DEFAULT_PLAN,target};
  plan.monthly=suggestContribution(plan);
  calculate(plan);
  return plan;
}
export function setContribution(state,monthly){
  const plan={...state.plan,monthly:Number(monthly)};
  calculate(plan);
  return {...state,plan,approved:false,created:false};
}
export function confirmPlan(state){
  if(!state.approved)throw new Error('Review and approve your plan first.');
  calculate(state.plan);
  return {...state,step:5,created:true};
}
