import { CARD_COUNT, LOVE_START, dateValue, todayValue, nextAnniversary, drawCard } from './core.js?v=5';
try{if(sessionStorage.getItem('chenchen-book-view')==='flat')document.body.dataset.bookView='flat';}catch{}
try{sessionStorage.removeItem('chenchen-book-turn');}catch{}
let gameRules = null;
try {
  const response=await fetch('./game-config.json?v=4',{cache:'no-store'});
  if(!response.ok)throw new Error('Configuration unavailable');
  const rules=await response.json();
  if(!Number.isInteger(rules.chances)||rules.chances<1||rules.chances>CARD_COUNT||!Array.isArray(rules.rewards)||!rules.rewards.length||rules.rewards.length>50||rules.rewards.some(r=>typeof r!=='string'||!r.trim()||r.length>120))throw new Error('Invalid configuration');
  gameRules={limit:rules.chances,rewards:rules.rewards.map(r=>r.trim()),version:JSON.stringify([rules.revision,rules.chances,rules.rewards])};
}catch{}
const $ = id => document.getElementById(id);
const KEY = 'chenchen-doudou.v1';
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function freshState() { return { start: LOVE_START, interval: 1, custom: '', wishes: [], game: { limit: gameRules?.limit || 0, version: gameRules?.version || '', draws: [] } }; }
function normalize(data) {
  const s = freshState();
  if (!data || typeof data !== 'object') return s;
  s.start = LOVE_START;
  s.custom = dateValue(data.custom) !== null ? data.custom : '';
  s.interval = [1,6,12].includes(data.interval) ? data.interval : 1;
  s.wishes = Array.isArray(data.wishes) ? data.wishes.filter(w => w && typeof w.text === 'string' && w.text.trim()).slice(0,200).map(w => ({id: uid(), text: w.text.trim().slice(0,120), done: w.done === true})) : [];
  const game = data.game;
  if (gameRules && game && game.version === gameRules.version) {
    const seen = new Set();
    if (Array.isArray(game.draws)) s.game.draws = game.draws.filter(d => { if (!d || !Number.isInteger(d.index) || d.index < 0 || d.index >= CARD_COUNT || !gameRules.rewards.includes(d.reward) || seen.has(d.index)) return false; seen.add(d.index); return true; }).slice(0,gameRules.limit).map(d => ({index:d.index,reward:d.reward}));
  }
  return s;
}
let state;
try { state = normalize(JSON.parse(localStorage.getItem(KEY))); } catch { state = freshState(); }
let wishPage=0;
const wishPageSize=3;
const listPages={history:0,pool:0};
function paginateList(node,items,key,makeItem){
  const size=3;listPages[key]=Math.min(listPages[key],Math.max(0,Math.ceil(items.length/size)-1));node.replaceChildren();
  items.slice(listPages[key]*size,(listPages[key]+1)*size).forEach((item,i)=>node.append(makeItem(item,listPages[key]*size+i)));
  let pager=document.getElementById(`${key}-pager`);if(!pager){pager=document.createElement('div');pager.id=`${key}-pager`;pager.className='inner-pager';node.after(pager);}pager.replaceChildren();
  if(items.length>size)for(const [label,delta] of [['←',-1],[`${listPages[key]+1} / ${Math.ceil(items.length/size)}`,0],['→',1]]){const button=document.createElement(delta?'button':'span');button.textContent=label;if(delta){button.type='button';button.disabled=listPages[key]+delta<0||(listPages[key]+delta)*size>=items.length;button.setAttribute('aria-label',`${delta<0?'上一页':'下一页'}${key==='pool'?'奖励池':'奖励记录'}`);button.addEventListener('click',()=>{listPages[key]+=delta;renderGame();});}pager.append(button);}
}
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('浏览器无法保存数据；关闭后可能丢失，请导出清单备份。'); } }
function formatDate(time) { const d = new Date(time); return `${d.getUTCFullYear()} 年 ${d.getUTCMonth()+1} 月 ${d.getUTCDate()} 日`; }
function setNumber(element, number, unit = '天') { element.replaceChildren(document.createTextNode(`${number} `)); const small = document.createElement('small'); small.textContent = unit; element.append(small); }
function renderTime() {
  const start = dateValue(LOVE_START), today = todayValue();
  if ($('home-days')) $('home-days').textContent = Math.max(0,Math.round((today-start)/86400000));
  if (!$('love-days')) return;
  if (start === null) {
    setNumber($('love-days'), '—'); setNumber($('countdown'), '—');
    $('love-days').previousElementSibling.textContent = '我们已经一起走过';
    $('love-since').textContent = '设置开始日期，让每一天都有名字。';
    $('anniversary-label').textContent = '下一个纪念日';
    $('anniversary-date').textContent = '下一份浪漫，正在路上。';
    return;
  }
  const days = Math.round((today-start)/86400000);
  setNumber($('love-days'), Math.abs(days));
  $('love-since').textContent = days >= 0 ? `从 ${formatDate(start)} 开始，每一天都算数。` : `距离 ${formatDate(start)}，还有 ${-days} 天。`;
  $('love-days').previousElementSibling.textContent = days >= 0 ? '我们已经一起走过' : '距离我们的故事开始';
  const custom = dateValue(state.custom);
  const target = custom ?? nextAnniversary(start, today, state.interval);
  const remaining = Math.round((target-today)/86400000);
  setNumber($('countdown'), Math.abs(remaining));
  $('anniversary-label').textContent = remaining < 0 ? '特别日子已经过去' : remaining === 0 ? '今天，就是我们的纪念日 ♡' : custom !== null ? '距离我们的特别日子' : ({1:'距离下一个月纪念日',6:'距离下一个半年纪念日',12:'距离下一个周年纪念日'})[state.interval];
  $('anniversary-date').textContent = `${formatDate(target)}${remaining === 0 ? ' · 今天值得庆祝！' : ''}`;
}
function renderWishes() {
  if (!$('wish-list')) return;
  $('wish-list').replaceChildren();
  if (!state.wishes.length) { const empty = document.createElement('li'); empty.className = 'empty-wishes'; empty.textContent = '第一份愿望，留给你们一起写。♡'; $('wish-list').append(empty); }
  wishPage=Math.min(wishPage,Math.max(0,Math.ceil(state.wishes.length/wishPageSize)-1));
  for (const wish of state.wishes.slice(wishPage*wishPageSize,(wishPage+1)*wishPageSize)) {
    const li = document.createElement('li'); li.className = `wish-item${wish.done ? ' done' : ''}`;
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = wish.done;
    checkbox.addEventListener('change', () => {wish.done = checkbox.checked; save(); renderWishes();});
    const text = document.createElement('span'); text.textContent = wish.text; label.append(checkbox,text);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'delete-wish'; button.textContent = '×'; button.setAttribute('aria-label', `删除愿望：${wish.text}`);
    button.addEventListener('click', () => { if (!confirm(`删除“${wish.text}”？`)) return; state.wishes = state.wishes.filter(w => w.id !== wish.id); save(); renderWishes(); });
    li.append(label,button); $('wish-list').append(li);
  }
  $('wish-progress').textContent = `${state.wishes.filter(w => w.done).length} / ${state.wishes.length} 已完成`;
  let pager=$('wish-pager');if(!pager){pager=document.createElement('div');pager.id='wish-pager';pager.className='inner-pager';$('wish-list').after(pager);}
  pager.replaceChildren();
  if(state.wishes.length>wishPageSize){for(const [label,delta] of [['←',-1],[`${wishPage+1} / ${Math.ceil(state.wishes.length/wishPageSize)}`,0],['→',1]]){const node=document.createElement(delta?'button':'span');node.textContent=label;if(delta){node.type='button';node.disabled=wishPage+delta<0||(wishPage+delta)*wishPageSize>=state.wishes.length;node.setAttribute('aria-label',delta<0?'上一页愿望':'下一页愿望');node.addEventListener('click',()=>{wishPage+=delta;renderWishes();});}pager.append(node);}}
  queueMicrotask(fitBook);
}
function renderGame() {
  if (!$('card-grid')) return;
  if(!gameRules){$('game-status').textContent='惊喜暂时没准备好，请稍后刷新再来。';$('restart-game').disabled=true;return;}
  const {game} = state; const remaining = game.limit-game.draws.length;
  setNumber($('chance-count'), remaining, `/ ${game.limit}`);
  $('card-grid').replaceChildren();
  for (let index = 0; index < CARD_COUNT; index++) {
    const draw = game.draws.find(d => d.index === index);
    const card = document.createElement('button'); card.type = 'button'; card.className = `draw-card${draw ? ' revealed' : ''}`; card.disabled = !!draw || remaining <= 0;
    card.setAttribute('aria-label', draw ? `第 ${index+1} 张卡，奖励：${draw.reward}` : `抽取第 ${index+1} 张卡`);
    const icon = document.createElement('span'); icon.className = 'card-icon'; icon.textContent = draw ? '✦' : '♡';
    const title = document.createElement('span'); title.className = 'card-title'; title.textContent = draw ? draw.reward : '一份心动';
    const serial = document.createElement('span'); serial.className = 'card-serial'; serial.textContent = draw ? 'YOUR LITTLE GIFT' : `CUPID / ${String(index+1).padStart(2,'0')}`;
    card.append(icon,title,serial);
    card.addEventListener('click', event => {
      state.game.limit=gameRules.limit;
      const result = drawCard(state.game,index,gameRules.rewards);
      if (!result) return;
      listPages.history=Math.floor((state.game.draws.length-1)/3);
      save(); renderGame(); $('reward-result').textContent = result.reward; $('reward-dialog').showModal();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (let n=0;n<12;n++) { const heart=document.createElement('span'); heart.className='heart-particle'; heart.textContent=n%3?'♥':'✦'; heart.style.setProperty('--dx',`${(Math.random()-.5)*320}px`); heart.style.setProperty('--dy',`${-80-Math.random()*170}px`); heart.style.left=`${event.clientX || innerWidth/2}px`; heart.style.top=`${event.clientY || innerHeight/2}px`; document.body.append(heart); setTimeout(()=>heart.remove(),1100); }
      }
    });
    $('card-grid').append(card);
  }
  $('game-status').textContent = remaining ? `选一张心动的卡片吧，还可以抽 ${remaining} 次。` : '本轮惊喜已全部送达。点击“重新开始”，开启下一轮。';
  paginateList($('reward-history'),game.draws,'history',(draw,i)=>{const item=document.createElement('button');item.className='reward-entry';item.type='button';item.textContent=`${i+1}. ${draw.reward}`;item.title=draw.reward;item.addEventListener('click',()=>{$('reward-result').textContent=draw.reward;$('reward-dialog').showModal();});return item;});
  if($('reward-pool-preview'))paginateList($('reward-pool-preview'),gameRules.rewards,'pool',reward=>{const item=document.createElement('li');item.textContent=reward;item.title=reward;return item;});
  document.querySelector('.empty-gifts')?.classList.toggle('hidden',game.draws.length>0);
  queueMicrotask(fitBook);
}
$('open-settings')?.addEventListener('click', () => { $('anniversary-type').value = state.interval; $('custom-date').value = state.custom; $('settings-dialog').showModal(); });
$('settings-form')?.addEventListener('submit', event => {
  event.preventDefault();
  if ($('custom-date').value && dateValue($('custom-date').value) === null) { toast('请填写有效日期（1900～9998 年）。'); return; }
  state.start = LOVE_START; state.interval = Number($('anniversary-type').value); state.custom = $('custom-date').value;
  save(); renderTime(); $('settings-dialog').close(); toast('我们的日期已保存。');
});
$('wish-form')?.addEventListener('submit', event => {event.preventDefault(); const text = $('wish-input').value.trim(); if (!text) return; if(state.wishes.length >= 200) {toast('清单最多保存 200 个愿望。'); return;} state.wishes.push({id:uid(),text,done:false});wishPage=Math.floor((state.wishes.length-1)/wishPageSize); save(); renderWishes(); $('wish-input').value = '';});
$('export-wishes')?.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({version:1,wishes:state.wishes},null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '晨晨和豆豆的愿望清单.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
$('import-wishes')?.addEventListener('click', () => $('import-file').click());
$('import-file')?.addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 1024*1024) throw new Error();
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.wishes) || data.wishes.length > 200 || data.wishes.some(w => !w || typeof w.text !== 'string' || !w.text.trim() || w.text.length > 120 || typeof w.done !== 'boolean')) throw new Error();
    if (!confirm('导入会替换当前愿望清单，继续吗？')) return;
    state.wishes = normalize(data).wishes; save(); renderWishes(); toast('愿望清单已导入。');
  } catch { toast('导入失败，请选择本网页导出的有效清单文件（最多 1 MB）。'); }
  finally { event.target.value = ''; }
});
$('restart-game')?.addEventListener('click', () => { if (state.game.draws.length && !confirm('开始新一轮？本轮奖励记录将清空。')) return; state.game.draws = []; save(); renderGame(); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
window.addEventListener('storage', event => { if (event.key !== KEY) return; try {state = normalize(JSON.parse(event.newValue)); renderTime(); renderWishes(); renderGame();} catch {} });
renderTime(); renderWishes(); renderGame();
setInterval(renderTime,30000);
document.querySelectorAll('[data-wish]').forEach(button=>button.addEventListener('click',()=>{ $('wish-input').value=button.dataset.wish; $('wish-input').focus(); }));
if ($('calendar-grid')) {
  const current = new Date(todayValue());
  let month = new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),1));
  let flipping = false;
  function renderCalendar() {
    const year=month.getUTCFullYear(), m=month.getUTCMonth();
    $('calendar-year').textContent=year;
    $('calendar-month').textContent=`${m+1} 月`;
    $('calendar-grid').replaceChildren();
    const first=(month.getUTCDay()+6)%7, count=new Date(Date.UTC(year,m+1,0)).getUTCDate();
    for(let i=0;i<42;i++) {
      const time=Date.UTC(year,m,i-first+1), date=new Date(time), day=date.getUTCDate();
      const cell=document.createElement('span'); cell.className='calendar-day'; cell.textContent=day;
      const outside=i<first || i>=first+count;
      if(outside)cell.classList.add('outside');
      if(time===todayValue())cell.classList.add('today');
      if(!outside && day===15 && time>=dateValue(LOVE_START))cell.classList.add('love-day');
      cell.setAttribute('aria-label',`${formatDate(time)}${time===todayValue()?'，今天':''}${cell.classList.contains('love-day')?'，我们的纪念日':''}`);
      $('calendar-grid').append(cell);
    }
  }
  function turn(direction, reset=false) {
    if(flipping)return;
    const next=reset?new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth(),1)):new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+direction,1));
    if(next.getUTCFullYear()<1900 || next.getUTCFullYear()>9998)return;
    month=next;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){renderCalendar();return;}
    flipping=true; const sheet=$('calendar-sheet'); sheet.classList.add('turning');
    setTimeout(()=>{renderCalendar();sheet.classList.remove('turning');sheet.classList.add('arriving');setTimeout(()=>{sheet.classList.remove('arriving');flipping=false;},230);},170);
  }
  $('calendar-prev').addEventListener('click',()=>turn(-1));
  $('calendar-next').addEventListener('click',()=>turn(1));
  $('calendar-today').addEventListener('click',()=>turn(0,true));
  renderCalendar();
}
const bookPages=['index.html','anniversaries.html','wishes.html','cupid.html'];
let pageTurning=false;
document.addEventListener('click',async event=>{
  const link=event.target.closest('a[data-book-link]');
  if(!link || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target==='_blank')return;
  const target=new URL(link.href,location.href), file=target.pathname.split('/').pop();
  if(target.origin!==location.origin || !bookPages.includes(file))return;
  if(file===document.body.dataset.page){event.preventDefault();return;}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  event.preventDefault();if(pageTurning)return;pageTurning=true;
  const direction=bookPages.indexOf(file)<bookPages.indexOf(document.body.dataset.page)?'back':'next';
  const spread=$('book-spread');
  spread.setAttribute('aria-busy','true');
  try{
    const response=await fetch(target.href,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Page unavailable');
    const nextDocument=new DOMParser().parseFromString(await response.text(),'text/html');
    preparePreview(nextDocument);
    const moving=direction==='back'?'.left-leaf':'.right-leaf';
    const landing=direction==='back'?'.right-leaf':'.left-leaf';
    const underneath=nextDocument.querySelector(moving);
    const back=nextDocument.querySelector(landing);
    if(!underneath||!back)throw new Error('Page unavailable');
    const sheet=document.createElement('div');sheet.className=`physical-sheet sheet-${direction}`;sheet.setAttribute('aria-hidden','true');sheet.inert=true;
    for(const [name,source] of [['front',spread.querySelector(moving)],['back',back]]){
      const face=document.createElement('div');face.className=`turn-face face-${name}`;face.dataset.page=name==='front'?document.body.dataset.page:file;
      const copy=source.cloneNode(true);copy.removeAttribute('id');copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
      face.append(copy);sheet.append(face);
    }
    spread.querySelector(moving).innerHTML=underneath.innerHTML;
    spread.inert=true;
    spread.append(sheet);
    fitBook();
    spread.classList.add(direction==='back'?'book-turn-back':'book-turn-next');
    releaseButterflies(30);
    requestAnimationFrame(()=>requestAnimationFrame(()=>sheet.classList.add('sheet-moving')));
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;location.assign(target.href);};
    sheet.addEventListener('transitionend',event=>{if(event.target===sheet&&event.propertyName==='transform')finish();});
    setTimeout(finish,1550);
  }catch{location.assign(target.href);}
});
function preparePreview(doc){
  const set=(id,text)=>{const node=doc.getElementById(id);if(node)node.textContent=text;};
  const today=todayValue(),start=dateValue(LOVE_START),days=Math.round((today-start)/86400000);
  set('home-days',days);set('love-days',`${days} 天`);set('love-since',`从 ${formatDate(start)} 开始，每一天都算数。`);
  const target=dateValue(state.custom)??nextAnniversary(start,today,state.interval),remaining=Math.round((target-today)/86400000);
  set('countdown',`${Math.abs(remaining)} 天`);set('anniversary-date',formatDate(target));
  const calendar=doc.getElementById('calendar-grid');
  if(calendar){
    const date=new Date(today),year=date.getUTCFullYear(),month=date.getUTCMonth(),first=(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7,count=new Date(Date.UTC(year,month+1,0)).getUTCDate();
    set('calendar-year',year);set('calendar-month',`${month+1} 月`);
    for(let i=0;i<42;i++){const time=Date.UTC(year,month,i-first+1),day=new Date(time).getUTCDate(),cell=doc.createElement('span');cell.className='calendar-day';cell.textContent=day;if(i<first||i>=first+count)cell.classList.add('outside');else if(day===15&&time>=start)cell.classList.add('love-day');if(time===today)cell.classList.add('today');calendar.append(cell);}
  }
  set('chance-count',`${gameRules?.limit-state.game.draws.length} / ${gameRules?.limit}`);
  const grid=doc.getElementById('card-grid');
  if(grid&&gameRules)for(let index=0;index<CARD_COUNT;index++){
    const draw=state.game.draws.find(d=>d.index===index),card=doc.createElement('button');card.className=`draw-card${draw?' revealed':''}`;
    const icon=doc.createElement('span');icon.className='card-icon';icon.textContent=draw?'✦':'♡';
    const title=doc.createElement('span');title.className='card-title';title.textContent=draw?.reward||'一份心动';
    const serial=doc.createElement('span');serial.className='card-serial';serial.textContent=`CUPID / ${String(index+1).padStart(2,'0')}`;
    card.append(icon,title,serial);grid.append(card);
  }
  const list=doc.getElementById('wish-list');
  if(list)for(const wish of state.wishes){const item=doc.createElement('li');item.className='wish-item';item.textContent=`${wish.done?'✓':'♡'} ${wish.text}`;list.append(item);}
  if(list&&!state.wishes.length){const item=doc.createElement('li');item.className='empty-wishes';item.textContent='第一份愿望，留给你们一起写。♡';list.append(item);}
  set('wish-progress',`${state.wishes.filter(w=>w.done).length} / ${state.wishes.length} 已完成`);
  const history=doc.getElementById('reward-history');
  if(history)for(const draw of state.game.draws){const item=doc.createElement('span');item.textContent=draw.reward;history.append(item);}
  const pool=doc.getElementById('reward-pool-preview');if(pool&&gameRules)for(const reward of gameRules.rewards){const item=doc.createElement('li');item.textContent=reward;pool.append(item);}
}
function releaseButterflies(count=26){
  const sky=$('butterfly-sky');if(!sky||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const rect=document.querySelector('.central-spine').getBoundingClientRect();
  const originX=Math.min(innerWidth-20,Math.max(20,rect.left+rect.width/2)),originY=Math.max(80,Math.min(innerHeight-60,rect.top+rect.height*.48));
  const colors=['#c980a8','#a895cd','#c9a267','#90b4b0','#d6a0aa'];
  for(let n=0;n<count;n++){
    const butterfly=document.createElement('span');butterfly.className='flying-butterfly';
    butterfly.style.left=`${originX}px`;butterfly.style.top=`${originY}px`;
    butterfly.style.setProperty('--flight-x',`${(Math.random()-.5)*innerWidth*1.5}px`);butterfly.style.setProperty('--flight-y',`${-110-Math.random()*innerHeight*.8}px`);
    butterfly.style.setProperty('--flutter-delay',`${-Math.random()}s`);butterfly.style.setProperty('--flight-delay',`${Math.random()*.55}s`);butterfly.style.setProperty('--sway',`${(Math.random()-.5)*150}px`);
    butterfly.style.color=colors[n%colors.length];butterfly.style.width=`${20+Math.random()*20}px`;
    butterfly.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><g class="butterfly-wing left-wing"><path d="M16 16C12 0 0 0 2 11C3 15 7 17 11 18C0 18 3 30 11 26C15 24 16 20 16 16Z"/></g><g class="butterfly-wing right-wing"><path d="M16 16C20 0 32 0 30 11C29 15 25 17 21 18C32 18 29 30 21 26C17 24 16 20 16 16Z"/></g><path d="M16 12L16 24M16 13L12 8M16 13L20 8" fill="none" stroke="#795b68" stroke-width="1" stroke-linecap="round"/></svg>';
    sky.append(butterfly);setTimeout(()=>butterfly.remove(),5100);
  }
}
const angleButton=$('book-angle');
function updateAngleButton(){if(!angleButton)return;const flat=document.body.dataset.bookView==='flat';angleButton.textContent=flat?'双页立体视角 ↗':'平视阅读 ↗';angleButton.setAttribute('aria-pressed',String(flat));}
angleButton?.addEventListener('click',()=>{const flat=document.body.dataset.bookView!=='flat';document.body.dataset.bookView=flat?'flat':'tilted';try{sessionStorage.setItem('chenchen-book-view',flat?'flat':'tilted');}catch{}updateAngleButton();});
updateAngleButton();
setTimeout(()=>releaseButterflies(),180);
document.addEventListener('keydown',event=>{
  if(event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || document.querySelector('dialog[open]') || event.target.matches('input,textarea,select,[contenteditable=true]'))return;
  const index=bookPages.indexOf(document.body.dataset.page);
  if(event.key==='ArrowRight'&&index<bookPages.length-1){event.preventDefault();document.querySelector(`.book-pagination a[href="./${bookPages[index+1]}"]`)?.click();}
  if(event.key==='ArrowLeft'&&index>0){event.preventDefault();document.querySelector(`.book-pagination a[href="./${bookPages[index-1]}"]`)?.click();}
});
function fitBook(){
  const desk=document.querySelector('.book-desk'),stage=document.querySelector('.book-stage');
  if(!desk||!stage)return;
  if(innerWidth>760){const scale=Math.min(1.45,(desk.clientWidth-34)/1200,(desk.clientHeight-34)/690);stage.style.setProperty('--viewport-scale',String(Math.max(.15,scale)));}
  document.querySelectorAll('.page-content').forEach(content=>{
    let wrapper=content.querySelector(':scope > .page-fit-wrapper');
    if(!wrapper){wrapper=document.createElement('div');wrapper.className='page-fit-wrapper';while(content.firstChild)wrapper.append(content.firstChild);content.append(wrapper);}
    wrapper.style.transform='none';wrapper.style.width='100%';
    const natural=wrapper.scrollHeight,available=content.clientHeight;
    const scale=natural?Math.min(1,(available-2)/natural):1;
    wrapper.style.transform=`scale(${Math.max(.1,scale)})`;
  });
}
window.addEventListener('resize',()=>requestAnimationFrame(fitBook));
new ResizeObserver(()=>requestAnimationFrame(fitBook)).observe(document.querySelector('.book-desk'));
requestAnimationFrame(fitBook);
