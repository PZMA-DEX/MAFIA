import * as THREE from 'three';
import { buildWorld, makeAvatar } from './world.js';
import { connect } from './net.js';
import { Host, lobbyState, U, NM, CO, HA, AL, RO, FL, SPEEDS, SEATED, discSeconds } from './host.js';
import { ROLES, ONUW, ROLE_ORDER, TURNS, legacyNight, COLORS, COLOR_NAMES, HATS, TEAM_NAME, isMafiaTeam, isMafia, isSupport, classicDeck, deckSummary, onuwDeck, fmt, WIN_TEXT } from './roles.js';
import { startPass } from './pass.js';
import * as SFX from './audio.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('mf3d.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mf3d.' + k, JSON.stringify(v)); } catch (e) { } },
};
let uid = null;
try { uid = sessionStorage.getItem('mf3d.uid'); } catch (e) { }
if (!uid) { uid = 'u' + Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('mf3d.uid', uid); } catch (e) { } }
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const LITE = isTouch || /lite/.test(location.search);
if (isTouch) document.body.classList.add('touch');

const PH_NAME = { lobby: '대기실', role: '직업 확인', night: '밤', morning: '아침', discuss: '토론', vote: '투표', defense: '최후 변론', final: '찬반 투표', voteres: '투표 결과', explore: '탐색', day: '낮', execres: '처형 결과', dawn: '새벽', end: '게임 종료' };

// ───────── 렌더러 / 월드 ─────────
const canvas = $('c');
let graphicsAvailable = true;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'default' }); }
catch (error) { graphicsAvailable = false; renderer = { setPixelRatio(){}, setSize(){}, render(){}, shadowMap:{} }; }
let pixelRatio = Math.min(devicePixelRatio, LITE ? 1.25 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = !LITE; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
const world = buildWorld(scene, { lite: LITE });
const myLight = new THREE.PointLight('#ffe2b0', 0, 10, 1.4); scene.add(myLight);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ───────── 사회자 음성 (오프라인 진행용) ─────────
let voiceOn = store.get('voice', true);
export function speak(t) {
  if (!voiceOn || !('speechSynthesis' in window) || !t) return;
  try {
    const clean = String(t).replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F\u200D「」]/gu, '').replace(/\n/g, '. ');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean); u.lang = 'ko-KR'; u.rate = 0.95; u.pitch = 0.9;
    const v = speechSynthesis.getVoices().find(v => /ko/i.test(v.lang)); if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { }
}

// ───────── 내 정보 ─────────
const me = {
  name: store.get('nick', ''), color: store.get('color', Math.floor(Math.random() * 20)), hat: store.get('hat', 0),
  pos: new THREE.Vector3(0, 0, 8), ry: Math.PI, sit: false, moving: false,
};
const cam = { yaw: 0, pitch: 0.55, dist: 8 };
let net = null, peers = [], hostUid = null, host = null, G = lobbyState(), gE = -1, gId = '', localEnd = 0, lastPK = '';
let roomName = '', joinedAt = 0, electReady = false, lastBots = [], seenLg = 0, chatSeq = 0, actQ = 0;
const myS = { u: uid, n: '', c: 0, h: 0, j: 0, ch: [], a: null, v: null, f: null, sv: null, rd: 0, req: null };
let reqQ = 0;
function request(k, v) { myS.req = { q: ++reqQ, k, v }; pushS(true); }
const avatars = new Map();
const seenChat = new Set();

// ───────── 타이틀 화면 ─────────
const pv = (() => {
  if (!graphicsAvailable) return {set(){}, draw(){}};
  const r = new THREE.WebGLRenderer({ canvas: $('preview'), alpha: true, antialias: true }); r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Scene(); s.add(new THREE.HemisphereLight('#fff', '#556', 1.4)); const d = new THREE.DirectionalLight('#fff', 1.4); d.position.set(2, 3, 4); s.add(d);
  const c = new THREE.PerspectiveCamera(35, 1, 0.1, 20); c.position.set(0, 1.4, 4.2); c.lookAt(0, 1, 0);
  let av = null;
  return { set() { if (av) s.remove(av); av = makeAvatar(COLORS[me.color], me.hat); av.userData.tag.visible = false; s.add(av); }, draw(t) { if (av) { av.rotation.y = Math.sin(t / 900) * 0.7; av.userData.anim(0.016, false); } r.render(s, c); } };
})();
function buildTitle() {
  $('nick').value = me.name;
  $('colors').innerHTML = COLORS.map((c, i) => `<button class="sw ${i === me.color ? 'on' : ''}" data-c="${i}" title="${COLOR_NAMES[i]}" style="background:${c}"></button>`).join('');
  $('hats').innerHTML = HATS.map((h, i) => `<button class="chip ${i === me.hat ? 'on' : ''}" data-h="${i}">${h}</button>`).join('');
  pv.set();
}
$('colors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; me.color = +b.dataset.c; store.set('color', me.color); buildTitle(); };
$('hats').onclick = e => { const b = e.target.closest('[data-h]'); if (!b) return; me.hat = +b.dataset.h; store.set('hat', me.hat); buildTitle(); };
buildTitle();
$('roomCode').value = (location.hash || '').replace('#', '').replace(/^room-/, '');
const randCode = () => Math.random().toString(36).slice(2, 7);
$('btnPublic').onclick = () => enter('plaza');
$('btnCode').onclick = () => { const c = $('roomCode').value.trim().toLowerCase().replace(/[^a-z0-9]/g, ''); if (!c) return toast('방 코드를 입력해 주세요'); enter(c); };
$('btnNew').onclick = () => { $('roomCode').value = randCode(); enter($('roomCode').value); };
$('btnHelp').onclick = () => showHelp();
$('btnDex').onclick = () => showDex();
$('btnPass').onclick = () => {
  SFX.initAudio();
  $('title').hidden = true;
  startPass({ world, speak, toast, showDex, setBackdropNight: k => backdropNight = k, onExit: () => { $('title').hidden = false; backdropNight = 0; } });
};
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
$('btnInstall').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { } installEvt = null; $('btnInstall').hidden = true; };
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone) $('iosHint').hidden = false;
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !/claude\.ai|claudeusercontent|anthropic/.test(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
$('netInfo').textContent = '같은 방 코드를 입력한 사람끼리 함께 플레이해요. 방장 없이 누구나 설정을 바꾸고, 모두 "준비"를 누르면 시작돼요. 혼자라면 봇을 넣어 바로 해 볼 수 있어요.';

async function enter(code) {
  if (!graphicsAvailable) { toast('이 환경에서는 3D를 사용할 수 없어요. 폰 하나로 하기 모드를 이용해 주세요.'); return; }
  const nm = $('nick').value.trim().slice(0, 10);
  if (!nm) { toast('닉네임을 입력해 주세요'); $('nick').focus(); return; }
  me.name = nm; store.set('nick', nm);
  SFX.initAudio();
  roomName = code; joinedAt = Date.now();
  Object.assign(myS, { n: me.name, c: me.color, h: me.hat, j: joinedAt });
  $('btnPublic').disabled = $('btnCode').disabled = $('btnNew').disabled = true;
  $('netInfo').textContent = '연결 중…';
  try { history.replaceState(null, '', code === 'plaza' ? '#' : '#room-' + code); } catch (e) { }
  net = await connect(code, uid, onPeers, st => { if (st !== 'online') toast(st === 'reconnecting' ? '연결이 잠시 끊겼어요. 다시 연결하는 중…' : st); });
  $('title').hidden = true; $('hud').hidden = false;
  $('roomTag').textContent = (code === 'plaza' ? '공개 광장' : '방 ' + code) + ' · ' + net.label;
  const sp = world.randomPoint(); me.pos.set(sp.x, 0, sp.z);
  pushS(true); sendMotion(true);
  setTimeout(() => { electReady = true; elect(); }, 1600);
  addSys(`📍 ${code === 'plaza' ? '공개 광장' : '방 「' + code + '」'}에 들어왔어요. (${net.label})`);
  if (net.kind === 'local') addSys('ℹ️ 지금은 이 기기 안에서만 연결돼요. 친구와 하려면 claude.ai 링크로 열거나 Firebase를 설정하세요(README).');
  render();
}

// ───────── 네트워크 ─────────
let sTimer = null;
function pushS(now) {
  if (!net) return;
  const send = () => {
    sTimer = null;
    const lim = net.kind === 'firebase' ? 5800 : 3850;
    const size = () => new Blob([JSON.stringify(myS)]).size;
    while (size() > lim && myS.ch.length > 1) myS.ch.shift();
    while (size() > lim && myS.bc && myS.bc.length) myS.bc.shift();
    net.set({ s: JSON.parse(JSON.stringify(myS)) });
  };
  if (now) { clearTimeout(sTimer); send(); } else if (!sTimer) sTimer = setTimeout(send, 90);
}
let lastM = '', lastMT = 0;
function sendMotion(force) {
  if (!net) return;
  const m = { x: +me.pos.x.toFixed(2), z: +me.pos.z.toFixed(2), r: +me.ry.toFixed(2), mv: me.moving ? 1 : 0, st: me.lie ? 2 : me.sit ? 1 : 0 };
  if (host) m.b = host.botMotion();
  const k = JSON.stringify(m), now = performance.now();
  if (!force && (k === lastM || now - lastMT < 140)) return;
  lastM = k; lastMT = now; net.set({ m });
}
function onPeers(list) {
  peers = list.filter(p => p.uid);
  elect(); readGame(); readChat();
}
function humansSorted() {
  return peers.filter(p => p.s && p.s.n && p.s.j).map(p => ({ uid: p.uid, n: String(p.s.n).slice(0, 10), c: p.s.c | 0, h: p.s.h | 0, j: p.s.j }))
    .sort((a, b) => a.j - b.j || (a.uid < b.uid ? -1 : 1));
}
function elect() {
  if (!electReady) return;
  const hs = humansSorted(); if (!hs.length) return;
  const h = hs[0].uid;
  if (h === hostUid) return;
  hostUid = h;
  if (h === uid) {
    host = new Host(world); host.adopt(G && G.id ? G : null, localEnd, lastBots);
  } else if (host) { host = null; delete myS.g; delete myS.bc; pushS(); }
  renderLobby();
}
function readGame() {
  if (host) return;
  const hp = peers.find(p => p.uid === hostUid);
  if (hp && hp.m && Array.isArray(hp.m.b)) lastBots = hp.m.b;
  const g = hp && hp.s && hp.s.g; if (!g || typeof g !== 'object') return;
  if (g.e === gE && g.id === gId) return;
  applyG(g, Date.now() + (g.rem || 0));
}
function applyG(g, est) {
  const prev = G; G = g; gE = g.e; gId = g.id;
  { const pi = (prev.P || []).findIndex(p => p[U] === uid), ni = (g.P || []).findIndex(p => p[U] === uid);
    if (pi >= 0 && ni >= 0 && prev.P[pi][AL] === 2 && g.P[ni][AL] === 1) { const h = world.homes[ni % world.homes.length]; teleport(h.sleep.x, h.sleep.z, h.ry + Math.PI, false); setTimeout(() => banner('💉 의사 덕분에 깨어났어요!\n자기 집이에요. 무슨 일이 있었는지는 기억나지 않아요.'), 300); SFX.bell('win'); }
    if (pi >= 0 && ni >= 0 && prev.P[pi][AL] === 1 && g.P[ni][AL] === 2) SFX.bell('bad');
    if (pi >= 0 && ni >= 0 && prev.P[pi][AL] === 1 && g.P[ni][AL] !== 1 && g.P[ni][RO] === 'q' && g.fk && g.fk[ni] !== undefined) setTimeout(() => banner(`🌫️ 사실 당신은 「${ROLES[g.fk[ni]].name}」이 아니라 몽상가였어요!\n지금까지 본 결과는 모두 꿈이었어요…`), 1500); }
  const pk = g.r + ':' + g.ph + ':' + g.id + ':' + (g.ph === 'night' && g.nts ? g.nt : '');
  if (pk !== lastPK || Math.abs(est - localEnd) > 1500) localEnd = est;
  if (pk !== lastPK) { lastPK = pk; onPhase(prev); }
  for (const l of (g.lg || [])) if (l[0] > seenLg) { seenLg = l[0]; addSys(fmt(l[1], g.P)); }
  if (g.lg && g.lg.length && g.lg[g.lg.length - 1][0] < seenLg - 50) seenLg = 0;
  render();
}
function hostLoop() {
  if (!host) return;
  host.w = world;
  const list = peers.map(p => p.uid === uid ? { ...p, s: myS } : p);
  if (!list.some(p => p.uid === uid)) list.push({ uid, s: myS });
  const changed = host.tick(list);
  if (host.bc.length && JSON.stringify(myS.bc) !== JSON.stringify(host.bc)) { myS.bc = host.bc.slice(); pushS(); readChat(); }
  if (changed) {
    myS.g = host.g; pushS();
    applyG(JSON.parse(JSON.stringify(host.g)), host.end); localEnd = host.end;
  }
  lastBots = host.botMotion();
}
setInterval(hostLoop, 200);

// ───────── 게임 상태 도우미 ─────────
const inGame = () => G.ph !== 'lobby';
const playing = () => G.ph !== 'lobby' && G.ph !== 'end';
const mySlot = () => (G.P || []).findIndex(p => p[U] === uid);
const myP = () => G.P[mySlot()];
const amAlive = () => { const p = myP(); return !!p && p[AL] === 1; };
const amDowned = () => { const p = myP(); return playing() && !!p && p[AL] === 2; };
const amGhost = () => playing() && !amAlive() && !amDowned();
const is3d = () => G.mode === 'classic' && !!G.opt && !G.opt.off && !G.opt.act;
const knownDead = i => { const p = G.P[i]; if (!p || p[AL] === 1) return false; if (!is3d() || G.ph === 'end' || (p[FL] & 8)) return true; return p[U] === uid || (amGhost() && p[AL] === 0); };
// 몽상가는 자기가 가짜 직업인 줄 안다 (죽거나 게임이 끝나면 진짜 정체가 보인다)
const realRole = () => { const p = myP(); return p ? p[RO] : null; };
const myRole = () => { const p = myP(), i = mySlot(); if (!p) return null; if (G.fk && G.fk[i] !== undefined && p[AL] === 1 && G.ph !== 'end') return G.fk[i]; return p[RO]; };
const pk = () => G.r + ':' + G.ph + (G.ph === 'night' && G.nts ? ':' + G.nt : '');
const curTurn = () => (G.mode === 'classic' && G.ph === 'night' && G.nts) ? TURNS[G.nts[G.nt]] : null;
const myTurn = () => { const t = curTurn(); return !t || t.roles.includes(myRole()); };
const sleeping = () => !!curTurn() && amAlive() && !myTurn();
let notes = [], noteSeen = {}, memo = {}, autoSent = new Set(), shSeen = new Set();
const slotName = i => (G.P[i] ? G.P[i][NM] : '?');
function entityInfo(id) {
  if (id === uid) return { n: me.name, c: me.color, h: me.hat };
  const P = (G.P || []).find(p => p[U] === id); if (P) return { n: P[NM], c: P[CO], h: P[HA] };
  const b = (G.B || []).find(b => b[0] === id); if (b) return { n: b[1], c: b[2], h: b[3] };
  const pr = peers.find(p => p.uid === id); if (pr && pr.s && pr.s.n) return { n: String(pr.s.n).slice(0, 10), c: pr.s.c | 0, h: pr.s.h | 0 };
  return null;
}

// ───────── 단계 전환 ─────────
function onPhase(prev) {
  const ph = G.ph, i = mySlot(), alive = amAlive();
  if (prev && prev.ph === 'night' && ph === 'night' && prev.r === G.r && G.nts) { onTurn(prev); return; }
  if (ph === 'role') { notes = []; noteSeen = {}; memo = {}; autoSent = new Set(); shSeen = new Set((G.sh || []).map(x => x[0])); }
  if (ph === 'role' || ph === 'lobby') for (let k = 0; k < 20; k++) world.setOwner(k, ph === 'role' && G.mode === 'classic' && G.P[k] ? G.P[k][NM] : '');
  myS.a = null; myS.v = null; myS.f = null; myS.sv = null; myS.tx = null; if (G.ph !== 'lobby') myS.rd = 0; pushS();
  closeModal();
  const news = (G.news || []).map(m => fmt(m, G.P)).join('\n');
  if (ph !== 'lobby') banner((news || PH_NAME[ph]) + (curTurn() ? `\n${curTurn().icon} 첫 차례: ${curTurn().name}` : ''));
  if (ph === 'night') SFX.bell('night'); else if (ph === 'morning' || ph === 'dawn') SFX.bell('day');
  else if (ph === 'end') SFX.bell(G.win && G.win.w && G.win.w.includes(i) ? 'win' : 'bad');
  else if (ph === 'execres' && news.includes('🪦')) SFX.bell('bad'); else if (ph !== 'lobby') SFX.pop();
  const off = !!(G.opt && G.opt.off);
  document.body.classList.toggle('offline', off && playing());
  if (host && off) narrate(ph, news);
  // 순간이동
  if (ph === 'lobby') { const sp = world.randomPoint(); teleport(sp.x, sp.z, me.ry, false); }
  else if (ph === 'explore') { me.sit = false; sendMotion(true); }
  else if (alive && i >= 0 && off && ph !== 'end') {
    if ((ph === 'defense' || ph === 'final') && i === G.tr) teleport(0, 0, 0, false);
    else { const s = world.seats[i]; teleport(s.x, s.z, s.ry, true); }
  }
  else if (alive && i >= 0) {
    if (ph === 'night' && G.mode === 'classic') { const h = world.homes[i % world.homes.length]; teleport(h.bed.x, h.bed.z, h.ry, false); me.lie = true; cam.yaw = h.ry + Math.PI; cam.pitch = Math.max(cam.pitch, 0.8); sendMotion(true); }
    else if (ph === 'day') { me.sit = false; sendMotion(true); }
    else if (SEATED.has(ph)) {
      if ((ph === 'defense' || ph === 'final') && i === G.tr) teleport(0, 0, 0, false);
      else { const s = world.seats[i]; teleport(s.x, s.z, s.ry, true); }
    }
  }
  if (ph === 'role') showRoleCard(true);
  if (G.mode === 'onuw' && ph === 'night' && alive) showOnuwNight();
  if (ph === 'end') showResults();
  if (ph === 'lobby' && prev && prev.ph === 'end') addSys('🔁 대기실로 돌아왔어요.');
  renderLobby(); render();
}
function narrate(ph, news) {
  const say = {
    role: '직업이 정해졌습니다. 각자 휴대폰으로 직업을 확인하세요.',
    night: G.mode === 'onuw' ? '밤이 되었습니다. 모두 고개를 숙이고, 휴대폰으로 능력을 고르세요.' : curTurn() ? `밤이 되었습니다. 모두 고개를 숙여 주세요. ${curTurn().say}는 고개를 들어, 휴대폰으로 대상을 고르세요.` : '밤이 되었습니다. 모두 고개를 숙여 주세요. 능력이 있는 분은 휴대폰으로 대상을 고르세요.',
    explore: '탐색 시간입니다. 마을을 돌아다니며 단서를 찾으세요.',
    dawn: '아침이 되었습니다. 모두 고개를 드세요. 휴대폰에서 밤사이 알게 된 것을 확인하세요.',
    morning: '아침이 되었습니다. 모두 고개를 드세요. ' + news,
    discuss: `토론을 시작하세요. 시간은 ${Math.round((localEnd - Date.now()) / 1000)}초입니다.`,
    vote: '투표 시간입니다. 휴대폰으로 투표하세요.',
  }[ph];
  speak(say || news);
}
function onTurn(prev) {
  const t = curTurn(), pt = TURNS[prev.nts[prev.nt]];
  if (pt && pt.roles.includes(myRole()) && amAlive() && !myTurn()) { const h = world.homes[mySlot() % world.homes.length]; teleport(h.bed.x, h.bed.z, h.ry, false); me.lie = true; sendMotion(true); }
  myS.a = null; myS.sv = null; pushS();
  closeModal();
  banner(`${t.icon} ${t.name}\n${myTurn() && amAlive() ? '지금 움직일 수 있어요! 능력을 쓰세요.' : '잠든 척… 내 차례를 기다려 주세요.'}`);
  if (myTurn() && amAlive()) { SFX.bell('day'); if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) { } } else SFX.pop();
  if (host && G.opt && G.opt.off) speak(`${pt ? pt.say + '는 고개를 숙여 주세요. ' : ''}${t.say}는 고개를 들어, 휴대폰으로 대상을 고르세요.`);
  render();
}
function teleport(x, z, ry, sit) { me.pos.set(x, 0, z); me.ry = ry; me.sit = sit; me.lie = false; cam.yaw = ry + Math.PI; sendMotion(true); }

// ───────── 입력 ─────────
const keys = new Set();
addEventListener('keydown', e => {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT')) {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }
  if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
  if (e.key === 'Enter') { e.preventDefault(); $('chatInput').focus(); return; }
  const k = e.key.toLowerCase(); keys.add(k);
  if (k === 'e' || k === 'ㄷ') doInteract();
  if (k === 'r' || k === 'ㄱ') showRoleCard();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); SFX.initAudio(); });
canvas.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  cam.yaw -= (e.clientX - drag.x) * 0.006; cam.pitch = Math.max(0.12, Math.min(1.25, cam.pitch + (e.clientY - drag.y) * 0.005));
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => drag = null); canvas.addEventListener('pointercancel', () => drag = null);
canvas.addEventListener('wheel', e => { cam.dist = Math.max(3.5, Math.min(16, cam.dist + e.deltaY * 0.01)); }, { passive: true });
const joy = { x: 0, y: 0, id: null };
$('joy').addEventListener('pointerdown', e => { joy.id = e.pointerId; $('joy').setPointerCapture(e.pointerId); joyMove(e); });
$('joy').addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyMove(e); });
const joyEnd = () => { joy.id = null; joy.x = joy.y = 0; $('knob').style.transform = ''; };
$('joy').addEventListener('pointerup', joyEnd); $('joy').addEventListener('pointercancel', joyEnd);
function joyMove(e) {
  const r = $('joy').getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy), m = r.width / 2 - 10; if (d > m) { dx = dx / d * m; dy = dy / d * m; }
  joy.x = dx / m; joy.y = dy / m; $('knob').style.transform = `translate(${dx}px,${dy}px)`;
}
$('btnE').onclick = () => doInteract();
if (innerWidth < 760) document.body.classList.add('hideSide', 'chatSmall');
$('btnSide').onclick = () => document.body.classList.toggle('hideSide');
$('btnChatT').onclick = () => document.body.classList.toggle('chatSmall');

// ───────── 상호작용 (밤 능력) ─────────
let nearTarget = null;
const listMode = () => !!(G.opt && (G.opt.act || G.opt.off));
function abilityInfo() {
  if (G.mode !== 'classic' || G.ph !== 'night' || !amAlive() || !myTurn()) return null;
  const r = myRole(), R = ROLES[r], i = mySlot(), nc = G.nc || {};
  if (r === 'E' && G.opt && G.opt.off) {
    if (nc.used && nc.used[i]) return { done: '🔮 오늘 밤은 이미 영혼과 이야기했어요.' };
    if (!G.P.some(p => p[AL] !== 1)) return { done: '🔮 아직 떠난 영혼이 없어요.' };
    return { k: 'med', verb: '영혼 부르기', icon: '🔮' };
  }
  const A = is3d() ? (R && R.night ? { k: R.night, verb: R.verb, icon: R.icon } : null) : legacyNight(r);
  if (!A) return null;
  if (is3d() && A.k === 'kill' && nc.done) return { done: '🔪 오늘 밤 처치는 끝났어요. 시체를 E로 끌어 숨길 수 있어요.', drag: true };
  if (A.k === 'ignite') { const n = oilAlive().length; return n ? { k: 'ignite', verb: `점화 (기름 묻은 ${n}명)`, icon: '🔥' } : { done: '🔥 아직 기름 묻은 사람이 없어요. 낮에 기름을 부으세요.' }; }
  if (['inv', 'spy', 'blk', 'track', 'revive', 'heal', 'watch', 'bond'].includes(A.k) && is3d() && nc.used && nc.used[i]) return { done: `${A.icon} 오늘 밤 능력은 이미 썼어요.` };
  if (A.k === 'bond' && nc.bd && nc.bd[i] !== undefined) return { ...A, verb: '나머지 실 묶기 (같은 편인지 확인)' };
  if ((A.k === 'inv' || A.k === 'spy' || A.k === 'blk') && nc.used && nc.used[i]) return { done: `${A.icon} 오늘 밤 능력은 이미 썼어요.` };
  if (A.k === 'clean' && (((G.yc || {})[uid]) || 0) >= 2) return { done: '🧹 흔적 지우기를 모두 썼어요.' };
  if (A.k === 'scoop') { if (G.r < 2) return { done: '📜 취재는 둘째 밤부터 할 수 있어요.' }; if (myP()[FL] & 2) return null; }
  return A;
}
const oilAlive = () => (G.oil || []).filter(j => G.P[j] && G.P[j][AL] === 1);
// 내가 아는 마피아: 마피아는 서로 다 알고, 보조는 능력으로 알아낸 사람만 안다
function knownMafia() {
  if (G.mode !== 'classic' || !G.P) return [];
  const i = mySlot(), r = i >= 0 ? G.P[i][RO] : null;
  if (isMafia(r)) return G.P.map((p, j) => j).filter(j => isMafia(G.P[j][RO]));
  if (isSupport(r)) return ((G.kn || {})[i] || []).slice();
  return [];
}
function candidates(info) {
  const i = mySlot();
  if (info.k === 'med') return G.P.map((p, j) => j).filter(j => G.P[j][AL] !== 1);
  return G.P.map((p, j) => j).filter(j => G.P[j][AL] === 1 && (info.k === 'heal' || j !== i)
    && !(info.k === 'kill' && isMafia(G.P[j][RO])) && !(info.k === 'oil' && oilAlive().includes(j)) && !(info.k === 'bond' && G.nc && G.nc.bd && G.nc.bd[i] === j));
}
// 둔갑쥐 변장: 밤 동안 다른 사람 눈에는 훔친 모습으로 보인다
function lookSlot(slot) {
  const dg = G.dg;
  if ((is3d() ? G.ph === 'day' : G.ph === 'night') && dg && dg.q === slot && G.P[dg.t] && G.P[slot] && G.P[slot][AL] === 1 && !(isMafiaTeam(myRole()) && playing()) && !amGhost()) return dg.t;
  return slot;
}
const dispName = slot => slotName(lookSlot(slot));
function findTarget(info) {
  const ok = new Set(candidates(info));
  let best = null, bd = 2.7;
  for (const [id, a] of avatars) {
    if (id === uid || !a.obj.visible) continue;
    const s = G.P.findIndex(p => p[U] === id); if (s < 0 || !ok.has(s)) continue;
    const d = Math.hypot(a.obj.position.x - me.pos.x, a.obj.position.z - me.pos.z);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function sendAct(k, t, extra) { myS.a = { q: ++actQ, pk: pk(), k, t, ...(extra || {}) }; pushS(true); SFX.pop(); }
function nearClue() {
  if ((G.ph !== 'explore' && G.ph !== 'day') || !amAlive()) return null;
  let best = null, bd = 2.2;
  for (const c of (G.cl || [])) { const d = Math.hypot(c[1] - me.pos.x, c[2] - me.pos.z); if (d < bd) { bd = d; best = c; } }
  return best;
}
const myClues = () => ((G.ck || {})[uid] || []).length;
// 3D 탐색 모드: 지금 할 수 있는 행동 목록 (가까운 것부터)
const dxz = (x, z) => Math.hypot(x - me.pos.x, z - me.pos.z);
const usedDay = k => (((G.du || {})[uid]) || {})[k] || 0;
const carrying = () => (G.bd || []).find(b => b[6] === mySlot());
function options3d() {
  const out = [], i = mySlot(), r = myRole(); if (!is3d() || !amAlive()) return out;
  if (G.ph === 'night') {
    if (!myTurn()) return out;
    const info = abilityInfo();
    if (isMafia(r) && curTurn() && G.nts[G.nt] === 'maf') {
      const c = carrying();
      if (c) out.push({ d: 0, label: world.nearHide(me.pos.x, me.pos.z) ? '⬇️ 시체 숨기기 (여기 내려놓기)' : '⬇️ 시체 내려놓기 (숨김 장소 곁이면 숨겨져요)', k: 'drag', t: c[0] });
      else for (const b of (G.bd || [])) { if (b[1] < 0 || b[6] >= 0) continue; const d = dxz(b[2], b[3]); if (d < 2.6) out.push({ d, label: `🫳 ${slotName(b[1])}님 시체 끌기`, k: 'drag', t: b[0] }); }
    }
    if (info && !info.done && info.k === 'clean') {
      for (const b of (G.bd || [])) { if (b[1] < 0 || b[6] >= 0) continue; const d = dxz(b[2], b[3]); if (d < 2.6) out.push({ d, label: `🧹 ${slotName(b[1])}님 시체의 흔적 지우기`, k: 'clean', t: b[0] }); }
      for (const st of (G.st || [])) { const d = dxz(st[0], st[1]); if (d < 2.6) out.push({ d: d + 0.2, label: '🧹 핏자국 지우기', k: 'clean', t: st[3] }); }
    } else if (info && !info.done && info.k === 'watch') {
      // 잠복꾼: 남의 집 앞·집 안에서 잠복
      let h = world.houseAt(me.pos.x, me.pos.z), d = 0;
      if (h < 0) { let bd = 3.2; world.homes.forEach((hm, k) => { const dd = dxz(hm.doorOut.x, hm.doorOut.z); if (dd < bd) { bd = dd; h = k; } }); d = bd; }
      if (h >= 0 && h !== i && h < (G.P || []).length) out.push({ d, label: `🔭 ${h + 1}번 집 (${slotName(h)}) 앞에서 잠복하기`, k: 'watch', t: h });
    } else if (info && !info.done && info.k === 'revive') {
      // 의사: 집 앞·집 안에서 그 집을 치료
      let h = world.houseAt(me.pos.x, me.pos.z), d = 0;
      if (h < 0) { let bd = 3.2; world.homes.forEach((hm, k) => { const dd = dxz(hm.doorOut.x, hm.doorOut.z); if (dd < bd) { bd = dd; h = k; } }); d = bd; }
      if (h >= 0 && h < (G.P || []).length) out.push({ d, label: `💉 ${h + 1}번 집 (${slotName(h)}${h === i ? ', 내 집' : ''}) 치료하기`, k: 'heal', t: h });
    } else if (info && !info.done) {
      if (info.k === 'ignite') out.push({ d: 9, label: `🔥 ${info.verb}`, k: 'ignite', t: -1 });
      else { const t = findTarget(info); if (t !== null) out.push({ d: 1, label: `${info.icon} ${dispName(t)}님 ${info.verb}`, k: info.k, t }); }
    }
    return out.sort((a, b) => a.d - b.d);
  }
  if (G.ph !== 'day') return out;
  for (const b of (G.bd || [])) {
    if (b[6] >= 0) continue; const d = dxz(b[2], b[3]); if (d > (b[4] ? 2 : 3.2)) continue;
    const who = b[1] >= 0 ? slotName(b[1]) + '님' : '누군가';
    if (r === 'E' && !usedDay('m')) out.push({ d: d - 0.1, label: `🔔 ${who}의 넋 읽기`, k: 'medium', t: b[0] });
    out.push({ d, label: `🚨 ${who}의 시체 신고`, k: 'report', t: b[0] });
  }
  for (const c of (G.cl || [])) {
    const d = dxz(c[1], c[2]); if (d > 2.2) continue;
    if (myClues() < 3) out.push({ d: d + 1, label: '🔍 단서 줍기', k: 'clue', t: c[0] });
    if (isMafiaTeam(r) && (G.fgU || 0) < (G.fgM || 0)) out.push({ d: d + 1.1, label: `🎭 가짜 단서로 바꿔치기 (팀 전체 ${G.fgM - (G.fgU || 0)}번 남음)`, k: 'forge', t: c[0] });
  }
  const nearHouse = (excludeOwn) => { let best = -1, bd = 3; world.homes.forEach((h, k) => { if (k >= (G.P || []).length || (excludeOwn && k === i)) return; const dd = Math.min(dxz(h.doorOut.x, h.doorOut.z), dxz(h.sleep.x, h.sleep.z)); if (dd < bd) { bd = dd; best = k; } }); return best; };
  if (r === 'K' && (((G.kc || {})[uid]) || 0) < 2) { const h = nearHouse(false); if (h >= 0 && !(G.lk || []).includes(h)) out.push({ d: 1.5, label: `🔒 ${h + 1}번 집(${slotName(h)}) 문 잠그기 (${2 - (((G.kc || {})[uid]) || 0)}번 남음)`, k: 'lock', t: h }); }
  if (r === 'w') { const h = nearHouse(true), mine = ((G.stp || {})[i]) || []; if (h >= 0 && !mine.includes(h)) out.push({ d: 1.5, label: `🎒 ${h + 1}번 집 이름표에 도장 찍기 (${mine.length}/5)`, k: 'stamp', t: h }); }
  if (r === 'L' && !usedDay('l')) (world.lampPos || []).forEach((lp, k) => { const d = dxz(lp.x, lp.z); if (d < 3) out.push({ d, label: '🏮 가로등 밝히기 (오늘 밤 지나가는 사람 기억)', k: 'lamp', t: k }); });
  if (r === 'Z' && (((G.zc || {})[uid]) || 0) < 3) (world.hideSpots || []).forEach((hs, k) => { const d = dxz(hs.x, hs.z); if (d < 3) out.push({ d, label: `🔦 「${hs.name}」 수색하기 (${3 - (((G.zc || {})[uid]) || 0)}번 남음)`, k: 'search', t: k }); });
  if (r === 'U') for (const b of (G.bd || [])) { if (b[6] >= 0) continue; const d = dxz(b[2], b[3]); if (d < (b[4] ? 2 : 3.2)) out.push({ d: d - 0.3, label: '⚱️ 유품 챙기기 (시체는 자동 신고돼요)', k: 'relic', t: b[0] }); }
  const nearP = (fn) => { let best = null, bd = 2.3; for (const [id, a] of avatars) { if (id === uid || !a.obj.visible) continue; const s = G.P.findIndex(p => p[U] === id); if (s < 0 || G.P[s][AL] !== 1 || !fn(s)) continue; const d = dxz(a.obj.position.x, a.obj.position.z); if (d < bd) { bd = d; best = s; } } return best; };
  if (r === 'X' && !usedDay('x')) { const t = nearP(() => true); if (t !== null) out.push({ d: 2, label: `🗡️ ${dispName(t)}님 처치하기 (하루 1번)`, k: 'slay', t }); }
  if (r === 'F' && usedDay('f') < 2) { const t = nearP(s => !oilAlive().includes(s)); if (t !== null) out.push({ d: 2.1, label: `🔥 ${dispName(t)}님에게 몰래 기름 붓기 (${2 - usedDay('f')}번 남음)`, k: 'oil', t }); }
  return out.sort((a, b) => a.d - b.d);
}
function runOpt(o) { sendAct(o.k, o.t); toast(o.label.replace(/\s*\(.*\)$/, '')); }
function doInteract() {
  if (is3d() && (G.ph === 'day' || G.ph === 'night')) {
    const opts = options3d();
    if (!opts.length) { const info = abilityInfo(); toast(info && info.done ? info.done : G.ph === 'night' ? '대상 곁으로 다가가세요' : '시체·단서·사람 곁으로 다가가세요'); return; }
    if (opts.length === 1) return runOpt(opts[0]);
    modal(`<h2>무엇을 할까요?</h2><div class="opts" style="flex-direction:column">${opts.map((o, k) => `<button data-o="${k}">${esc(o.label)}</button>`).join('')}</div><div class="btns"><button id="oX">닫기</button></div>`);
    $('mbody').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.o !== undefined) runOpt(opts[+b.dataset.o]); closeModal(); };
    return;
  }
  if (G.ph === 'explore') {
    const c = nearClue(); if (!c) { toast('빛나는 단서 가까이 가서 E를 누르세요'); return; }
    if (myClues() >= 3) { toast('오늘은 단서를 3개까지 주울 수 있어요'); return; }
    sendAct('clue', c[0]); return;
  }
  const info = abilityInfo(); if (!info) return;
  if (info.done) { toast(info.done); return; }
  if (listMode()) { showAbilityPicker(); return; }
  let t = findTarget(info);
  if (t === null) {
    if (info.k === 'heal') t = mySlot();
    else if (info.k === 'oil' && oilAlive().length) { sendAct('ignite', -1); toast(`🔥 기름 묻은 ${oilAlive().length}명에게 불을 붙여요!`); return; }
    else { toast('대상에게 더 가까이 다가가세요'); return; }
  }
  sendAct(info.k, t);
  toast(`${info.icon} ${dispName(t)}님에게 「${info.verb}」`);
}
function showAbilityPicker() {
  const info = abilityInfo(); if (!info || info.done) { if (info) toast(info.done); return; }
  const list = candidates(info);
  const ign = info.k === 'oil' && oilAlive().length ? `<button id="abIgn" class="danger">🔥 점화 (기름 묻은 ${oilAlive().length}명)</button>` : '';
  modal(`<h2>${info.icon} ${ROLES[myRole()] ? ROLES[myRole()].name : ''} — ${info.verb}</h2><p>대상을 고르세요. 아침이 오기 전까지 바꿀 수 있어요${info.k === 'inv' || info.k === 'spy' || info.k === 'med' ? ' (한 번 고르면 끝)' : ''}.</p>
  <div class="opts">${list.map(j => `<button data-ab="${j}">${esc(G.P[j][NM])}${j === mySlot() ? ' (나)' : ''}${oilAlive().includes(j) ? ' 🛢️' : ''}</button>`).join('')}</div>${ign}
  <div class="btns"><button id="abX">닫기</button></div>`);
  $('mbody').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'abX') return closeModal();
    if (b.id === 'abIgn') { sendAct('ignite', -1); closeModal(); toast('🔥 오늘 밤 불을 붙여요!'); return; }
    if (b.dataset.ab !== undefined) { const t = +b.dataset.ab; sendAct(info.k, t); closeModal(); toast(`${info.icon} ${slotName(t)}님에게 「${info.verb}」`); }
  };
}

// ───────── 채팅 ─────────
function chatChannel() {
  if (!playing()) return { ch: 'a', label: '전체' };
  if (G.opt && G.opt.off) return { ch: null, why: '오프라인 진행: 얼굴 보고 직접 말해요' };
  if (mySlot() < 0) return { ch: 'd', label: '관전·유령' };
  if (amDowned()) return { ch: null, why: '정신을 잃었어요…' };
  if (!amAlive()) return { ch: 'd', label: '유령' };
  if (is3d() && G.ph === 'day') return { ch: 'n', label: '근처' };
  if (is3d() && G.ph === 'morning') return { ch: 'n', label: '근처' };
  const r = myRole();
  if (G.mode === 'classic') {
    if (G.ph === 'role') return { ch: null, why: '직업을 확인하는 중이에요' };
    if (G.ph === 'night') return isMafia(r) ? { ch: 'm', label: '마피아끼리' } : { ch: null, why: isSupport(r) ? '보조는 마피아와 채팅할 수 없어요' : '밤에는 조용히… (마피아끼리만 대화해요)' };
    if (G.ph === 'defense' && G.tr !== mySlot()) return { ch: null, why: '최후 변론 중에는 재판대에 선 사람만 말할 수 있어요' };
    return { ch: 'a', label: '전체' };
  }
  if (G.ph === 'role' || G.ph === 'night') return { ch: null, why: '밤에는 모두 눈을 감고 있어요' };
  return { ch: 'a', label: '전체' };
}
function canRead(ch, from) {
  if (ch === 'a') return true;
  if (ch === 'n') { if (!playing() || amDowned()) return false; if (amGhost() || from === uid) return true; const a = avatars.get(from); return !!a && a.obj.visible && dxz(a.obj.position.x, a.obj.position.z) < 9; }
  if (!playing()) return false;
  if (ch === 'm') return isMafia(myRole()) && G.mode === 'classic';
  if (ch === 'd') return amGhost() || (G.mode === 'classic' && myRole() === 'E' && G.ph === 'night');
  return false;
}
function sendChat() {
  const inp = $('chatInput'); const t = inp.value.trim().slice(0, 60); if (!t) return;
  const c = chatChannel(); if (!c.ch) { toast(c.why); return; }
  myS.ch = myS.ch.concat([[++chatSeq, t, c.ch, Date.now()]]).slice(-5); pushS(true);
  inp.value = ''; readChat();
  if (isTouch) inp.blur();
}
$('chatSend').onclick = sendChat;
$('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } });
function readChat() {
  const all = peers.map(p => p.uid === uid ? { uid, s: myS } : p);
  if (!all.some(p => p.uid === uid)) all.push({ uid, s: myS });
  for (const p of all) {
    const s = p.s; if (!s) continue;
    for (const m of (Array.isArray(s.ch) ? s.ch : [])) post(p.uid, m, null);
    if (p.uid === hostUid) for (const m of (Array.isArray(s.bc) ? s.bc : [])) post(p.uid, m, m[3]);
  }
}
function post(from, m, bot) {
  if (!Array.isArray(m)) return;
  const key = from + ':' + (bot ? 'b' : '') + m[0]; if (seenChat.has(key)) return; seenChat.add(key);
  if (bot === null && m[3] && m[3] < joinedAt - 2000) return;
  const ch = m[2]; if (!canRead(ch, bot || from)) return;
  const info = entityInfo(bot || from); if (!info) return;
  const div = document.createElement('div'); div.className = 'm ch-' + ch;
  const pre = ch === 'm' ? '[마피아] ' : ch === 'd' ? '[유령] ' : ch === 'n' ? '[근처] ' : '';
  div.innerHTML = `${pre}<span class="dot" style="display:inline-block;width:10px;height:10px;vertical-align:0;background:${COLORS[info.c] || '#fff'}"></span> <b>${esc(info.n)}</b>: ${esc(String(m[1]).slice(0, 60))}`;
  appendLog(div);
  if ((ch === 'a' || ch === 'n') && from !== uid) bubble(bot || from, String(m[1]).slice(0, 24));
}
function addSys(t) { if (!t) return; const d = document.createElement('div'); d.className = 's'; d.textContent = t; appendLog(d); }
function appendLog(d) { const L = $('chatLog'); const stick = L.scrollTop + L.clientHeight > L.scrollHeight - 30; L.appendChild(d); while (L.children.length > 120) L.firstChild.remove(); if (stick) L.scrollTop = L.scrollHeight; }
const bubbles = new Map();
function bubble(id, t) { bubbles.set(id, { t, until: performance.now() + 4500 }); }

// ───────── UI 렌더링 ─────────
function render() {
  if ($('hud').hidden) return;
  document.body.classList.toggle('inlobby', G.ph === 'lobby');
  document.body.classList.toggle('nightdim', !!(G.opt && G.opt.off) && (G.ph === 'night') && amAlive() && !(curTurn() && myTurn()));
  document.body.classList.toggle('sleeping', sleeping() || amDowned());
  if (amDowned()) $('sleepTxt').textContent = '💫 누군가에게 습격당해 정신을 잃었어요…\n의사가 찾아와 치료해 주면 깨어날 수 있어요.\n(누가 공격했는지는 기억나지 않아요)';
  else if (sleeping()) $('sleepTxt').textContent = `😴 ${curTurn().icon} ${curTurn().name}이에요. 내 차례가 올 때까지 잠들어 있어요.` + (G.mode === 'classic' && isMafia(myRole()) && amAlive() ? '\n🔪 마피아끼리는 아래 채팅으로 몰래 대화할 수 있어요.' : '');
  document.body.classList.toggle('voting', G.ph === 'vote' || G.ph === 'end');
  { const ab = abilityInfo(); document.body.classList.toggle('canE', (!!ab && !ab.done && !listMode()) || (G.ph === 'explore' && amAlive()) || (is3d() && options3d().length > 0)); }
  syncNotes(); syncAppraise();
  $('phName').textContent = (G.mode === 'onuw' && inGame() ? '한밤 · ' : '') + (curTurn() ? curTurn().icon + ' ' + curTurn().name : (PH_NAME[G.ph] || G.ph)) + (G.mode === 'classic' && G.r && playing() ? ` · ${G.r}일차` : '');
  // 내 직업 버튼
  const r = myRole();
  if (inGame() && r) { const R = (G.mode === 'onuw' ? ONUW : ROLES)[r]; $('myRole').textContent = `${R.icon} ${R.name}${amAlive() || G.ph === 'end' ? '' : ' (유령)'}`; }
  else $('myRole').textContent = inGame() ? '👻 관전 중' : '🎭 대기실';
  // 개인 메시지
  const pmv = G.pm && G.pm[uid];
  $('pm').hidden = !pmv || !playing(); if (pmv) $('pm').textContent = fmt(pmv, G.P);
  $('btnNote').hidden = !playing(); $('btnNote').textContent = `📒 수첩 ${notes.length}`;
  renderPlayers(); renderLobby(); renderActions(); renderChatState();
}
function renderChatState() {
  const c = chatChannel(); $('chatCh').textContent = c.ch ? c.label : '🔇';
  document.body.classList.toggle('mafchat', c.ch === 'm' && G.ph === 'night');
  $('chatInput').disabled = !c.ch; $('chatInput').placeholder = c.ch === 'm' && G.ph === 'night' ? '🔪 마피아끼리만 보여요' : c.ch ? (isTouch ? '채팅' : 'Enter로 채팅') : c.why;
}
function renderPlayers() {
  const L = $('plist'); let html = '';
  const voting = (G.ph === 'vote') && amAlive();
  const myVote = myS.v && myS.v.pk === pk() ? myS.v.t : -2;
  const mafiaMe = G.mode === 'classic' && isMafiaTeam(myRole()) && playing(), knownM = knownMafia();
  if (inGame() && G.P && G.P.length) {
    G.P.forEach((p, i) => {
      const dead = knownDead(i), online = p[U].startsWith('bot') || p[U] === uid || peers.some(x => x.uid === p[U]);
      const vc = ((G.ph === 'vote' && G.mode === 'classic') || (G.mode === 'onuw' && G.ph === 'end')) && G.vt && G.vt[i] ? `<span class="vc">${G.vt[i]}</span>` : '';
      const tags = [];
      if (p[U] === uid) tags.push('<span class="tag">나</span>');
      if (mafiaMe && knownM.includes(i)) tags.push(`<span class="tag red">${ROLES[p[RO]].name}</span>`);
      if (G.ph === 'end') { const R = (G.mode === 'onuw' ? ONUW : ROLES)[G.mode === 'onuw' && G.F ? G.F[i] : p[RO]]; tags.push(`<span class="tag">${R.icon}${R.name}</span>`); }
      if (G.tr === i && (G.ph === 'defense' || G.ph === 'final')) tags.push('<span class="tag red">재판</span>');
      if (!online) tags.push('<span class="tag">오프라인</span>');
      const click = voting && !dead && (G.mode === 'onuw' ? i !== mySlot() : true);
      if (is3d() && G.ph === 'night' && p[U] !== uid && !dead && !(mafiaMe && knownM.includes(i))) tags.push(`<span class="tag">🏠${i + 1}</span>`);
      const mm = memo[p[U]], T = G.mode === 'onuw' ? ONUW : ROLES;
      if (mm && mm.g && T[mm.g]) tags.push(`<span class="tag" title="내 추리">🔎${T[mm.g].icon}</span>`);
      if (mm && mm.x.length) tags.push(`<span class="tag" title="아님: ${mm.x.map(r => T[r] ? T[r].name : '').join(', ')}">✖${mm.x.length}</span>`);
      const memoBtn = playing() && p[U] !== uid ? `<span class="memo" data-memo="${i}" title="직업 메모">📝</span>` : '';
      html += `<div class="pl ${dead && G.mode === 'classic' ? 'dead' : ''} ${click ? 'click' : ''} ${myVote === i ? 'sel' : ''}" data-i="${i}"><span class="dot" style="background:${COLORS[p[CO]]}"></span><span class="nm">${esc(p[NM])}</span>${tags.join('')}${vc}${memoBtn}</div>`;
    });
    $('pcount').textContent = `${G.P.filter((p, i) => !knownDead(i)).length}/${G.P.length}${is3d() && playing() ? ' (확인된 생존)' : ' 생존'}`;
  } else {
    const hs = humansSorted();
    hs.forEach(h => html += `<div class="pl"><span class="dot" style="background:${COLORS[h.c]}"></span><span class="nm">${esc(h.n)}</span>${(peers.find(p => p.uid === h.uid) || {}).s && (h.uid === uid ? myS.rd : peers.find(p => p.uid === h.uid).s.rd) ? '<span class="tag">✅ 준비</span>' : '<span class="tag">대기</span>'}${h.uid === uid ? '<span class="tag">나</span>' : ''}</div>`);
    (G.B || []).forEach(b => html += `<div class="pl"><span class="dot" style="background:${COLORS[b[2]]}"></span><span class="nm">${esc(b[1])}</span><span class="tag">봇</span></div>`);
    $('pcount').textContent = `${hs.length + (G.B || []).length}/20`;
  }
  if (inGame() && G.P) { const spec = humansSorted().filter(h => !G.P.some(p => p[U] === h.uid)); spec.forEach(h => html += `<div class="pl" style="opacity:.6"><span class="dot" style="background:${COLORS[h.c]}"></span><span class="nm">${esc(h.n)}</span><span class="tag">관전</span></div>`); }
  if (L.dataset.h !== html) { L.innerHTML = html; L.dataset.h = html; }
}
$('plist').onclick = e => {
  const mb = e.target.closest('[data-memo]'); if (mb) { showMemo(+mb.dataset.memo); return; }
  const el = e.target.closest('.pl.click'); if (!el) return;
  const t = +el.dataset.i; myS.v = { pk: pk(), t }; pushS(true); SFX.tick(); renderPlayers();
};
function renderActions() {
  const A = $('actbar'); let h = '';
  const showFinal = G.ph === 'final' && amAlive() && G.tr !== mySlot();
  $('finalBox').hidden = !showFinal;
  if (showFinal) { const y = myS.f && myS.f.pk === pk() ? myS.f.y : -1; $('fYes').classList.toggle('on', y === 1); $('fNo').classList.toggle('on', y === 0); }
  if (G.ph === 'vote' && amAlive()) h += `<button id="aSkipVote">${myS.v && myS.v.pk === pk() && myS.v.t === -1 ? '✔ 기권함' : '기권'}</button>`;
  if (G.ph === 'discuss' && amAlive()) { const used = myS.tx && myS.tx.pk === pk(); h += used ? '<button disabled>⏱️ 시간 조절함</button>' : '<button id="aMore">⏱️ +15초</button><button id="aLess">⏱️ −15초</button>'; }
  const ab = abilityInfo();
  if (ab && !ab.done && listMode()) h += `<button id="aAbil" class="primary">${ab.icon} ${listMode() ? '능력 쓰기' : ab.verb}</button>`;
  if (playing() || G.ph === 'end') {
    const mine = myS.sv === pk(), cnt = `${G.sk || 0}/${G.skn || '?'}`;
    let canVote = G.ph === 'end' ? mySlot() >= 0 : (amAlive() || (mySlot() >= 0 && !G.P.some(p => p[AL] === 1 && !p[U].startsWith('bot'))));
    if (curTurn()) canVote = false; // 밤 차례는 시간 고정 — 넘기기 없음
    const label = G.ph === 'day' ? '🌙 밤으로 (과반)' : G.ph === 'discuss' ? '⏩ 토론 끝내기' : G.ph === 'end' ? '🔁 대기실로' : curTurn() ? '✅ 행동 끝' : G.ph === 'explore' ? '⏩ 탐색 끝내기' : '⏭ 넘기기';
    if (canVote && G.ph !== 'role') h += `<button id="aSkip" class="${mine ? 'on' : ''}" title="${G.ph === 'discuss' ? '살아 있는 사람 모두가 누르면' : '과반이 누르면'} 넘어가요">${mine ? '✔ ' : ''}${label}${curTurn() && G.ph === 'night' ? '' : ' ' + cnt}</button>`;
  }
  if (G.ph === 'vote' && amAlive()) h = '<span style="background:var(--card);padding:9px 14px;border-radius:12px;border:1px solid var(--line)">오른쪽 목록에서 이름을 눌러 투표하세요</span>' + h;
  if (G.mode === 'onuw' && G.ph === 'night' && amAlive()) h += '<button id="aOnuw" class="primary">🌙 내 능력 고르기</button>';
  if (G.mode === 'onuw' && (G.ph === 'dawn' || G.ph === 'discuss' || G.ph === 'vote') && G.pm && G.pm[uid]) h += '<button id="aPm">🔎 밤에 알게 된 것</button>';

  if (is3d() && G.ph === 'day' && amAlive()) {
    const called = (G.cu || []).includes(mySlot()), inPlaza = Math.hypot(me.pos.x, me.pos.z) < 13.5;
    h += called ? '<button disabled>🔔 오늘 소집함</button>' : inPlaza ? '<button id="aCall" class="danger">🔔 소집하기</button>' : '<button disabled title="광장에서만">🔔 소집은 광장에서</button>';
    if (myRole() === 'J' && !(myP()[FL] & 16)) h += '<button id="aDummy">🃏 가짜 시체 놓기</button>';
    if (myRole() === 'V' && !usedDay('v')) h += '<button id="aLure">🪤 가짜 단서 숨기기</button>';
    if (carrying()) h += '';
  }
  if (G.mode === 'classic' && playing() && amAlive() && myRole() === 'I' && G.r <= 2 && G.ph !== 'night' && G.ph !== 'role') {
    const bet = (G.bet || {})[mySlot()];
    h += `<button id="aBetT" class="${bet === 'town' ? 'on' : ''}">🎲 마을에 걸기</button><button id="aBetM" class="${bet === 'mafia' ? 'on' : ''}">🎲 마피아에 걸기</button>`;
  }
  if ((G.ph === 'explore' || G.ph === 'day') && amAlive()) h = `<span class="pillnote">🔍 주운 단서 ${myClues()}/3 · 남은 단서 ${(G.cl || []).length}개</span>` + h;
  if (G.ph === 'end') h += '<button id="aRes" class="primary">🏆 결과 보기</button>';
  if (A.dataset.h !== h) { A.innerHTML = h; A.dataset.h = h; }
}
$('actbar').onclick = e => {
  const id = e.target.id;
  if (id === 'aSkip') { myS.sv = myS.sv === pk() ? null : pk(); pushS(true); renderActions(); }
  if (id === 'aMore' || id === 'aLess') { myS.tx = { pk: pk(), d: id === 'aMore' ? 1 : -1 }; pushS(true); renderActions(); }
  if (id === 'aAbil') doInteract();
  if (id === 'aSkipVote') { myS.v = { pk: pk(), t: -1 }; pushS(true); render(); }
  if (id === 'aOnuw') showOnuwNight();
  if (id === 'aPm') modal(`<h2>밤사이 알게 된 것</h2><p>${esc(fmt(G.pm[uid], G.P))}</p><div class="btns"><button onclick="document.getElementById('modal').hidden=true">닫기</button></div>`);
  if (id === 'aRes') showResults();
  if (id === 'aNotes') showNotes();
  if (id === 'aCall') { sendAct('call', -1); toast('🔔 종을 울렸어요!'); }
  if (id === 'aDummy') { sendAct('dummy', -1); toast('🃏 가짜 시체를 놓았어요'); }
  if (id === 'aLure') { sendAct('lure', -1); toast('🪤 가짜 단서를 숨겼어요'); }
  if (id === 'aBetT' || id === 'aBetM') { sendAct('bet', id === 'aBetM' ? 1 : 0); toast(id === 'aBetM' ? '🎲 마피아 팀에 걸었어요' : '🎲 마을 사람들에 걸었어요'); }
};
$('fYes').onclick = () => { myS.f = { pk: pk(), y: 1 }; pushS(true); SFX.tick(); renderActions(); };
$('fNo').onclick = () => { myS.f = { pk: pk(), y: 0 }; pushS(true); SFX.tick(); renderActions(); };

function renderLobby() {
  const box = $('lobby'); const show = G.ph === 'lobby' && !$('hud').hidden;
  box.hidden = !show; if (!show) return;
  const hs = humansSorted(), n = Math.min(20, hs.length + (G.B || []).length), o = G.opt || {};
  let deckTxt = '';
  if (G.mode === 'onuw') {
    if (n >= 3) { const cnt = {}; onuwDeck(n).forEach(r => cnt[r] = (cnt[r] || 0) + 1); deckTxt = Object.keys(ONUW).filter(r => cnt[r]).map(r => [r, cnt[r]]).map(([r, c]) => `${ONUW[r].icon}${ONUW[r].name}${c > 1 ? '×' + c : ''}`).join(' · ') + ` (카드 ${n + 3}장, 가운데 3장)`; }
    else deckTxt = '3명 이상 필요해요.';
  } else {
    if (n >= 4) deckTxt = deckSummary(n, o);
    else deckTxt = '4명 이상 필요해요.';
  }
  const opt = (k, v, label, cur) => `<button class="chip ${cur === v ? 'on' : ''}" data-k="${k}" data-v="${v}">${label}</button>`;
  const ready = hs.filter(x => x.uid === uid ? myS.rd : (peers.find(p => p.uid === x.uid) || { s: {} }).s.rd).length;
  const min = G.mode === 'onuw' ? 3 : 4;
  let h = `<h3>⚙️ 게임 설정 · ${n}/20명 <span style="font-weight:400;color:var(--mut);font-size:12px">누구나 바꿀 수 있어요</span></h3><div class="grid">`;
  h += `<span>모드</span><div class="chips">${opt('mode', 'classic', '🔪 클래식', G.mode)}${opt('mode', 'onuw', '🐺 한밤의 늑대인간', G.mode)}</div>`;
  if (G.mode === 'classic') {
    h += `<span>마피아 수</span><div class="chips">${opt('maf', 0, '자동', o.maf)}${[1, 2, 3, 4, 5].map(k => opt('maf', k, k + '명', o.maf)).join('')}</div>`;
    h += `<span>중립 직업</span><div class="chips">${opt('neu', 2, '랜덤', o.neu === 1 ? 2 : o.neu)}${opt('neu', 0, '없음', o.neu)}</div>`;
    if (o.neu !== 0) h += `<span>🌫️ 몽상가</span><div class="chips">${opt('dr', 1, '넣기', o.dr === undefined ? 1 : o.dr)}${opt('dr', 0, '빼기', o.dr === undefined ? 1 : o.dr)}</div>`;
    h += `<span>죽으면</span><div class="chips">${opt('rev', 0, '직업 숨김', o.rev)}${opt('rev', 1, '직업 공개', o.rev)}</div>`;
  }
  h += `<span>진행</span><div class="chips">${opt('off', 0, '🌐 온라인 (각자 집에서)', o.off)}${opt('off', 1, '🏠 오프라인 (한자리에서)', o.off)}</div>`;
  if (G.mode === 'classic' && !o.off) h += `<span>규칙</span><div class="chips">${opt('act', 0, '🏘️ 3D 탐색 (시체·소집 회의)', o.act)}${opt('act', 1, '📋 간단 (매일 토론)', o.act)}</div>`;
  if (G.mode === 'classic') h += `<span>단서</span><div class="chips">${opt('exp', 1, '🔍 켜기', o.exp)}${opt('exp', 0, '끄기', o.exp)}</div>`;
  if (G.mode === 'classic' && !o.off && !o.act && o.exp !== 0) h += `<span>🎭 바꿔치기</span><div class="chips">${opt('fg', 1, '있음 (팀 전체 2~3번)', o.fg === undefined ? 1 : o.fg)}${opt('fg', 0, '없음', o.fg === undefined ? 1 : o.fg)}</div>`;
  h += `<span>속도</span><div class="chips">${SPEEDS.map((s, k) => opt('spd', k, s.name, o.spd)).join('')}</div>`;
  const ds = discSeconds(o.spd, Math.max(n, 3), G.mode, o.off);
  h += `</div><div class="deck">${deckTxt} <button class="link" id="lbDex" style="padding:0">📖 직업 도감</button><br>${G.mode === 'classic' && !o.off && !o.act ? `🏘️ 밤엔 자기 집에서 잠들고 마피아 팀이 숨어들어요. 낮(${SPEEDS[o.spd].day}초)엔 단서를 찾고, 시체를 신고하거나 광장에서 소집해야 회의·투표가 열려요.<br>` : ''}⏱️ ${G.mode === 'classic' && !o.off && !o.act ? '회의' : '토론'} 기본 ${Math.floor(ds / 60)}분 ${ds % 60}초 (${n}명 기준 · 사람이 줄면 짧아지고, 각자 한 번씩 ±15초)${o.off ? '<br>🏠 오프라인: 채팅 대신 직접 대화, 밤엔 화면이 어두워지고 처음 들어온 사람 폰이 사회자 음성으로 진행해요(메뉴에서 각자 켜고 끌 수 있어요).' : ''}</div>`;
  const status = G.cd ? `🚀 ${Math.max(0, Math.ceil((localEnd - Date.now()) / 1000))}초 뒤 시작!` : n < min ? `${min}명 이상 필요해요 (봇 포함)` : `준비 ${ready}/${hs.length}명 · 모두 준비하면 5초 뒤 시작`;
  h += `<div class="row"><button id="lbBotM">봇 −</button><button id="lbBotP">봇 +</button><span style="flex:1;font-size:12.5px;color:var(--mut);text-align:right">${status}</span><button id="lbReady" class="${myS.rd ? '' : 'primary'}">${myS.rd ? '✋ 준비 취소' : '✅ 준비'}</button></div>`;
  if (box.dataset.h !== h) { box.innerHTML = h; box.dataset.h = h; }
}
$('lobby').onclick = e => {
  if (e.target.id === 'lbDex') { showDex(G.mode === 'onuw' ? 'onuw' : 'classic'); return; }
  const b = e.target.closest('[data-k]');
  if (b) { const v = b.dataset.k === 'mode' ? b.dataset.v : +b.dataset.v; request(b.dataset.k, v); SFX.tick(); return; }
  if (e.target.id === 'lbBotP') request('bot+');
  if (e.target.id === 'lbBotM') request('bot-');
  if (e.target.id === 'lbReady') { myS.rd = myS.rd ? 0 : 1; pushS(true); SFX.pop(); renderLobby(); renderPlayers(); }
};

// ───────── 모달들 ─────────
function modal(html) { $('mbody').onclick = null; $('mbody').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; }
$('modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
function showRoleCard(auto) {
  const r = myRole();
  if (!inGame() || !r) { if (!auto) toast(inGame() ? '이번 판은 관전 중이에요' : '게임이 시작되면 직업이 정해져요'); return; }
  const onuw = G.mode === 'onuw', R = (onuw ? ONUW : ROLES)[r];
  let extra = '';
  if (!onuw && isMafiaTeam(r)) {
    const team = knownMafia().filter(j => G.P[j][U] !== uid).map(j => `${G.P[j][NM]}(마피아)`);
    const hasSup = G.P.some(p => isSupport(p[RO]));
    extra = isMafia(r)
      ? `<p>🤝 같은 마피아: ${team.length ? esc(team.join(', ')) : '나 혼자'}${hasSup ? '<br>🕵️ 이번 판엔 보조 직업 1명이 숨어 있어요. 누군지는 서로 몰라요.' : ''}</p>`
      : `<p>🕵️ 마피아가 누군지 몰라요. 밤에 능력을 쓴 상대가 마피아면 알게 돼요(채팅은 못 해요).${team.length ? `<br>🔴 알아낸 마피아: ${esc(team.join(', '))}` : ''}</p>`;
  }
  if (onuw) extra = '<p style="color:var(--mut);font-size:13px">처음 받은 카드예요. 밤사이 다른 사람이 바꿔 갔을 수도 있어요.</p>';
  modal(`<div class="roleBig">${R.icon}</div><h2 style="text-align:center">${R.name}</h2><div style="text-align:center"><span class="team ${R.team}">${TEAM_NAME[R.team]}</span></div><p>${R.desc}</p>${R.off && !is3d() ? `<p>📋 ${R.off}</p>` : ''}${R.win ? `<p>🏆 <b>승리 조건</b>: ${R.win}</p>` : ''}${extra}<div class="btns"><button id="mDex">📖 다른 직업 보기</button><button class="primary" id="mOk">확인</button></div>`);
  $('mOk').onclick = closeModal; $('mDex').onclick = () => showDex(onuw ? 'onuw' : 'classic');
}
let onuwPick = {};
function showOnuwNight() {
  const r = myRole(), i = mySlot(); if (!r || !amAlive()) return;
  const R = ONUW[r], P = G.P;
  const others = P.map((p, j) => j).filter(j => j !== i);
  const pbtn = (key, j) => `<button data-${key}="${j}" class="${onuwPick[key] === j ? 'on' : ''}">${esc(P[j][NM])}</button>`;
  const cbtn = (key, c) => `<button data-${key}="${c}" class="${onuwPick[key] === c ? 'on' : ''}">가운데 ${c + 1}번</button>`;
  let body = '';
  const wolves = P.filter(p => p[RO] === 'W').length;
  if (r === 'W') body = wolves === 1 ? `<p>늑대인간이 나 혼자라면 가운데 카드 1장을 볼 수 있어요. (혼자인지는 아침에 알려 줘요)</p><div class="opts">${[0, 1, 2].map(c => cbtn('c', c)).join('')}</div>` : '<p>다른 늑대인간과 눈을 마주쳤어요. 아침에 누군지 알려 줘요.</p>';
  else if (r === 'X') body = `<p>플레이어 1명을 고르거나, 가운데 카드 2장을 고르세요.</p><div class="opts">${others.map(j => pbtn('t', j)).join('')}</div><div class="opts">${[0, 1, 2].map(c => `<button data-cc="${c}" class="${(onuwPick.cs || []).includes(c) ? 'on' : ''}">가운데 ${c + 1}번</button>`).join('')}</div>`;
  else if (r === 'B') body = `<p>카드를 바꿀 사람을 고르세요.</p><div class="opts">${others.map(j => pbtn('t', j)).join('')}</div>`;
  else if (r === 'T') body = `<p>카드를 서로 바꿀 두 사람을 고르세요.</p><div class="opts">${others.map(j => `<button data-tt="${j}" class="${(onuwPick.ts || []).includes(j) ? 'on' : ''}">${esc(P[j][NM])}</button>`).join('')}</div>`;
  else if (r === 'K') body = `<p>내 카드와 바꿀 가운데 카드를 고르세요.</p><div class="opts">${[0, 1, 2].map(c => cbtn('c', c)).join('')}</div>`;
  else body = `<p>${R.desc}</p><p>이번 밤에는 고를 것이 없어요. 아침까지 기다려 주세요.</p>`;
  modal(`<h2>${R.icon} ${R.name}의 밤</h2>${body}<div class="btns"><button class="primary" id="oOk">확정</button></div>`);
  $('mbody').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t !== undefined) { onuwPick.t = +b.dataset.t; onuwPick.cs = []; }
    if (b.dataset.c !== undefined) onuwPick.c = +b.dataset.c;
    if (b.dataset.cc !== undefined) { const c = +b.dataset.cc; let cs = (onuwPick.cs || []).filter(x => x !== c); if (cs.length === (onuwPick.cs || []).length) cs = cs.concat([c]).slice(-2); onuwPick.cs = cs; onuwPick.t = -1; }
    if (b.dataset.tt !== undefined) { const j = +b.dataset.tt; let ts = (onuwPick.ts || []).filter(x => x !== j); if (ts.length === (onuwPick.ts || []).length) ts = ts.concat([j]).slice(-2); onuwPick.ts = ts; }
    if (b.id === 'oOk') {
      const p = onuwPick, ts = p.ts || [], cs = p.cs || [];
      myS.a = { q: ++actQ, pk: pk(), k: 'on', t: r === 'T' ? (ts[0] ?? -1) : (p.t ?? -1), t2: ts[1] ?? -1, c: cs.length ? cs[0] : (p.c ?? -1), c2: cs[1] ?? -1 };
      pushS(true); closeModal(); toast('🌙 선택을 마쳤어요. 아침을 기다려요.'); return;
    }
    showOnuwNight();
  };
}
function showResults() {
  if (!G.win) return;
  const onuw = G.mode === 'onuw', W = new Set(G.win.w || []);
  let rows = G.P.map((p, i) => {
    const o = onuw ? ONUW[p[RO]] : ROLES[p[RO]]; const f = onuw && G.F ? ONUW[G.F[i]] : null;
    return `<tr class="${W.has(i) ? 'win' : ''}"><td><span class="dot" style="display:inline-block;vertical-align:-2px;background:${COLORS[p[CO]]}"></span> ${esc(p[NM])}${p[U] === uid ? ' (나)' : ''}</td><td>${o.icon} ${o.name}${f && f !== o ? ` → ${f.icon} ${f.name}` : ''}</td><td>${p[AL] === 1 ? '생존' : '💀'}</td><td>${W.has(i) ? '🏆' : ''}</td></tr>`;
  }).join('');
  let center = '';
  if (onuw && G.F) center = `<p style="font-size:13px;color:var(--mut)">가운데 카드: ${G.F.slice(G.P.length).map(r => ONUW[r].icon + ONUW[r].name).join(', ')}</p>`;
  const mine = W.has(mySlot());
  modal(`<h2>${mine ? '🏆 승리!' : mySlot() < 0 ? '게임 종료' : '😵 패배…'}</h2><p style="font-weight:700">${esc(WIN_TEXT[G.win.k] || '')}</p><table class="res">${rows}</table>${center}<p class="hint">잠시 후 대기실로 돌아가요.</p><div class="btns">${mySlot() >= 0 ? '<button id="rLobby">🔁 대기실로 (과반)</button>' : ''}<button class="primary" id="rOk">닫기</button></div>`);
  $('rOk').onclick = closeModal; if ($('rLobby')) $('rLobby').onclick = () => { myS.sv = pk(); pushS(true); closeModal(); toast('대기실로 가자는 표를 냈어요'); };
}
export function showDex(tab = 'classic') {
  const card = (r, R) => `<div class="dexc"><div class="dexi">${R.icon}</div><div><b>${R.name}</b> <span class="team ${R.team}">${TEAM_NAME[R.team]}</span><p>${R.desc}</p>${R.off ? `<p style="color:var(--mut);font-size:12.5px">${R.off}</p>` : ''}${R.win ? `<p class="dexw">🏆 ${R.win}</p>` : ''}</div></div>`;
  let body = '';
  if (tab === 'classic') {
    const grp = [['town', '🏘️ 마을 사람들'], ['mafia', '🔪 마피아 팀'], ['neutral', '🎭 중립 — 자기만의 승리 조건']];
    body = grp.map(([t, h]) => `<h4>${h}</h4>` + ROLE_ORDER.filter(r => ROLES[r].team === t).map(r => card(r, ROLES[r])).join('')).join('');
    body += `<h4>🌙 밤 차례</h4><p style="font-size:13px">마피아 → 보조 → 칼잡이 → 방화범 → 조사(경찰·소식꾼·추적자·잠복꾼·인연술사) → 의사. 직업이 없어도 모든 차례가 진행되고, 시간도 고정이에요(마피아 25초 · 나머지 10초, 넘기기 없음). 마피아 처치는 팀 전체가 하룻밤 1명이에요. 내 차례에만 움직여요. 무녀·칼잡이·어릿광대는 낮에 행동해요.</p>
    <h4>👥 인원별 구성</h4><p style="font-size:13px">마피아: 7명 이하 1 · 8~11명 2 · 12~19명 3 · 20명 4. 보조 직업은 이와 따로 8명부터 1명(밀정·협박꾼·청소부·미끼꾼 중 랜덤, 마피아와 서로 몰라요).<br>중립: 마피아 팀과 같은 수 (몽상가 넣기면 그중 1명은 몽상가, 나머지 랜덤 · 칼잡이·방화범은 8명부터, 한 판에 1명까지).<br>마을: 경찰(4명~)·의사(5명~) 고정, 나머지는 정보 → 보호 → 투표형 순으로 랜덤(12명 미만은 보호형 1개까지), 주민은 최대 2명. 오프라인·간단 규칙에선 3D 전용 직업이 빠져요.</p>`;
  } else body = Object.entries(ONUW).map(([r, R]) => card(r, R)).join('') + '<p style="font-size:13px">밤 행동 순서: 늑대인간 → 하수인 → 예언자 → 강도 → 말썽쟁이 → 주정뱅이 → 불면증환자</p>';
  modal(`<h2>📖 직업 도감</h2><div class="opts"><button data-dex="classic" class="${tab === 'classic' ? 'on' : ''}">🔪 클래식</button><button data-dex="onuw" class="${tab === 'onuw' ? 'on' : ''}">🐺 한밤의 늑대인간</button></div><div class="help">${body}</div><div class="btns"><button class="primary" id="dexOk">닫기</button></div>`);
  $('mbody').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.dex) showDex(b.dataset.dex); if (b.id === 'dexOk') closeModal(); };
}
function showHelp() {
  modal(`<div class="help"><h2>게임 방법</h2>
  <h4>🕹️ 조작</h4><ul><li>이동: WASD / 방향키 (휴대폰은 왼쪽 조이스틱), Shift 달리기</li><li>카메라: 화면 드래그, 휠로 확대·축소</li><li>행동: E 또는 노란 E 버튼 · 내 직업: R · 채팅: Enter</li></ul>
  <h4>🏘️ 클래식 — 3D 탐색 규칙 (4~20명)</h4><ul>
  <li><b>🌙 밤</b>: 모두 자기 집에서 잠들어요(집 앞 이름표). <b>마피아 → 방화범 → 조사(경찰·소식꾼) → 의사</b> 순서로 차례가 오고, 내 차례에만 움직여요. 마피아는 남의 집에 숨어들어 처치하고, 시체를 끌어 덤불·상자·건초·우물 곁에 숨길 수 있어요.</li>
  <li><b>💫 쓰러짐</b>: 처치당하면 정신을 잃어요(화면이 꺼져 범인을 볼 수 없어요). 밤의 마지막 의사 차례에 의사가 <b>그 사람의 집</b>(집 앞이나 안)에서 치료하면, 시체가 어디 숨겨져 있든 자기 집에서 깨어나요. 아침이 오면 죽음이 굳어져요.</li>
  <li><b>🔍 낮 = 보물찾기</b>: 단서는 덤불·상자 옆, 집 뒤 구석 같은 곳에 작은 보석으로 숨어 있어요. 7m 안에 들어와야 보이고 가끔 ✨ 반짝여요. 가까이 가면 자동으로 주워져요(하루 3장).</li>
  <li><b>🎯 개인 미션</b>: 낮마다 나만의 미션(어디 가 보기, 누구 곁에 잠시 머물기)이 떠요. 깨면 단서 카드나 「어디 근처에 단서가 있다」는 힌트를 받아요(하루 3번까지).</li>
  <li><b>🛏️ 밤</b>: 모두 자기 침대에 누워 잠들어요. 내 차례가 오면 일어나 움직이고, 끝나면 다시 침대로 돌아가요. 깨어 있는 동안에도 <b>남들 눈엔 내 침대에서 자는 것처럼</b> 보여요(서로 아는 마피아끼리만 실제 모습이 보여요). 직업이 없는 차례도 똑같이 진행돼서, 어떤 직업이 있는지 티 나지 않아요.</li>
  <li><b>🔪 마피아 채팅</b>: 밤에는 마피아끼리만 채팅할 수 있어요(빨간 채팅창). 보조 직업은 이 채팅에 못 들어와요.</li>
  <li><b>🕵️ 보조 직업</b>: 마피아와 따로 1명(8명부터). 마피아도 보조가 누군지 모르고, 보조도 마피아를 몰라요. 밀정·협박꾼이 밤에 능력을 쓴 상대가 마피아면 그때 알게 돼요. 시민은 <b>마피아만</b> 다 잡으면 이겨요.</li>
  <li><b>🌫️ 몽상가</b>: 중립 중 하나는 자기가 경찰·추적자 같은 마을 직업인 줄 알아요. 결과가 엉터리일 수 있으니 누구 말이든 맹신은 금물! 카드엔 "A는 의사가 아니다", "B는 어젯밤 집을 나간 적이 있다" 같은 문장이 2~3개 적혀 있어요. 마피아가 바꿔치기한 카드는 한 문장이 거짓이에요!</li>
  <li><b>📒 수첩·📝 메모</b>: 단서는 수첩에 자동 기록돼요. 플레이어 목록의 📝로 "아마 이 직업 / 이건 아님"을 메모해 추리를 정리하세요. 📜 공유 가능한 단서는 게임 동안 3번까지 모두에게 그대로 공유할 수 있어요(🔒 비밀 단서는 불가).</li>
  <li><b>🚨 신고 / 🔔 소집</b>: 시체를 찾으면 신고, 광장에선 하루 1번 소집 → 원탁 회의 → 지목 투표 → 최후 변론 → 찬반 투표. 회의가 끝나면 남은 낮(30초 줄어듦)이 이어지고, 회의가 없으면 그냥 밤이 와요.</li>
  <li>낮 채팅은 <b>근처(9m) 사람에게만</b> 들리고, 회의 중엔 모두에게 들려요. 마피아 팀은 낮에 죽일 수 없고 단서 바꿔치기(팀 전체가 한 게임에 11명 이하 2번 · 12명 이상 3번, 대기실에서 끌 수 있음)·연기를 해요. 미끼꾼의 가짜 단서는 이 횟수와 별개예요.</li>
  <li><b>중립</b>: 칼잡이는 낮에 처치, 방화범은 낮에 기름을 붓고 밤에 점화, 어릿광대는 가짜 시체를 놓아요.</li></ul>
  <h4>📋 클래식 — 간단 규칙</h4><ul><li>대기실에서 "간단(매일 토론)"을 고르면 아침에 사망자가 발표되고 매일 토론·투표를 해요. 오프라인 모드도 이 규칙이에요.</li></ul>
  <h4>🐺 한밤의 늑대인간 (3~20명)</h4><ul><li>보드게임 한밤의 늑대인간 규칙이에요. 밤은 한 번, 투표도 한 번. 승패는 <b>마지막에 가진 카드</b> 기준!</li></ul>
  <h4>🏠 오프라인</h4><ul><li><b>각자 폰으로</b>: 대기실 "오프라인(한자리에서)" — 채팅 대신 직접 대화, 사회자 음성이 진행해요.</li><li><b>폰 하나로</b>: 첫 화면의 "폰 하나로 하기". 인터넷 없이 폰을 돌려 써요.</li></ul>
  </div><div class="btns"><button id="hDex">📖 직업 도감</button><button class="primary" id="hOk">알겠어요</button></div>`);
  $('hOk').onclick = closeModal; $('hDex').onclick = () => showDex();
}
$('myRole').onclick = () => showRoleCard();
$('btnNote').onclick = () => { if (!playing()) { toast('게임이 시작되면 단서가 기록돼요'); return; } showNotes(); };
$('btnMenu').onclick = () => {
  modal(`<h2>메뉴</h2><p>방: ${esc(roomName === 'plaza' ? '공개 광장' : roomName)} · 연결: ${esc(net ? net.label : '-')}</p>
  <div class="btns" style="justify-content:flex-start"><button id="mnHelp">❔ 게임 방법</button><button id="mnDex">📖 직업 도감</button><button id="mnVoice">${voiceOn ? '🔊 사회자 음성 켬' : '🔇 사회자 음성 끔'}</button><button id="mnCopy">🔗 방 코드 복사</button><button id="mnLeave" class="danger">🚪 방 나가기</button><button id="mnClose" class="primary">닫기</button></div>
  <p class="hint">친구에게 방 코드 「${esc(roomName)}」를 알려 주면 같은 방에 들어와요.</p>`);
  $('mnHelp').onclick = showHelp; $('mnClose').onclick = closeModal; $('mnDex').onclick = () => showDex();
  $('mnVoice').onclick = () => { voiceOn = !voiceOn; store.set('voice', voiceOn); $('mnVoice').textContent = voiceOn ? '🔊 사회자 음성 켬' : '🔇 사회자 음성 끔'; if (voiceOn) speak('사회자 음성을 켰어요'); };
  $('mnCopy').onclick = () => { navigator.clipboard.writeText(roomName).then(() => toast('복사했어요'), () => toast('방 코드: ' + roomName)); };
  $('mnLeave').onclick = () => { try { net && net.leave(); } catch (e) { } location.hash = ''; location.reload(); };
};

let toastT = null;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
let bannerT = null;
function banner(t) { const el = $('banner'); el.textContent = t; el.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('show'), 5200); }

// ───────── 아바타 갱신 ─────────
function syncAvatars(dt) {
  const want = new Map();
  const viewerGhost = amGhost() || (playing() && mySlot() < 0);
  // 사람
  for (const p of peers) { if (p.uid === uid) continue; if (p.m && p.s && p.s.n) want.set(p.uid, { x: p.m.x, z: p.m.z, r: p.m.r, mv: p.m.mv, st: p.m.st }); }
  // 봇
  const bots = host ? host.botMotion() : lastBots;
  const botIds = new Set(inGame() ? (G.P || []).filter(p => p[U].startsWith('bot')).map(p => p[U]) : (G.B || []).map(b => b[0]));
  for (const b of bots) if (botIds.has(b[0])) want.set(b[0], { x: b[1], z: b[2], r: b[3], mv: b[4], st: b[5] });
  want.set(uid, { self: true });
  for (const [id, a] of avatars) if (!want.has(id)) { scene.remove(a.obj); avatars.delete(id); }
  const now = performance.now();
  for (const [id, w] of want) {
    let info = entityInfo(id); if (!info) continue;
    const realSlot = (G.P || []).findIndex(p => p[U] === id);
    if (realSlot >= 0) { const ls = lookSlot(realSlot); if (ls !== realSlot) { const q = G.P[ls]; info = { n: q[NM], c: q[CO], h: q[HA] }; } }
    let a = avatars.get(id);
    const key = info.c + ':' + info.h;
    if (!a || a.key !== key) {
      if (a) scene.remove(a.obj);
      const obj = makeAvatar(COLORS[info.c] || '#fff', info.h); scene.add(obj);
      a = { obj, key, x: w.self ? me.pos.x : w.x, z: w.self ? me.pos.z : w.z, ry: 0 }; avatars.set(id, a);
      if (!w.self) { obj.position.set(w.x, 0, w.z); }
    }
    const slot = (G.P || []).findIndex(p => p[U] === id);
    const deadT = playing() && (slot < 0 || G.P[slot][AL] !== 1);
    // 밤에 깨어 있는 사람(침대 밖)은 남들 눈엔 그대로 자기 침대에서 자는 것처럼 보인다 — 서로 아는 마피아끼리만 실제 모습이 보임
    const awakeHidden = is3d() && G.ph === 'night' && playing() && !viewerGhost && !w.self && slot >= 0 && G.P[slot][AL] === 1 && w.st !== 2 && !knownMafia().includes(slot);
    const bedOf = awakeHidden && world.homes && world.homes[slot] ? world.homes[slot] : null;
    const visible = (!playing() || !deadT || viewerGhost) && (!awakeHidden || !!bedOf);
    a.obj.visible = visible;
    a.obj.userData.setGhost(deadT);
    let moving;
    if (bedOf) { a.obj.position.set(bedOf.bed.x, 0, bedOf.bed.z); a.obj.rotation.y = bedOf.ry; moving = false; a.obj.userData.setSit(false); a.obj.userData.setLie(true); }
    else if (w.self) { a.obj.position.copy(me.pos); a.obj.rotation.y = me.ry; moving = me.moving; a.obj.userData.setSit(me.sit && !deadT); a.obj.userData.setLie(!!me.lie && !deadT && G.ph === 'night'); }
    else {
      const o = a.obj.position, dx = w.x - o.x, dz = w.z - o.z, d = Math.hypot(dx, dz);
      if (d > 6) o.set(w.x, 0, w.z); else { const k = Math.min(1, dt * 10); o.x += dx * k; o.z += dz * k; }
      let dr = w.r - a.obj.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.obj.rotation.y += dr * Math.min(1, dt * 10);
      moving = !!w.mv; a.obj.userData.setSit(w.st === 1 && !deadT); a.obj.userData.setLie(w.st === 2 && !deadT && G.ph === 'night');
    }
    a.obj.userData.anim(dt, moving);
    // 이름표
    let fg = '#fff', bg = 'rgba(0,0,0,0.5)';
    if (id === uid) bg = 'rgba(160,120,0,0.75)';
    if (G.mode === 'classic' && playing() && slot >= 0 && knownMafia().includes(slot)) bg = 'rgba(190,30,40,0.85)';
    if (G.mode === 'classic' && G.ph === 'night' && slot >= 0 && oilAlive().includes(slot) && myRole() === 'F') bg = 'rgba(200,110,0,0.85)';
    if (deadT) { fg = '#d8dcff'; bg = 'rgba(60,60,110,0.6)'; }
    const bb = bubbles.get(id);
    a.obj.userData.setName(bb && bb.until > now ? '💬 ' + bb.t : info.n, fg, bb && bb.until > now ? 'rgba(20,20,20,0.85)' : bg);
    // 표시
    let mark = '';
    if (G.ph === 'vote' && G.mode === 'classic' && slot >= 0 && G.vt && G.vt[slot]) mark = `🗳️ ${G.vt[slot]}표`;
    if ((G.ph === 'defense' || G.ph === 'final') && slot === G.tr) mark = '⚖️ 재판 중';
    a.obj.userData.setMark(mark);
    const dist = Math.hypot(a.obj.position.x - me.pos.x, a.obj.position.z - me.pos.z);
    a.obj.userData.tag.visible = id === uid ? camDist > 3.2 : !(nightK > 0.5 && !viewerGhost && dist > 7);
  }
}

// ───────── 단서 ─────────
const clueMeshes = new Map();
const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, 7, 12, 1, true), gemGeo = new THREE.OctahedronGeometry(0.13);
const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false });
const gemMat = new THREE.MeshStandardMaterial({ color: '#d9c07a', emissive: '#8a6a10', emissiveIntensity: 0.5, roughness: 0.4 });
const glintMat = new THREE.SpriteMaterial({ color: '#fff6c8', transparent: true, opacity: 0, depthWrite: false });
function syncClueMeshes(t) {
  const show = (G.ph === 'explore' || G.ph === 'day') && (amAlive() || amGhost());
  const want = new Set(show ? (G.cl || []).map(c => c[0]) : []);
  for (const [id, m] of clueMeshes) if (!want.has(id)) { scene.remove(m); clueMeshes.delete(id); }
  if (!show) return;
  for (const c of G.cl) {
    let m = clueMeshes.get(c[0]);
    if (!m) { m = new THREE.Group(); const g = new THREE.Mesh(gemGeo, gemMat); g.position.y = 0.18; g.name = 'gem'; const gl = new THREE.Sprite(glintMat.clone()); gl.scale.set(0.5, 0.5, 1); gl.position.y = 0.3; gl.name = 'glint'; m.add(g, gl); m.position.set(c[1], 0, c[2]); scene.add(m); clueMeshes.set(c[0], m); }
    // 보물찾기: 가까이 가야 보이고, 가끔 반짝일 때만 눈에 띈다
    const d = dxz(c[1], c[2]), gem = m.getObjectByName('gem'), gl = m.getObjectByName('glint');
    m.visible = d < 7 || amGhost();
    gem.rotation.y = t / 700;
    const tw = Math.max(0, Math.sin(t / 260 + c[0] * 1.7)); gl.material.opacity = Math.pow(tw, 12) * (d < 7 ? 0.9 : 0);
  }
}
// 시체·핏자국
const bodyMeshes = new Map(), stainMeshes = new Map();
const stainGeo = new THREE.CircleGeometry(0.9, 18), stainMat = new THREE.MeshBasicMaterial({ color: '#5a0a0e', transparent: true, opacity: 0.85, depthWrite: false });
function syncBodies(t) {
  const on = playing() && G.mode === 'classic' && is3d();
  const want = new Set(on ? (G.bd || []).map(b => b[0]) : []);
  for (const [id, m] of bodyMeshes) if (!want.has(id)) { scene.remove(m); bodyMeshes.delete(id); }
  if (on) for (const b of G.bd) {
    let m = bodyMeshes.get(b[0]);
    const look = b[1] >= 0 && G.P[b[1]] ? { c: G.P[b[1]][CO], h: G.P[b[1]][HA] } : { c: b[5] | 0, h: 0 };
    if (!m) {
      m = new THREE.Group(); const av = makeAvatar(COLORS[look.c] || '#888', look.h); av.userData.tag.visible = false;
      av.rotation.x = -Math.PI / 2; av.position.y = 0.4; av.rotation.z = Math.random() * 6; av.userData.anim(0, false); m.add(av);
      const x = new THREE.Mesh(new THREE.CircleGeometry(0.7, 14), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false })); x.rotation.x = -Math.PI / 2; x.position.y = 0.02; m.add(x);
      scene.add(m); bodyMeshes.set(b[0], m);
    }
    if (b[6] >= 0 && G.P[b[6]]) { const a = avatars.get(G.P[b[6]][U]); if (a) { const o = a.obj; m.position.set(o.position.x - Math.sin(o.rotation.y) * 0.9, 0, o.position.z - Math.cos(o.rotation.y) * 0.9); m.visible = o.visible; continue; } }
    m.position.set(b[2], 0, b[3]);
    m.visible = amGhost() || !b[4] || dxz(b[2], b[3]) < 2.2;
    if (b[4] && m.visible) m.children[0].position.y = 0.15;
  }
  const wantS = new Set(on ? (G.st || []).map(x => x[3]) : []);
  for (const [id, m] of stainMeshes) if (!wantS.has(id)) { scene.remove(m); stainMeshes.delete(id); }
  if (on) for (const st of (G.st || [])) { if (stainMeshes.has(st[3])) continue; const m = new THREE.Mesh(stainGeo, stainMat); m.rotation.x = -Math.PI / 2; m.position.set(st[0] + 0.3, 0.035, st[1] - 0.2); m.scale.set(1, 0.7 + Math.random() * 0.5, 1); scene.add(m); stainMeshes.set(st[3], m); }
}
function syncNotes() {
  const mine = (G.ck || {})[uid] || [];
  for (const e of mine) {
    if (!Array.isArray(e) || noteSeen[e[0]]) continue; noteSeen[e[0]] = 1;
    const card = e[1], t = fmt(card, G.P); notes.push({ d: G.r, t, key: e[0], sh: !!card[2] });
    banner('🔍 단서를 찾았어요! (📒 수첩에 기록)\n' + t.split('\n').slice(1).join('\n')); SFX.bell('day'); renderActions();
  }
  for (const x of (G.sh || [])) {
    if (shSeen.has(x[0])) continue; shSeen.add(x[0]);
    const from = x[1], t = fmt(x[2], G.P).split('\n').slice(1).join('\n');
    if (G.P[from] && G.P[from][U] === uid) { const n = notes.find(n => x[0] === uid + n.key); if (n) n.shared = 1; continue; }
    notes.push({ d: G.r, t: `📢 ${slotName(from)}님이 공유한 단서\n${t}`, from });
    addSys(`📢 ${slotName(from)}님이 단서를 공유했어요 — 📒 수첩에 기록됐어요.`);
    banner(`📢 ${slotName(from)}님이 단서를 공유했어요\n${t}`); SFX.pop();
  }
}
let apKey = null;
function syncAppraise() { const m = G.pm && G.pm[uid]; if (apKey && m && m[0] === 'pA') { const n = notes.find(n => n.key === apKey); if (n) n.ap = fmt(m, G.P); apKey = null; } }
const sharesLeft = () => 3 - (((G.shc || {})[uid]) || 0);
function showNotes() {
  const canShare = playing() && amAlive() && G.mode === 'classic';
  const rows = notes.slice().reverse().map((n, k) => {
    const idx = notes.length - 1 - k;
    const canAp = myRole() === 'A' && n.key && !n.ap && !usedDay('a') && ((((G.ac || {})[uid]) || 0) < 3) && amAlive();
    const ap = n.ap ? `<div style="color:var(--acc);margin-top:4px">${esc(n.ap)}</div>` : canAp ? `<button class="mini" data-ap="${idx}">🔍 감정</button> ` : '';
    const btn = ap + (n.key ? (n.sh ? (n.shared ? '<span class="tag">📢 공유함</span>' : canShare && sharesLeft() > 0 ? `<button class="mini" data-sh="${idx}">📢 공유</button>` : '') : '<span class="tag">🔒 공유 불가</span>') : '');
    return `<div class="pm" style="white-space:pre-line">${n.d}일차 · ${esc(n.t)}<div style="text-align:right;margin-top:4px">${btn}</div></div>`;
  }).join('');
  modal(`<h2>📒 단서 수첩</h2><p class="hint">찾은 단서는 자동으로 여기 쌓여요. 📜 표시 단서는 <b>공유</b>를 누르면 모두에게 그대로(진짜임이 보장된 채) 전달돼요 — 게임 동안 ${sharesLeft()}번 남았어요. 🔒 비밀 단서는 말로만 전할 수 있어요.</p>${rows || '<p>아직 단서가 없어요. 낮에 덤불·상자·집 뒤를 뒤지거나 🎯 미션을 깨 보세요.</p>'}<div class="btns"><button id="nMemo">📝 직업 메모 보기</button><button class="primary" id="nOk">닫기</button></div>`);
  $('mbody').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'nOk') closeModal();
    if (b.id === 'nMemo') showMemoAll();
    if (b.dataset.ap !== undefined) { const n = notes[+b.dataset.ap]; if (!n) return; apKey = n.key; sendAct('appraise', -1, { s: n.key }); toast('🔍 감정 중…'); closeModal(); return; }
    if (b.dataset.sh !== undefined) { const n = notes[+b.dataset.sh]; if (!n || sharesLeft() <= 0) return; sendAct('share', -1, { s: n.key }); n.shared = 1; toast('📢 단서를 공유했어요'); showNotes(); }
  };
}
// 직업 메모: 플레이어마다 "아마 이 직업" 1개 + "이건 아님" 여러 개
const deckRoles = () => { const set = new Set((G.P || []).map(p => p[RO])); if (G.mode === 'onuw') (G.C || []).forEach(r => set.add(r)); const T = G.mode === 'onuw' ? ONUW : ROLES; return (G.mode === 'onuw' ? Object.keys(ONUW) : ROLE_ORDER).filter(r => set.has(r)).map(r => [r, T[r]]); };
function showMemo(i) {
  const id = G.P[i] && G.P[i][U]; if (!id) return;
  const m = memo[id] = memo[id] || { g: '', x: [] };
  const roles = deckRoles();
  modal(`<h2>📝 ${esc(G.P[i][NM])}님 메모</h2><p class="hint">나만 보는 메모예요. 이번 판에 있는 직업만 보여요.</p>
  <div class="lbl">🔎 아마 이 직업 (하나)</div><div class="opts">${roles.map(([r, R]) => `<button data-mg="${r}" class="${m.g === r ? 'on' : ''}">${R.icon} ${R.name}</button>`).join('')}</div>
  <div class="lbl">✖ 이건 아니다 (여러 개)</div><div class="opts">${roles.map(([r, R]) => `<button data-mx="${r}" class="${m.x.includes(r) ? 'on' : ''}" style="${m.x.includes(r) ? 'text-decoration:line-through' : ''}">${R.icon} ${R.name}</button>`).join('')}</div>
  <div class="btns"><button id="mmClr">지우기</button><button class="primary" id="mmOk">완료</button></div>`);
  $('mbody').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mg) { m.g = m.g === b.dataset.mg ? '' : b.dataset.mg; m.x = m.x.filter(r => r !== m.g); showMemo(i); }
    if (b.dataset.mx) { const r = b.dataset.mx; m.x = m.x.includes(r) ? m.x.filter(x => x !== r) : m.x.concat([r]); if (m.g === r) m.g = ''; showMemo(i); }
    if (b.id === 'mmClr') { memo[id] = { g: '', x: [] }; showMemo(i); }
    if (b.id === 'mmOk') closeModal();
    renderPlayers();
  };
}
function showMemoAll() {
  const T = G.mode === 'onuw' ? ONUW : ROLES;
  const rows = (G.P || []).map((p, i) => { const m = memo[p[U]] || { g: '', x: [] }; return `<tr><td>${esc(p[NM])}</td><td>${m.g ? T[m.g].icon + ' ' + T[m.g].name : '—'}</td><td style="font-size:12px">${m.x.map(r => T[r].name).join(', ')}</td><td><button class="mini" data-mm="${i}">📝</button></td></tr>`; }).join('');
  modal(`<h2>📝 직업 메모</h2><table class="res"><tr><td><b>이름</b></td><td><b>아마</b></td><td><b>아님</b></td><td></td></tr>${rows}</table><div class="btns"><button id="maNotes">📒 수첩</button><button class="primary" id="maOk">닫기</button></div>`);
  $('mbody').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.mm !== undefined) showMemo(+b.dataset.mm); if (b.id === 'maOk') closeModal(); if (b.id === 'maNotes') showNotes(); };
}
// 보물찾기: 가장 가까운 단서 방향 + 밟으면 자동 줍기
function clueHunt() {
  const el = $('clueNav'); const on = (G.ph === 'day' || G.ph === 'explore') && amAlive() && ((G.cl || []).length || (G.ms || {})[uid]);
  if (!on) { if (!el.hidden) el.hidden = true; return; }
  let best = null, bd = 1e9; for (const c of G.cl) { const d = dxz(c[1], c[2]); if (d < bd) { bd = d; best = c; } }
  if (best && myClues() < 3 && bd < 1.3 && !autoSent.has(best[0]) && !(isMafiaTeam(myRole()) && bd > 0.9 && usedDay('g') < 2 && false)) { autoSent.add(best[0]); sendAct('clue', best[0]); }
  const warm = bd < 4 ? ' · ✨ 근처에서 뭔가 반짝여요!' : '';
  const m = (G.ms || {})[uid], ms = m ? (m[0] === 'go' ? `🎯 미션: 「${m[3]}」에 가 보기` : `🎯 미션: ${slotName(m[1])}님 곁(4m)에 ${m[2]}초 머물기`) : '';
  const txt = (myClues() >= 3 ? `📒 오늘 단서 3/3 완료 · 숨은 단서 ${G.cl.length}개` : `🔍 숨은 단서 ${G.cl.length}개 · 내 단서 ${myClues()}/3${warm}`) + (ms ? `\n${ms} → 보상: 단서 카드 또는 힌트` : '');
  if (el.textContent !== txt) el.textContent = txt; el.hidden = false;
}

// ───────── 메인 루프 ─────────
let last = performance.now(), nightK = 0, tickSec = -1, camDist = 8, backdropNight = 0, frameTimes = [];
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (document.hidden) return;
  frameTimes.push(dt); if (frameTimes.length > 90) { const avg = frameTimes.reduce((a, b) => a + b) / frameTimes.length; frameTimes = []; if (avg > 0.045 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); } }
  if ($('hud').hidden) { nightK += (backdropNight - nightK) * Math.min(1, dt * 1.5); world.setNight(nightK); if (!$('title').hidden) pv.draw(t); renderer.render(scene, camera); camera.position.set(Math.sin(t / 9000) * 30, 16, Math.cos(t / 9000) * 30); camera.lookAt(0, 0, 0); return; }
  // 이동
  let ix = 0, iz = 0;
  if (document.activeElement !== $('chatInput') && $('modal').hidden) {
    if (keys.has('w') || keys.has('arrowup') || keys.has('ㅈ')) iz += 1;
    if (keys.has('s') || keys.has('arrowdown') || keys.has('ㄴ')) iz -= 1;
    if (keys.has('a') || keys.has('arrowleft') || keys.has('ㅁ')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright') || keys.has('ㅇ')) ix += 1;
  }
  if (joy.id !== null) { ix += joy.x; iz -= joy.y; }
  const mag = Math.min(1, Math.hypot(ix, iz));
  const ghost = amGhost() || (playing() && mySlot() < 0);
  // 회의(원탁) 단계엔 모두 의자에 앉아 있고 일어설 수 없다 — 시점만 돌릴 수 있음
  const frozen = playing() && !ghost && (G.ph === 'role' || sleeping() || amDowned() || SEATED.has(G.ph) || ((G.ph === 'defense' || G.ph === 'final') && mySlot() === G.tr));
  me.moving = mag > 0.1 && !frozen;
  if (me.moving) {
    me.sit = false; me.lie = false;
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = -fz, rz = fx;
    const vx = (fx * iz + rx * ix) / Math.max(1, Math.hypot(ix, iz)), vz = (fz * iz + rz * ix) / Math.max(1, Math.hypot(ix, iz));
    const sp = (ghost ? 7 : keys.has('shift') ? 6.2 : 4.4) * (carrying() ? 0.6 : 1) * mag * dt;
    let nx = me.pos.x + vx * sp, nz = me.pos.z + vz * sp;
    if (!ghost) { const c = world.collide(nx, nz, 0.4); nx = c.x; nz = c.z; } else { nx = Math.max(-47, Math.min(47, nx)); nz = Math.max(-47, Math.min(47, nz)); }
    me.pos.x = nx; me.pos.z = nz; me.ry = Math.atan2(vx, vz);
  }
  sendMotion(false);
  // 밤 연출
  const nightT = (G.ph === 'night') ? 1 : 0;
  nightK += (nightT - nightK) * Math.min(1, dt * 1.5);
  world.setNight(ghost ? nightK * 0.45 : nightK);
  SFX.setNightSound(nightK);
  myLight.intensity = ghost ? 0 : 9 * nightK; myLight.position.set(me.pos.x, 2.4, me.pos.z);
  world.podiumLight.intensity = (G.ph === 'defense' || G.ph === 'final') ? 60 : 0;
  syncAvatars(dt);
  syncClueMeshes(t);
  syncBodies(t);
  if (playing()) clueHunt(); else $('clueNav').hidden = true;
  // 카메라
  const tgt = new THREE.Vector3(me.pos.x, 1.3, me.pos.z);
  const inside = !ghost && world.inHouse(me.pos.x, me.pos.z);
  const pitch = inside ? Math.min(cam.pitch, 0.32) : cam.pitch, cp = Math.cos(pitch);
  let dist = cam.dist;
  if (!ghost) { const ex = tgt.x + Math.sin(cam.yaw) * cp * dist, ez = tgt.z + Math.cos(cam.yaw) * cp * dist; const f = world.camClip(tgt.x, tgt.z, ex, ez); if (f < 1) dist = Math.max(1.2, f * dist - 0.35); }
  camDist += (dist - camDist) * Math.min(1, dt * (dist < camDist ? 20 : 4));
  camera.position.set(tgt.x + Math.sin(cam.yaw) * cp * camDist, tgt.y + Math.sin(pitch) * camDist, tgt.z + Math.cos(cam.yaw) * cp * camDist);
  camera.lookAt(tgt);
  // 프롬프트
  const info = abilityInfo(); let pr = '';
  const o3 = is3d() && (G.ph === 'day' || G.ph === 'night') ? options3d() : [];
  if (o3.length) pr = `<kbd>E</kbd>${esc(o3[0].label)}${o3.length > 1 ? ` <span style="color:var(--mut)">외 ${o3.length - 1}개</span>` : ''}`;
  else if (is3d() && G.ph === 'day' && amAlive()) pr = Math.hypot(me.pos.x, me.pos.z) < 13.5 && !(G.cu || []).includes(mySlot()) ? '🔔 광장이에요. 수상하면 「소집하기」로 회의를 열 수 있어요' : '🔍 단서와 시체를 찾아 마을을 둘러보세요 · 채팅은 근처 사람에게만 들려요';
  else if (amDowned()) pr = '';
  else
  if (info && !info.done && listMode()) pr = `${info.icon} 「능력 쓰기」 버튼(또는 E)으로 대상을 고르세요`;
  else if (info && !info.done) {
    const t = findTarget(info);
    if (t !== null) pr = `<kbd>E</kbd>${info.icon} ${esc(dispName(t))}님 ${info.verb}`;
    else if (info.k === 'heal') pr = `<kbd>E</kbd>💉 나 자신 지키기 (다른 사람 곁에서 누르면 그 사람)`;
    else if (info.k === 'revive') pr = '💉 치료할 집 앞이나 안으로 가서 E를 누르세요 (내 집도 돼요)';
    else if (info.k === 'oil' && oilAlive().length) pr = `<kbd>E</kbd>🔥 점화 — 기름 묻은 ${oilAlive().length}명 (다른 사람 곁에서 누르면 기름 붓기)`;
    else pr = `${info.icon} 대상 곁으로 다가가 E로 ${info.verb}`;
  } else if (info && info.done) pr = info.done;
  else if (G.ph === 'explore' && amAlive()) { const c = nearClue(); pr = myClues() >= 3 ? '🔍 오늘 단서는 다 주웠어요. 토론에서 쓸 말을 정리해 보세요.' : c ? '<kbd>E</kbd>🔍 단서 줍기' : '🔍 덤불·상자·집 뒤를 살펴보세요'; }
  else if (sleeping()) pr = '';
  else if (curTurn() && amAlive() && myTurn() && !info) pr = `${curTurn().icon} 지금은 ${curTurn().name} — 오늘 밤 쓸 능력이 없어요. 차례가 끝날 때까지 기다려 주세요.`;
  else if (G.ph === 'night' && G.mode === 'classic' && amAlive()) pr = G.opt && G.opt.off ? '🌙 고개를 숙이고 기다려 주세요' : '🌙 밤이에요. 주변을 살피며 누가 어디로 가는지 기억해 두세요.';
  const P = $('prompt'); if (P.dataset.h !== pr) { P.innerHTML = pr; P.dataset.h = pr; P.hidden = !pr; }
  // 타이머
  const rem = G.ph === 'lobby' && !G.cd ? -1 : Math.max(0, Math.ceil((localEnd - Date.now()) / 1000));
  if (rem !== tickSec) { tickSec = rem; $('phTime').textContent = rem >= 0 ? `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}` : ''; if (rem > 0 && rem <= 5 && playing()) SFX.tick(); }
  renderer.render(scene, camera);
}
let lastRender = 0;
setInterval(() => { if (!$('hud').hidden) { render(); } }, 500);
requestAnimationFrame(frame);

// 디버그/테스트용
window.__mafia = { world, get G() { return G; }, get host() { return host; }, get me() { return me; }, get peers() { return peers; }, uid, avatars, enter, doInteract, myS };

if (!graphicsAvailable) { $('netInfo').textContent = '현재 브라우저에서 3D 그래픽을 시작하지 못했습니다. 폰 하나로 하기는 이용할 수 있습니다.'; }
