import {DEFAULT_PLAN,calculate,euros,monthLabel,timingLabel,suggestContribution} from './plan.mjs';
import {initialDemo,understandIntent,setContribution,confirmPlan} from './demo-state.mjs';
const prototype=document.querySelector('#prototype');
const dialog=document.querySelector('#explanation');
const stepLabels=['Express an intent','Understand the plan','Explore the recommendation','Choose your contribution','Review & approve','Plan created'];
const stories=[
  'The request includes a goal amount and a holiday. The demo assumes August 2027; it does not analyse an account.',
  'The reply states the assumed deadline and €520 monthly capacity before showing the plan.',
  'Check the monthly contribution, finish date and remaining buffer. The shield opens the calculation details.',
  'Choose €300 instead of €375. The buffer becomes €220 and the finish moves from June to August.',
  'The amount and dates must match your choice. Confirmation is disabled until you check the approval box.',
  'The result shows the chosen amount, first transfer date and buffer. No transfer has actually been scheduled.'
];
let state=initialDemo();
let draft=null;
let stepBeforeAdjust=2;
let lastFocus=null;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
  back:'<path d="m14 6-6 6 6 6M8 12h13"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  sliders:'<path d="M4 6h5m4 0h7M4 12h9m4 0h3M4 18h2m4 0h10M9 3v6m4 0v6M6 15v6"/>',
  shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.5-5A8.5 8.5 0 1 1 21 11.5Z"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>';
const primary=(label,action,disabled=false)=>'<button class="app-primary" type="button" data-demo="'+action+'"'+(disabled?' disabled':'')+'>'+label+icon('arrow')+'</button>';
const trust=text=>'<p class="app-trust">'+icon('lock')+text+'</p>';
const actions=(content)=>'<div class="app-actions">'+content+'</div>';
function top(title='Savings Space',back=true){return '<div class="app-top"><div class="app-status" aria-hidden="true"><span>9:41</span><img src="./assets/status.svg" alt=""></div><div class="app-nav">'+(back?'<button class="app-icon-button" type="button" data-demo="back" aria-label="Previous step">'+icon('back')+'</button>':'<span style="width:35px"></span>')+'<span>'+title+'</span><button class="app-icon-button" type="button" data-demo="explain" aria-label="How this demo works">'+icon('more')+'</button></div></div>';}
function shell(content,{title='Savings Space',hero=false,back=true,preview=false}={}){
  const p=preview?DEFAULT_PLAN:state.plan;
  const heroContent=hero?'<div class="app-top"><header class="app-goal"><div><h2>Summer<br>holiday</h2><p>'+euros(p.target)+' goal · Aug 2027</p></div><img src="./assets/summer-space.svg" alt=""></header></div>':'';
  return top(title,back)+heroContent+'<div class="app-sheet '+(hero?'':'tall')+'">'+content+'</div><div class="app-home" aria-hidden="true"></div>';
}
function chart(p,r){
  const mid=Math.max(0,Math.ceil(r.count/2)-1);
  const entries=[r.schedule[0],r.schedule[mid],r.schedule.at(-1)];
  const points=r.schedule.map((item,i)=>[r.count===1?332:8+i/(r.count-1)*324,56-item.cumulative/p.target*48]);
  const line=points.map(([x,y])=>x.toFixed(2)+','+y.toFixed(2)).join(' ');
  const circles=points.filter((_,i)=>i===0||i===points.length-1||i%Math.max(1,Math.ceil(points.length/12))===0).map(([x,y],i,a)=>'<circle cx="'+x+'" cy="'+y+'" r="'+(i===a.length-1?3.6:2.7)+'" fill="'+(i===a.length-1?'#075e57':'white')+'" stroke="#075e57" stroke-width="1.3"/>').join('');
  const showEntries=r.count<3?[r.schedule[0],...(r.count===2?[r.schedule[1]]:[])]:entries;
  return '<div class="app-timeline"><div class="app-timeline-head">Projected timeline<span class="'+(r.early<0?'late':'')+'">'+timingLabel(r)+'</span></div><svg class="app-chart" viewBox="0 0 340 62" role="img" aria-label="Projected savings reach '+euros(p.target)+' in '+monthLabel(r.finish,true)+'"><path d="M8 8H332M8 32H332M8 56H332" stroke="#dce3dd" stroke-dasharray="1 5"/><polygon points="8,60 '+line+' 332,60" fill="#dce9e2"/><polyline points="'+line+'" fill="none" stroke="#075e57" stroke-width="1.8"/>'+circles+'</svg><div class="app-milestones">'+showEntries.map(item=>'<span>'+euros(item.cumulative)+'<small>'+monthLabel(item.month)+'</small></span>').join('')+'</div></div>';
}
function budget(p,r,preview=false){return '<div class="app-budget"><div class="app-budget-heading"><span>'+euros(p.capacity)+' estimated monthly capacity</span>'+(preview?'<span>'+icon('shield')+'</span>':'<button type="button" data-demo="explain" aria-label="Explain the capacity estimate">'+icon('shield')+'</button>')+'</div><div class="app-budget-bar"><span style="width:'+Math.min(100,p.monthly/p.capacity*100)+'%"></span></div><div class="app-budget-legend"><span>'+euros(p.monthly)+' to your goal</span><span>'+euros(r.buffer)+' buffer</span></div></div><p class="app-estimate-note">Estimate based on sample account activity.</p>';}
function warning(r){return r.early<0?'<p class="app-warning">This reaches your goal after August 2027. Save at least '+euros(r.minimumToDeadline)+' a month to finish on time.</p>':'';}
function recommendation(preview=false){
  const p=preview?DEFAULT_PLAN:state.plan,r=calculate(p);
  const adjust=preview?'<span style="font-size:8px;color:var(--action)">☷ &nbsp; Adjust</span>':'<button type="button" class="app-link" data-demo="adjust">'+icon('sliders')+'Adjust</button>';
  const content='<div class="app-label-row"><h3 class="app-label">Recommended plan</h3>'+adjust+'</div><p class="app-amount">'+euros(p.monthly)+'<small>/ month</small></p><p class="app-caption">'+r.count+' transfers · '+monthLabel(p.start)+' – '+monthLabel(r.finish)+'</p>'+chart(p,r)+budget(p,r,preview)+warning(r)+'<p class="app-recommendation-note">'+(r.early>0?euros(p.monthly)+' a month gets you there '+timingLabel(r)+', with '+euros(r.buffer)+' left as a buffer.':euros(p.monthly)+' a month leaves '+euros(r.buffer)+' as a buffer. Your goal is reached in '+monthLabel(r.finish)+'.')+'</p>'+actions((preview?'<div class="app-primary">Review plan &nbsp; →</div>':primary('Review plan','review'))+trust('Nothing moves until you confirm.'));
  return shell(content,{hero:true,preview});
}
function goal(){return shell('<span class="app-eyebrow">EVERYDAY BANKING</span><h2 class="app-heading" id="demo-title">What are you<br>saving for?</h2><p class="app-subheading">Describe your goal and when you need the money.</p><form class="app-goal-form" id="intent-form"><div class="app-composer"><label class="sr-only" for="intent">Your holiday savings request</label><textarea id="intent" name="intent" maxlength="500" required>'+escape(state.request)+'</textarea><span>Editable example · Holiday savings demo</span></div><p class="app-hint">Try your own euro amount for a holiday.<br>The demo assumes an August 2027 deadline.</p><p class="app-form-error" id="intent-error" role="alert"></p>'+actions('<button type="submit" class="app-primary">Send request '+icon('arrow')+'</button>'+trust('You approve every action.'))+'</form>',{title:'Your bank',back:false});}
function understand(){const p=state.plan,r=calculate(p);return shell('<h2 class="app-heading" id="demo-title">Your holiday goal</h2><p class="app-subheading">Your holiday · Summer 2027</p><div class="app-message">'+escape(state.request)+'</div><div class="app-assistant-label">'+icon('chat')+'Banking assistant</div><p class="app-response">The plan uses the €520 available each month in this example. You can change how much goes towards the holiday.</p>'+budget(p,r)+'<p class="app-assumption">I’ve used August 2027 for “next summer”.<br>You can change your contribution in the plan.</p>'+actions(primary('See my plan','plan')+trust('Nothing happens without your approval.')),{title:'Banking assistant'});}
function summary(p){const r=calculate(p);return '<div class="app-adjust-summary"><div><span>Goal reached</span><strong>'+monthLabel(r.finish,true)+'</strong></div><div><span>Monthly buffer</span><strong>'+euros(r.buffer)+'</strong></div></div>'+warning(r)+(r.buffer<145?'<p class="app-warning">This leaves less than the recommended €145 buffer.</p>':'');}
function choice(label,amount,caption){return '<button class="app-choice '+(draft.monthly===amount?'active':'')+'" type="button" data-contribution="'+amount+'" aria-pressed="'+(draft.monthly===amount)+'"><strong>'+label+'</strong><small>'+euros(amount)+'/month · '+caption+'</small></button>';}
function adjust(){const suggested=suggestContribution(state.plan),onTime=Math.ceil(calculate(state.plan).minimumToDeadline),suggestedResult=calculate({...draft,monthly:suggested});return shell('<h2 class="app-heading" id="demo-title">Adjust monthly savings</h2><p class="app-subheading">Change the amount to compare the date and buffer.</p><form id="adjust-form"><label class="app-field-label" for="contribution">Monthly contribution</label><div class="app-adjust-amount"><span aria-hidden="true">€</span><input id="contribution" name="contribution" type="number" min="1" max="520" step="1" value="'+draft.monthly+'" required inputmode="numeric"><small>/ month</small></div><label class="sr-only" for="contribution-range">Adjust monthly contribution</label><input class="app-range" id="contribution-range" type="range" min="1" max="520" step="1" value="'+draft.monthly+'">'+choice(suggestedResult.early>0?'Finish earlier':'Keep the recommended buffer',suggested,monthLabel(suggestedResult.finish))+(onTime!==suggested&&onTime<=520?choice(onTime<suggested?'More breathing room':'Meet the deadline',onTime,monthLabel(calculate({...draft,monthly:onTime}).finish)):'')+'<div id="adjust-summary" aria-live="polite">'+summary(draft)+'</div><p class="app-form-error" id="adjust-error" role="alert"></p></form>'+actions('<button class="app-primary" type="submit" form="adjust-form">Apply to my plan '+icon('arrow')+'</button><button class="app-secondary" type="button" data-demo="cancel-adjust">Back to my plan</button>'),{title:'Summer holiday'});}
function review(){const p=state.plan,r=calculate(p);return shell('<h2 class="app-heading" id="demo-title">Review your savings plan</h2><p class="app-subheading">Check the transfer details, then approve the plan.</p><div class="app-review-card"><span>To · Summer holiday</span><p class="app-amount">'+euros(p.monthly)+'<small>/ month</small></p></div><dl class="app-details"><div><dt>From</dt><dd>Main account · Demo</dd></div><div><dt>First transfer</dt><dd>1 November 2026</dd></div><div><dt>Frequency</dt><dd>Monthly, on the 1st</dd></div><div><dt>Final transfer</dt><dd>'+euros(r.lastAmount)+' · 1 '+monthLabel(r.finish)+'</dd></div><div><dt>Transfers</dt><dd>'+r.count+'</dd></div><div><dt>Total to save</dt><dd>'+euros(p.target)+'</dd></div></dl>'+warning(r)+'<label class="app-consent"><input id="approval" type="checkbox"'+(state.approved?' checked':'')+'><span>I’ve reviewed the amount and dates. Create this demo savings plan.</span></label><p class="app-demo-note">Demo only. No bank account is connected.<br>You could pause or change a real plan later.</p>'+actions(primary('Confirm demo plan','confirm',!state.approved)+'<button type="button" class="app-secondary" data-demo="adjust">Make an adjustment</button>'),{title:'Review plan'});}
function success(){const p=state.plan,r=calculate(p);return shell('<div class="app-success-icon" aria-hidden="true">✓</div><span class="app-eyebrow">DEMO PLAN CREATED</span><h2 class="app-heading" id="demo-title">Your savings plan<br>is ready.</h2><p class="app-success-lead">'+euros(p.target)+' by '+monthLabel(r.finish,true)+'</p><div class="app-success-card"><div><span>First scheduled transfer</span><strong>'+euros(Math.min(p.monthly,p.target))+'</strong></div><span>1 November 2026</span></div><p class="app-buffer-note"><span>Your monthly buffer</span><strong>'+euros(r.buffer)+'</strong></p><p class="app-demo-note">Simulation only. No money has moved.</p>'+actions(primary('View my plan','plan')+'<button type="button" class="app-secondary" data-demo="reset">Start a new demo</button>'));}
function render({focus=false,announce=true}={}){
  const screens=[goal,understand,recommendation,adjust,review,success];
  prototype.innerHTML=screens[state.step]();
  const header=prototype.firstElementChild;
  const home=prototype.querySelector('.app-home');
  const footer=prototype.querySelector('.app-actions');
  // Keep the primary action visible without losing its form association.
  if(footer){
    const form=footer.closest('form');
    if(form){footer.querySelectorAll('button[type="submit"]').forEach(button=>button.setAttribute('form',form.id));}
    footer.remove();
  }
  const screenBody=document.createElement('div');
  screenBody.className='app-scroll';
  screenBody.tabIndex=0;
  screenBody.setAttribute('role','region');
  screenBody.setAttribute('aria-label','Banking screen details');
  for(const child of [...prototype.children]){
    if(child!==header&&child!==home)screenBody.append(child);
  }
  prototype.append(screenBody);
  if(footer)prototype.append(footer);
  prototype.append(home);
  prototype.scrollTop=0;
  prototype.querySelector('.app-sheet').classList.add('app-fade');
  document.querySelector('#step-nav').innerHTML=stepLabels.map((label,i)=>'<button type="button" data-step="'+i+'" class="'+(state.step===i?'active':'')+'"'+(state.step===i?' aria-current="step"':'')+(i===5&&!state.created?' disabled':'')+'><span>'+String(i+1).padStart(2,'0')+'</span>'+label+'</button>').join('');
  document.querySelector('#step-story').textContent=stories[state.step];
  if(announce)document.querySelector('#demo-announcement').textContent='Step '+(state.step+1)+' of 6. '+stepLabels[state.step];
  if(focus){prototype.querySelector('#demo-title')?.setAttribute('tabindex','-1');(prototype.querySelector('#demo-title')||prototype).focus({preventScroll:true});}
}
function go(step){
  if(step===5&&!state.created)return;
  if(step===3){draft={...state.plan};stepBeforeAdjust=state.step===4?4:2;}
  if(step===4)state.approved=false;
  state.step=step;render({focus:true});
  const device=prototype.closest('.device');
  const rect=device.getBoundingClientRect();
  const headerBottom=document.querySelector('.site-header').getBoundingClientRect().bottom;
  if(rect.top<headerBottom+12||rect.bottom>window.innerHeight-12){
    device.scrollIntoView({block:'start',behavior:'instant'});
  }
}
function explain(){
  const p=state.step===3?draft:state.plan,r=calculate(p);
  document.querySelector('#explanation-body').innerHTML='<p>The €520 monthly capacity is a fixed, fictitious estimate after regular spending. It is not connected to a bank account.</p><div class="dialog-numbers"><div><strong>'+euros(p.monthly)+'</strong><span>Monthly savings</span></div><div><strong>'+euros(r.buffer)+'</strong><span>Remaining buffer</span></div></div><p>'+r.count+' monthly transfers from November 2026 reach '+euros(p.target)+' in '+monthLabel(r.finish,true)+'. The final transfer is adjusted to reach the goal exactly. No interest, fees or income changes are included.</p><p>The recommendation aims to finish two months early while keeping a €145 buffer. Responses are scripted; this demo has no AI model or bank connection.</p>';
  lastFocus=document.activeElement;dialog.showModal();
}
document.addEventListener('click',event=>{
  const step=event.target.closest('[data-step]');
  if(step){go(Number(step.dataset.step));return;}
  const choiceNode=event.target.closest('[data-contribution]');
  if(choiceNode){updateDraft(Number(choiceNode.dataset.contribution));return;}
  const control=event.target.closest('[data-demo]');if(!control)return;
  const action=control.dataset.demo;
  if(action==='reset'){state=initialDemo();draft=null;go(0);}
  else if(action==='back')go(state.step===3?stepBeforeAdjust:Math.max(0,state.step-1));
  else if(action==='plan')go(2);
  else if(action==='review')go(4);
  else if(action==='adjust')go(3);
  else if(action==='cancel-adjust')go(stepBeforeAdjust);
  else if(action==='explain')explain();
  else if(action==='close')dialog.close();
  else if(action==='confirm'){
    try{state=confirmPlan(state);go(5);}catch{document.querySelector('#demo-announcement').textContent='Review and approve your plan first.';}
  }
});
document.addEventListener('submit',event=>{
  if(event.target.id==='intent-form'){
    event.preventDefault();const value=document.querySelector('#intent').value;
    try{state.plan=understandIntent(value);state.request=value.trim();state.created=false;state.approved=false;go(1);}catch(error){document.querySelector('#intent-error').textContent=error.message;}
  }
  if(event.target.id==='adjust-form'){
    event.preventDefault();
    try{state=setContribution(state,document.querySelector('#contribution').value);go(2);}catch(error){document.querySelector('#adjust-error').textContent=error.message;}
  }
});
function updateDraft(value,{fromInput=false}={}){
  if(!Number.isFinite(value)||value<1||value>520){document.querySelector('#adjust-error').textContent='Choose a monthly amount between €1 and €520.';return;}
  try{calculate({...draft,monthly:value});}catch(error){document.querySelector('#adjust-error').textContent=error.message;return;}
  document.querySelector('#adjust-error').textContent='';
  draft.monthly=value;
  if(!fromInput)document.querySelector('#contribution').value=value;
  document.querySelector('#contribution-range').value=value;
  document.querySelector('#adjust-summary').innerHTML=summary(draft);
  prototype.querySelectorAll('[data-contribution]').forEach(button=>{const active=Number(button.dataset.contribution)===value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
}
document.addEventListener('input',event=>{
  if(event.target.id==='contribution')updateDraft(Number(event.target.value),{fromInput:true});
  if(event.target.id==='contribution-range')updateDraft(Number(event.target.value));
});
document.addEventListener('change',event=>{
  if(event.target.id==='approval'){
    state.approved=event.target.checked;
    prototype.querySelector('[data-demo="confirm"]').disabled=!state.approved;
  }
  if(event.target.id==='handoff-approval'){
    const approved=event.target.checked;
    document.querySelector('#handoff-confirm').disabled=!approved;
    document.querySelector('#handoff-status').textContent=approved?'Enabled. The review screen has supplied approval.':'Disabled until approval is checked.';
  }
});
document.querySelector('#handoff-confirm').addEventListener('click',()=>{
  document.querySelector('#handoff-status').textContent='Demo callback received. No plan or transfer was created.';
});
dialog.addEventListener('close',()=>lastFocus?.focus({preventScroll:true}));
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
function fitPhone(){
  const device=document.querySelector('.device');
  const stage=document.querySelector('.prototype-stage');
  const headerHeight=document.querySelector('.site-header').getBoundingClientRect().height;
  const before=device.getBoundingClientRect();
  const keepInView=prototype.contains(document.activeElement)&&before.bottom>headerHeight&&before.top<window.innerHeight;
  // 402 × 874 logical screen, plus a 10 px frame on each edge.
  const scale=Math.max(.35,Math.min(1,(stage.clientWidth-10)/422,(window.innerHeight-headerHeight-58)/894));
  const value=scale.toFixed(4);
  if(device.style.getPropertyValue('--phone-scale')!==value){
    device.style.setProperty('--phone-scale',value);
    const after=device.getBoundingClientRect();
    if(keepInView&&(after.top<headerHeight+12||after.bottom>window.innerHeight-12))device.scrollIntoView({block:'start',behavior:'instant'});
  }
}
render({announce:false});
fitPhone();
window.addEventListener('resize',fitPhone,{passive:true});
if('ResizeObserver' in window){new ResizeObserver(()=>requestAnimationFrame(fitPhone)).observe(document.querySelector('.prototype-stage'));}
