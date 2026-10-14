import { DEFAULT_REWARDS, dateValue, todayValue, dateString, nextAnniversary, drawCard } from './core.js';
const $ = id => document.getElementById(id);
const KEY = 'chenchen-doudou.v1';
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function freshState() { return { start: '', interval: 1, custom: '', wishes: [], rewards: [...DEFAULT_REWARDS], game: { limit: 3, draws: [] } }; }
function normalize(data) {
  const s = freshState();
  if (!data || typeof data !== 'object') return s;
  s.start = dateValue(data.start) !== null ? data.start : '';
  s.custom = dateValue(data.custom) !== null ? data.custom : '';
  s.interval = [1,6,12].includes(data.interval) ? data.interval : 1;
  s.wishes = Array.isArray(data.wishes) ? data.wishes.filter(w => w && typeof w.text === 'string' && w.text.trim()).slice(0,200).map(w => ({id: uid(), text: w.text.trim().slice(0,120), done: w.done === true})) : [];
  if (Array.isArray(data.rewards)) { const pool = data.rewards.filter(r => typeof r === 'string' && r.trim()).slice(0,50).map(r => r.trim().slice(0,120)); if (pool.length) s.rewards = pool; }
  const game = data.game;
  if (game && Number.isInteger(game.limit) && game.limit >= 1 && game.limit <= 9) {
    s.game.limit = game.limit;
    const seen = new Set();
    if (Array.isArray(game.draws)) s.game.draws = game.draws.filter(d => { if (!d || !Number.isInteger(d.index) || d.index < 0 || d.index > 8 || typeof d.reward !== 'string' || seen.has(d.index)) return false; seen.add(d.index); return true; }).slice(0,game.limit).map(d => ({index:d.index,reward:d.reward.slice(0,120)}));
  }
  return s;
}
let state;
try { state = normalize(JSON.parse(localStorage.getItem(KEY))); } catch { state = freshState(); }
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('浏览器无法保存数据；关闭后可能丢失，请导出清单备份。'); } }
function formatDate(time) { const d = new Date(time); return `${d.getUTCFullYear()} 年 ${d.getUTCMonth()+1} 月 ${d.getUTCDate()} 日`; }
function setNumber(element, number, unit = '天') { element.replaceChildren(document.createTextNode(`${number} `)); const small = document.createElement('small'); small.textContent = unit; element.append(small); }
function renderTime() {
  const start = dateValue(state.start), today = todayValue();
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
  $('wish-list').replaceChildren();
  if (!state.wishes.length) { const empty = document.createElement('li'); empty.className = 'empty-wishes'; empty.textContent = '第一份愿望，留给你们一起写。♡'; $('wish-list').append(empty); }
  for (const wish of state.wishes) {
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
}
function renderGame() {
  const {game} = state; const remaining = game.limit-game.draws.length;
  setNumber($('chance-count'), remaining, `/ ${game.limit}`);
  $('card-grid').replaceChildren();
  for (let index = 0; index < 9; index++) {
    const draw = game.draws.find(d => d.index === index);
    const card = document.createElement('button'); card.type = 'button'; card.className = `draw-card${draw ? ' revealed' : ''}`; card.disabled = !!draw || remaining <= 0;
    card.setAttribute('aria-label', draw ? `第 ${index+1} 张卡，奖励：${draw.reward}` : `抽取第 ${index+1} 张卡`);
    const icon = document.createElement('span'); icon.className = 'card-icon'; icon.textContent = draw ? '✦' : '♡';
    const title = document.createElement('span'); title.className = 'card-title'; title.textContent = draw ? draw.reward : '一份心动';
    const serial = document.createElement('span'); serial.className = 'card-serial'; serial.textContent = draw ? 'YOUR LITTLE GIFT' : `CUPID / 0${index+1}`;
    card.append(icon,title,serial);
    card.addEventListener('click', () => {
      const result = drawCard(state.game,index,state.rewards);
      if (!result) return;
      save(); renderGame(); $('reward-result').textContent = result.reward; $('reward-dialog').showModal();
    });
    $('card-grid').append(card);
  }
  $('game-status').textContent = remaining ? `选一张心动的卡片吧，还可以抽 ${remaining} 次。` : '本轮惊喜已全部送达。点击“重新开始”，开启下一轮。';
  $('reward-history').replaceChildren();
  for (const [i, draw] of game.draws.entries()) { const item = document.createElement('span'); item.textContent = `${i+1}. ${draw.reward}`; $('reward-history').append(item); }
}
$('open-settings').addEventListener('click', () => { $('start-date').value = state.start; $('anniversary-type').value = state.interval; $('custom-date').value = state.custom; $('settings-dialog').showModal(); });
$('settings-form').addEventListener('submit', event => {
  event.preventDefault();
  if (dateValue($('start-date').value) === null || ($('custom-date').value && dateValue($('custom-date').value) === null)) { toast('请填写有效日期（1900～9998 年）。'); return; }
  state.start = $('start-date').value; state.interval = Number($('anniversary-type').value); state.custom = $('custom-date').value;
  save(); renderTime(); $('settings-dialog').close(); toast('我们的日期已保存。');
});
$('wish-form').addEventListener('submit', event => {event.preventDefault(); const text = $('wish-input').value.trim(); if (!text) return; if(state.wishes.length >= 200) {toast('清单最多保存 200 个愿望。'); return;} state.wishes.push({id:uid(),text,done:false}); save(); renderWishes(); $('wish-input').value = '';});
$('export-wishes').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({version:1,wishes:state.wishes},null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '晨晨和豆豆的愿望清单.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
$('import-wishes').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
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
$('open-game-settings').addEventListener('click', () => { $('max-chances').value = state.game.limit; $('reward-pool').value = state.rewards.join('\n'); $('game-settings-dialog').showModal(); });
$('game-settings-form').addEventListener('submit', event => {
  event.preventDefault(); const limit = Number($('max-chances').value); const rewards = $('reward-pool').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (!Number.isInteger(limit) || limit < 1 || limit > 9 || !rewards.length || rewards.length > 50 || rewards.some(r => r.length > 120)) { toast('请设置 1～9 次机会、1～50 个奖励，每个奖励不超过 120 字。'); return; }
  state.rewards = rewards; state.game = {limit,draws:[]}; save(); renderGame(); $('game-settings-dialog').close(); toast('新的惊喜已准备好。');
});
$('restart-game').addEventListener('click', () => { if (state.game.draws.length && !confirm('开始新一轮？本轮奖励记录将清空。')) return; state.game.draws = []; save(); renderGame(); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
window.addEventListener('storage', event => { if (event.key !== KEY) return; try {state = normalize(JSON.parse(event.newValue)); renderTime(); renderWishes(); renderGame();} catch {} });
renderTime(); renderWishes(); renderGame();
setInterval(renderTime,30000);
