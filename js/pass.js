// 폰 하나로 하기 — 인터넷 없이 한 기기를 돌려 쓰며 진행하는 오프라인 모드
// 판정은 온라인과 같은 Host를 쓰고, 시간이 정해지지 않은 단계(직업 확인·밤·투표)는 화면에서 직접 넘긴다.
import { Host, U, NM, CO, AL, RO, FL, SPEEDS, discSeconds } from './host.js';
import { ROLES, ONUW, COLORS, TEAM_NAME, isMafiaTeam, isMafia, isSupport, fmt, WIN_TEXT, classicDeck, deckSummary, onuwDeck, ROLE_ORDER, legacyNight } from './roles.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = localStorage.getItem('mf3d.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem('mf3d.' + k, JSON.stringify(v)); } catch (e) { } };
const PH = { role: '직업 확인', night: '밤', morning: '아침', discuss: '토론', vote: '투표', defense: '최후 변론', final: '찬반 투표', voteres: '투표 결과', execres: '처형 결과', dawn: '새벽', end: '게임 종료' };

export function startPass(ctx) {
  const root = $('pass'); root.hidden = false;
  let names = load('passNames', []), mode = load('passMode', 'classic'), opt = Object.assign({ maf: 0, neu: 2, dr: 1, rev: 0, spd: 1, exp: 1 }, load('passOpt', {}));
  let host = null, loop = null, lastPh = '', k = 0, open = false, picked = null, onuwPick = {}, fin = { y: 0, n: 0 }, dayPm = {}, clueMap = {};
  const g = () => host.g;
  const name = i => g().P[i][NM];
  const dot = i => `<span class="dot" style="display:inline-block;vertical-align:-2px;background:${COLORS[g().P[i][CO]]}"></span>`;
  const show = html => { root.innerHTML = `<div class="card pcard"><div class="ptop"><span>${host && g().ph !== 'lobby' ? (g().mode === 'onuw' ? '🐺 ' : '🔪 ') + (PH[g().ph] || '') + (g().mode === 'classic' && g().r ? ` · ${g().r}일차` : '') : '📱 폰 하나로 하기'}</span><span><button id="pDex" class="mini">📖</button><button id="pQuit" class="mini">✕</button></span></div>${html}</div>`; };

  root.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'pQuit') { if (!host || confirmQuit()) quit(); return; }
    if (b.id === 'pDex') { ctx.showDex(host && g().mode === 'onuw' ? 'onuw' : mode === 'onuw' ? 'onuw' : 'classic'); return; }
    handle(b);
  };
  let quitArm = 0;
  function confirmQuit() { if (Date.now() - quitArm < 2500) return true; quitArm = Date.now(); ctx.toast('한 번 더 누르면 게임을 끝내요'); return false; }
  function quit() { clearInterval(loop); host = null; root.hidden = true; root.innerHTML = ''; ctx.setBackdropNight(0); ctx.onExit(); }

  // ── 설정 화면 ──
  function setup() {
    host = null; clearInterval(loop);
    const n = names.length, min = mode === 'onuw' ? 3 : 4;
    const chip = (key, v, label, cur) => `<button class="chip ${cur === v ? 'on' : ''}" data-o="${key}" data-v="${v}">${label}</button>`;
    let deck = '';
    if (n >= min) { if (mode !== 'onuw') deck = deckSummary(n, opt); else { const c = {}; onuwDeck(n).forEach(r => c[r] = (c[r] || 0) + 1); deck = Object.keys(ONUW).filter(r => c[r]).map(r => `${ONUW[r].icon}${ONUW[r].name}${c[r] > 1 ? '×' + c[r] : ''}`).join(' · '); } }
    const ds = discSeconds(opt.spd, Math.max(n, 3), mode, 1);
    show(`<p class="hint" style="margin-top:0">인터넷 없이 폰 한 대를 돌려 가며 해요. 직업 확인과 밤 행동은 폰을 받은 사람만 보고, 투표는 손을 들어 세요.</p>
      <div class="lbl">참가자 (${n}/20)</div>
      <div class="row"><input id="pName" maxlength="10" placeholder="이름 입력 후 추가"><button id="pAdd">추가</button></div>
      <div class="chips" style="margin-top:8px">${names.map((x, i) => `<button class="chip" data-del="${i}">${esc(x)} ✕</button>`).join('') || '<span class="hint">아직 아무도 없어요</span>'}</div>
      <div class="lbl">모드</div><div class="chips">${chip('mode', 'classic', '🔪 클래식', mode)}${chip('mode', 'onuw', '🐺 한밤의 늑대인간', mode)}</div>
      ${mode === 'classic' ? `<div class="lbl">마피아 수</div><div class="chips">${chip('maf', 0, '자동', opt.maf)}${[1, 2, 3, 4, 5].map(v => chip('maf', v, v + '명', opt.maf)).join('')}</div>
      <div class="lbl">중립 직업</div><div class="chips">${chip('neu', 2, '랜덤', opt.neu === 1 ? 2 : opt.neu)}${chip('neu', 0, '없음', opt.neu)}</div>
      ${opt.neu !== 0 ? `<div class="lbl">🌫️ 몽상가</div><div class="chips">${chip('dr', 1, '넣기', opt.dr)}${chip('dr', 0, '빼기', opt.dr)}</div>` : ''}
      <div class="lbl">죽으면</div><div class="chips">${chip('rev', 0, '직업 숨김', opt.rev)}${chip('rev', 1, '직업 공개', opt.rev)}</div>` : ''}
      ${mode === 'classic' ? `<div class="lbl">단서</div><div class="chips">${chip('exp', 1, '🔍 밤마다 1장', opt.exp)}${chip('exp', 0, '없음', opt.exp)}</div>` : ''}
      <div class="lbl">속도</div><div class="chips">${SPEEDS.map((s, i) => chip('spd', i, s.name, opt.spd)).join('')}</div>
      <p class="hint">${deck || `${min}명 이상 필요해요.`}<br>⏱️ 토론 기본 ${Math.floor(ds / 60)}분 ${ds % 60}초 · 진행 중 ±30초 조절 가능</p>
      <div class="btns"><button class="primary big" id="pStart" ${n >= min ? '' : 'disabled'}>▶ 시작하기</button></div>`);
    const inp = $('pName'); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  }
  function add() {
    const v = $('pName').value.trim().slice(0, 10); if (!v) return;
    if (names.length >= 20) { ctx.toast('최대 20명이에요'); return; }
    if (names.includes(v)) { ctx.toast('같은 이름이 있어요'); return; }
    names.push(v); save('passNames', names); setup(); $('pName').focus();
  }
  function begin() {
    host = new Host(ctx.world); host.manual = true;
    host.g.mode = mode; Object.assign(host.g.opt, opt, { off: 2, act: 1 });
    const err = host.start(names.map((n, i) => ({ uid: 'p' + i, n, c: i % 20, h: 0, j: i })));
    if (err) { ctx.toast(err); host = null; return; }
    lastPh = ''; loop = setInterval(tick, 250); tick();
  }
  function tick() {
    if (!host) return;
    host.tick([]);
    if (g().ph === 'lobby') { setup(); return; }
    if (g().ph !== lastPh) phase();
    const el = $('pTimer'); if (el) { const r = Math.max(0, Math.ceil((host.end - Date.now()) / 1000)); el.textContent = isFinite(r) ? `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}` : ''; }
  }
  function phase() {
    lastPh = g().ph; k = 0; open = false; picked = null; onuwPick = {}; fin = { y: 0, n: 0 };
    if (g().ph === 'end') host.end = Infinity;
    if (g().ph === 'morning') dayPm = { ...(g().pm || {}) };
    ctx.setBackdropNight(g().ph === 'night' ? 1 : 0);
    const news = (g().news || []).map(m => fmt(m, g().P)).join('\n');
    const say = {
      role: '직업 확인 시간입니다. 폰을 돌려 가며 각자 직업을 확인하세요.',
      night: '밤이 되었습니다. 모두 고개를 숙여 주세요. 폰을 받은 사람만 화면을 보세요.',
      dawn: '아침입니다. 폰을 돌려 가며 밤사이 알게 된 것을 확인하세요.',
      morning: '아침이 되었습니다. 모두 고개를 드세요. ' + news,
      discuss: `토론을 시작하세요. 시간은 ${Math.round((host.end - Date.now()) / 1000)}초입니다.`,
      vote: g().mode === 'onuw' ? '투표 시간입니다. 하나, 둘, 셋 하면 동시에 늑대인간라고 생각하는 사람을 가리키세요.' : '투표 시간입니다. 재판대에 올릴 사람에게 손을 들어 주세요.',
      final: '찬반 투표입니다. 처형에 찬성하는 분은 손을 들어 주세요.',
      end: news || WIN_TEXT[g().win && g().win.k],
    }[g().ph];
    ctx.speak(say || news);
    render();
  }
  const alive = () => g().P.map((p, i) => i).filter(i => g().P[i][AL] === 1);
  const order = () => g().mode === 'onuw' ? g().P.map((p, i) => i) : alive();

  // 직업 확인·밤·새벽처럼 폰을 돌리는 단계
  function passStep(title, body, doneBtn) {
    const list = order();
    if (k >= list.length) { show(`<h2>✅ 모두 끝났어요</h2><p>폰을 가운데에 두세요.</p><div class="btns"><button class="primary big" id="pNext">${doneBtn}</button></div>`); return; }
    const i = list[k];
    if (!open) { show(`<div class="who">${dot(i)} ${esc(name(i))}님 차례</div><p style="text-align:center">${title}</p><p class="hint" style="text-align:center">${k + 1} / ${list.length}</p><div class="btns" style="justify-content:center"><button class="primary big" id="pOpen">👀 화면 열기</button></div>`); return; }
    show(`<div class="who">${dot(i)} ${esc(name(i))}</div>${body(i)}`);
  }
  function render() {
    const G = g(), ph = G.ph;
    if (ph === 'role') return passStep('다른 사람은 보지 않게 하고 직업을 확인하세요.', i => {
      const r = G.mode === 'onuw' ? G.P[i][RO] : host.effRole(i), R = (G.mode === 'onuw' ? ONUW : ROLES)[r];
      let extra = '';
      if (G.mode === 'classic' && isMafia(r)) { const t = G.P.filter((p, j) => j !== i && isMafia(p[RO])).map(p => p[NM]); extra = `<p>🤝 같은 마피아: ${esc(t.join(', ') || '나 혼자')}${G.P.some(p => isSupport(p[RO])) ? '<br>🕵️ 보조 직업 1명이 숨어 있어요(누군지 몰라요).' : ''}</p>`; }
      else if (G.mode === 'classic' && isSupport(r)) { const t = (((G.kn || {})[i]) || []).map(j => G.P[j][NM]); extra = `<p>🕵️ 마피아가 누군지 몰라요. 밤에 능력을 쓴 상대가 마피아면 알게 돼요.${t.length ? `<br>🔴 알아낸 마피아: ${esc(t.join(', '))}` : ''}</p>`; }
      return `<div class="roleBig">${R.icon}</div><h2 style="text-align:center">${R.name}</h2><div style="text-align:center"><span class="team ${R.team}">${TEAM_NAME[R.team]}</span></div><p>${R.off || R.desc}</p>${!R.off && legacyNight(r) && G.mode === 'classic' ? '<p class="hint">📱 폰 하나로: 밤에 내 차례가 오면 목록에서 대상을 골라요.</p>' : ''}${R.win ? `<p>🏆 ${R.win}</p>` : ''}${extra}<div class="btns"><button class="primary big" id="pDone">확인했어요 · 화면 닫기</button></div>`;
    }, '🌙 밤 시작');
    if (ph === 'night' && G.mode === 'classic') return passStep('다른 사람은 고개를 숙여 주세요.', i => nightBody(i), '☀️ 아침으로');
    if (ph === 'night') return passStep('다른 사람은 고개를 숙여 주세요.', i => onuwBody(i), '☀️ 아침으로');
    if (ph === 'dawn') return passStep('밤사이 알게 된 것을 확인하세요.', i => `<p class="pm">${esc(fmt(G.pm[G.P[i][U]], G.P) || '😴 조용히 잠들었어요.')}</p><div class="btns"><button class="primary big" id="pDone">확인했어요 · 화면 닫기</button></div>`, '🗣️ 토론 시작');
    const news = (G.news || []).map(m => fmt(m, G.P)).join('\n');
    const timer = `<div id="pTimer" class="ptimer"></div>`;
    if (ph === 'morning' || ph === 'voteres' || ph === 'execres') return show(`<p class="pnews">${esc(news)}</p>${timer}<div class="btns"><button class="primary big" id="pSkip">다음 ▶</button></div>`);
    if (ph === 'discuss') {
      const ps = alive().map(i => `<span class="chip">${dot(i)} ${esc(name(i))}${G.mode === 'classic' && G.P[i][RO] === 'O' && G.opt.rev ? '' : ''}</span>`).join('');
      return show(`<p class="pnews">${esc(news)}</p>${timer}<div class="btns" style="justify-content:center"><button id="pMore">+30초</button><button id="pLess">−30초</button><button class="primary big" id="pSkip">🗳️ 투표하기</button></div><div class="lbl">살아 있는 사람 ${alive().length}명</div><div class="chips">${ps}</div>`);
    }
    if (ph === 'vote' && G.mode === 'classic') return show(`<h2>🗳️ 지목 투표</h2><p>한 명씩 이름을 부르며 손을 들게 하세요. 가장 많은 표를 받은 사람을 고르세요. <b>이장의 표는 2표</b>예요.</p><div class="opts">${alive().map(i => `<button data-tr="${i}">${dot(i)} ${esc(name(i))}</button>`).join('')}</div><div class="btns"><button id="pTie">🤝 동점 · 아무도 안 올림</button></div>`);
    if (ph === 'vote') {
      const list = G.P.map((p, i) => i);
      if (k >= list.length) return show(`<h2>✅ 모두 입력했어요</h2><div class="btns"><button class="primary big" id="pNext">🏆 결과 보기</button></div>`);
      const i = list[k];
      return show(`<h2>👉 ${esc(name(i))}님이 가리킨 사람</h2><p class="hint">${k + 1} / ${list.length}</p><div class="opts">${list.filter(j => j !== i).map(j => `<button data-ov="${j}">${dot(j)} ${esc(name(j))}</button>`).join('')}</div>`);
    }
    if (ph === 'defense') return show(`<p class="pnews">${esc(news)}</p><div class="who">⚖️ ${dot(G.tr)} ${esc(name(G.tr))}</div><p style="text-align:center">재판대에 선 사람만 말할 수 있어요.</p>${timer}<div class="btns"><button class="primary big" id="pSkip">변론 끝 ▶</button></div>`);
    if (ph === 'final') return show(`<h2>⚖️ ${esc(name(G.tr))}님을 처형할까요?</h2><p>찬성·반대에 각각 손을 들게 하고 수를 세어 입력하세요. 이장은 2표로 세요.</p>
      <div class="steps"><div><div class="lbl">👍 찬성</div><button data-fy="-1">−</button><b>${fin.y}</b><button data-fy="1">+</button></div><div><div class="lbl">✋ 반대</div><button data-fn="-1">−</button><b>${fin.n}</b><button data-fn="1">+</button></div></div>
      <div class="btns"><button class="primary big" id="pFin">결정</button></div>`);
    if (ph === 'end') {
      const W = new Set(G.win.w || []), on = G.mode === 'onuw';
      const rows = G.P.map((p, i) => { const o = (on ? ONUW : ROLES)[p[RO]], f = on && G.F ? ONUW[G.F[i]] : null; return `<tr class="${W.has(i) ? 'win' : ''}"><td>${dot(i)} ${esc(p[NM])}</td><td>${o.icon} ${o.name}${f && f !== o ? ` → ${f.icon} ${f.name}` : ''}</td><td>${p[AL] === 1 ? '생존' : '💀'}</td><td>${W.has(i) ? '🏆' : ''}</td></tr>`; }).join('');
      return show(`<h2>🏆 게임 끝</h2><p class="pnews">${esc(news)}\n${esc(WIN_TEXT[G.win.k] || '')}</p><table class="res">${rows}</table><div class="btns"><button id="pSetup">⚙️ 설정으로</button><button class="primary big" id="pAgain">🔁 같은 사람들로 다시</button></div>`);
    }
  }

  // ── 클래식 밤: 능력 고르기 ──
  function abil(i) {
    const G = g(), p = G.P[i], r = host.effRole(i), R = ROLES[r], nc = G.nc || {};
    if (r === 'E') return nc.used && nc.used[i] ? null : G.P.some(q => q[AL] !== 1) ? { k: 'med', verb: '넋 읽기', icon: '🔔' } : null;
    const A = legacyNight(r); if (!A) return null;
    if ((A.k === 'inv' || A.k === 'spy') && nc.used && nc.used[i]) return null;
    if (A.k === 'scoop' && (G.r < 2 || (p[FL] & 2))) return null;
    return A;
  }
  function clueLine(i) {
    const G = g(); if (!G.opt.exp) return '';
    const key = G.r + ':' + i; if (!clueMap[key]) clueMap[key] = host.clueCard(i, false);
    return `<p class="pm">🔍 오늘 밤 주운 단서<br>${esc(fmt(clueMap[key], G.P))}</p>`;
  }
  function nightBody(i) {
    const G = g(), uidI = G.P[i][U], a = abil(i), pm = G.pm[uidI];
    if (picked !== null) return `<p class="pm">${esc(fmt(pm, G.P) || '선택했어요.')}</p>${clueLine(i)}<div class="btns"><button class="primary big" id="pDone">확인 · 화면 닫기</button></div>`;
    if (!a) {
      setTimeout(() => { const b = $('pDone'); if (b) b.disabled = false; }, 3000);
      const pre = [dayPm[uidI], pm].filter(Boolean).map(m => `<p class="pm">${esc(fmt(m, G.P))}</p>`).join('');
      return `${pre}<p>${ROLES[host.effRole(i)].icon} 오늘 밤은 할 일이 없어요.</p>${clueLine(i)}<p class="hint">다른 사람이 눈치채지 않도록 잠깐 기다렸다가 눌러 주세요.</p><div class="btns"><button class="primary big" id="pDone" disabled>확인 · 화면 닫기</button></div>`;
    }
    const oil = (G.oil || []).filter(j => G.P[j][AL] === 1);
    const list = a.k === 'med' ? G.P.map((p, j) => j).filter(j => G.P[j][AL] !== 1)
      : alive().filter(j => (a.k === 'heal' || j !== i) && !(a.k === 'kill' && isMafia(G.P[j][RO])) && !(a.k === 'oil' && oil.includes(j)));
    const team = [dayPm[uidI], pm].filter(Boolean).map(m => `<p class="hint">${esc(fmt(m, G.P))}</p>`).join('');
    return `<p>${a.icon} <b>${ROLES[host.effRole(i)].name}</b> — ${a.verb}</p>${team}<div class="opts">${list.map(j => `<button data-ab="${j}">${dot(j)} ${esc(name(j))}${j === i ? ' (나)' : ''}${oil.includes(j) ? ' 🛢️' : ''}</button>`).join('')}</div>
      ${a.k === 'oil' && oil.length ? `<button class="danger" data-ign="1">🔥 점화 (기름 묻은 ${oil.length}명)</button>` : ''}<div class="btns"><button id="pDone">이번 밤은 쓰지 않기</button></div>`;
  }
  // ── 한밤 모드 밤 ──
  function onuwBody(i) {
    const G = g(), r = G.P[i][RO], R = ONUW[r], others = G.P.map((p, j) => j).filter(j => j !== i), P = onuwPick;
    const pb = (key, j) => `<button data-${key}="${j}" class="${P[key] === j ? 'on' : ''}">${esc(name(j))}</button>`;
    const cb = c => `<button data-c="${c}" class="${P.c === c || (P.cs || []).includes(c) ? 'on' : ''}">가운데 ${c + 1}번</button>`;
    let body;
    if (r === 'W') body = '<p>늑대인간이 나 혼자라면 가운데 카드 1장을 볼 수 있어요.</p><div class="opts">' + [0, 1, 2].map(cb).join('') + '</div>';
    else if (r === 'X') body = `<p>플레이어 1명 또는 가운데 카드 2장을 고르세요.</p><div class="opts">${others.map(j => pb('t', j)).join('')}</div><div class="opts">${[0, 1, 2].map(c => `<button data-cc="${c}" class="${(P.cs || []).includes(c) ? 'on' : ''}">가운데 ${c + 1}번</button>`).join('')}</div>`;
    else if (r === 'B') body = `<p>카드를 바꿀 사람을 고르세요.</p><div class="opts">${others.map(j => pb('t', j)).join('')}</div>`;
    else if (r === 'T') body = `<p>서로 카드를 바꿀 두 사람을 고르세요.</p><div class="opts">${others.map(j => `<button data-tt="${j}" class="${(P.ts || []).includes(j) ? 'on' : ''}">${esc(name(j))}</button>`).join('')}</div>`;
    else if (r === 'K') body = '<p>내 카드와 바꿀 가운데 카드를 고르세요.</p><div class="opts">' + [0, 1, 2].map(cb).join('') + '</div>';
    else body = `<p>${R.icon} ${R.name}: 이번 밤에는 고를 것이 없어요. 결과는 새벽에 알려 줘요.</p>`;
    return `<p>${R.icon} <b>${R.name}</b></p>${body}<div class="btns"><button class="primary big" id="pOn">확정 · 화면 닫기</button></div>`;
  }

  function handle(b) {
    const d = b.dataset;
    if (!host) {
      if (b.id === 'pAdd') add();
      else if (d.del !== undefined) { names.splice(+d.del, 1); save('passNames', names); setup(); }
      else if (d.o) { if (d.o === 'mode') mode = d.v; else opt[d.o] = +d.v; save('passMode', mode); save('passOpt', opt); setup(); }
      else if (b.id === 'pStart') begin();
      return;
    }
    const G = g();
    if (b.id === 'pOpen') { open = true; picked = null; onuwPick = {}; render(); }
    else if (b.id === 'pDone') { open = false; picked = null; k++; render(); }
    else if (b.id === 'pNext') host.next();
    else if (b.id === 'pSkip') host.skip();
    else if (b.id === 'pMore' || b.id === 'pLess') { const s = b.id === 'pMore' ? 1 : -1; host.extend(s); host.extend(s); }
    else if (d.ab !== undefined) { const i = order()[k], a = abil(i); host.act(i, { k: a.k, t: +d.ab }); picked = +d.ab; render(); }
    else if (d.ign) { const i = order()[k]; host.act(i, { k: 'ignite' }); picked = -1; render(); }
    else if (d.tr !== undefined) host.forceTrial(+d.tr);
    else if (b.id === 'pTie') host.forceTrial(-1);
    else if (d.fy !== undefined) { fin.y = Math.max(0, fin.y + +d.fy); render(); }
    else if (d.fn !== undefined) { fin.n = Math.max(0, fin.n + +d.fn); render(); }
    else if (b.id === 'pFin') host.forceFinal(fin.y, fin.n);
    else if (d.ov !== undefined) { G.vo[k] = +d.ov; k++; render(); }
    else if (d.t !== undefined) { onuwPick.t = +d.t; onuwPick.cs = []; render(); }
    else if (d.c !== undefined) { onuwPick.c = +d.c; render(); }
    else if (d.cc !== undefined) { const c = +d.cc; let cs = (onuwPick.cs || []).filter(x => x !== c); if (cs.length === (onuwPick.cs || []).length) cs = cs.concat([c]).slice(-2); onuwPick.cs = cs; onuwPick.t = -1; render(); }
    else if (d.tt !== undefined) { const j = +d.tt; let ts = (onuwPick.ts || []).filter(x => x !== j); if (ts.length === (onuwPick.ts || []).length) ts = ts.concat([j]).slice(-2); onuwPick.ts = ts; render(); }
    else if (b.id === 'pOn') {
      const i = order()[k], r = G.P[i][RO], P = onuwPick, ts = P.ts || [], cs = P.cs || [];
      host.act(i, { k: 'on', t: r === 'T' ? (ts[0] ?? -1) : (P.t ?? -1), t2: ts[1] ?? -1, c: cs.length ? cs[0] : (P.c ?? -1), c2: cs[1] ?? -1 });
      open = false; k++; render();
    }
    else if (b.id === 'pAgain') { clearInterval(loop); begin(); }
    else if (b.id === 'pSetup') setup();
  }
  setup();
}
