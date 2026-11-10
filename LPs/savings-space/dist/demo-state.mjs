import {DEFAULT_PLAN, calculate, suggestContribution} from './plan.mjs';
export const SAMPLE_REQUEST = 'I want to save €3,000 for a holiday next summer, but I don’t know how much I can afford to save every month.';
export function initialDemo(){return {plan:{...DEFAULT_PLAN},step:0,request:SAMPLE_REQUEST,approved:false,created:false};}
export function understandIntent(request){
  const text=String(request).trim();
  if(text.length<12)throw new Error('Tell us a little more about your savings goal.');
  if(text.length>500)throw new Error('Keep your request under 500 characters.');
  const match=text.match(/(?:€\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:euros?\b|eur\b))/i);
  if(!match)throw new Error('Include a goal amount, for example “€3,000 for a holiday next summer”.');
  if(!/\b(?:summer|holiday|vacation|trip|travel|ferias|viagem|viajar|verao)\b/i.test(text.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))throw new Error('This focused demo supports holiday savings. Try a request with a euro amount and “holiday next summer”.');
  const amount=match[1]||match[2];
  // Accept 3,000 / 3.000 and decimal amounts in either language.
  const grouped=/^\d{1,3}([.,])\d{3}(?:\1\d{3})*(?:[.,]\d{1,2})?$/.test(amount);
  const normalised=grouped?amount.replace(/[.,](?=\d{3}(?:[.,]|$))/g,'').replace(',','.'):amount.replace(',','.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(normalised))throw new Error('Enter a valid amount.');
  const target=Number(normalised);
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
