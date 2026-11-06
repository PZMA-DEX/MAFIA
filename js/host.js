// 자동 진행 엔진 — 화면에는 방장이 없다. 가장 먼저 들어온 사람의 브라우저가 조용히 계산만 맡고(나가면 다음 사람이 이어받음),
// 설정 변경·준비·넘기기는 모두 참가자들의 요청(presence)으로 들어와 똑같이 처리된다.
import { install as install3d } from './day3d.js';
import { NIGHT_TURN, NIGHT_MAF, ROLES, ONUW, classicDeck, onuwDeck, isMafiaTeam, isMafia, isSupport, isHostile, shuffle, COLORS, TURNS, TURN_ORDER, ROLE_ORDER } from './roles.js';

// P 항목 인덱스
export const U = 0, NM = 1, CO = 2, HA = 3, AL = 4, RO = 5, FL = 6;
// 토론 시간 = 기본 + 살아 있는 사람 수 × 1인당 시간 (상한 있음). 오프라인(마주 보고)은 1.3배.
export const SPEEDS = [
  { name: '빠름', day: 100, mafT: 35, exp: 35, turn: 15, night: 30, d0: 30, dn: 5, dmax: 150, vote: 20, def: 15, fin: 10, onN: 20, o0: 90, on: 8 },
  { name: '보통', day: 150, mafT: 45, exp: 50, turn: 20, night: 45, d0: 60, dn: 7, dmax: 210, vote: 25, def: 20, fin: 12, onN: 25, o0: 120, on: 10 },
  { name: '느긋', day: 200, mafT: 60, exp: 70, turn: 28, night: 60, d0: 90, dn: 9, dmax: 300, vote: 30, def: 30, fin: 15, onN: 35, o0: 180, on: 12 },
];
export function discSeconds(spd, n, mode, off) {
  const s = SPEEDS[spd] || SPEEDS[1], k = off ? 1.3 : 1;
  if (mode === 'onuw') return Math.min(360, Math.round((s.o0 + s.on * n) * k / 10) * 10);
  return Math.min(Math.round(s.dmax * k), Math.round((s.d0 + s.dn * n) * k / 5) * 5);
}
const MANUAL = new Set(['role', 'night', 'dawn', 'vote', 'final']);
export const SEATED = new Set(['morning', 'discuss', 'vote', 'defense', 'final', 'voteres', 'execres', 'dawn']);

const BOT_NAMES = ['민준', '서연', '도윤', '하은', '시우', '지우', '예준', '수아', '주원', '지아', '하준', '서윤', '은우', '하린', '유준', '지안', '건우', '채원', '현우', '다온'];
const BOT_LINES = {
  mafia: ['오늘은 {t}님 집 어때요?', '{t}님 경찰 같아요. 먼저 처리하죠', '시체는 덤불에 숨겨요', '{t}님은 내일 낮에 의심 몰아요', '저는 조용히 있을게요', '{t}님 집은 의사가 올 것 같아요', '내일 단서 바꿔치기 맡을게요'],
  classic: ['{t}님 아까 어디 계셨어요?', '저 주민이에요. 진짜로요.', '{t}님 좀 수상한데요...', '{t}님이 우리 집 근처에서 서성였어요', '경찰 있으면 결과 말해 주세요', '일단 {t}님한테 투표해 봅시다', '저 아니에요 ㅠㅠ', '조용한 사람이 제일 수상해요', '{t}님은 믿어도 될 것 같아요', '단서 주운 사람 말해 주세요', '{t}님 말이 자꾸 바뀌네요', '어릿광대일 수도 있으니 신중하게요', '시체 어디서 나왔어요?'],
  onuw: ['저 주민이에요', '예언자인데 {t}님 카드 봤어요... 수상해요', '강도라서 {t}님이랑 카드 바꿨어요', '말썽쟁이였어요. 누구 바꿨는지는 비밀', '{t}님 늑대인간 같아요', '저 무두장이 아니에요 ㅋㅋ', '불면증환자인데 제 카드 그대로였어요', '가운데에 늑대가 있을 수도 있어요'],
};
const rnd = a => a[Math.floor(Math.random() * a.length)];

export function lobbyState() {
  return { id: Math.random().toString(36).slice(2, 8), e: 1, mode: 'classic', ph: 'lobby', r: 0, rem: 0,
    opt: { maf: 0, neu: 2, dr: 1, fg: 1, rev: 0, spd: 1, act: 0, off: 0, exp: 1, nt: 1 }, B: [], P: [], lg: [], news: [], cl: [], ck: {} };
}

export class Host {
  constructor(world) {
    this.w = world; this.g = lobbyState(); this.end = 0; this.lastQ = {}; this.bots = new Map();
    this.bc = []; this.bcId = 0; this.nextChat = 0; this.dirty = true; this.keep = 0; this.seen = {};
    this.botPlan = {}; this.lgId = 0; this.lastTick = Date.now(); this.manual = false; this.txUsed = {}; this.lastReq = {}; this.startAt = 0; this.pos = {}; this.turnStart = 0;
  }
  adopt(g, localEnd, botMotion) {
    if (g) { this.g = JSON.parse(JSON.stringify(g)); this.end = localEnd || Date.now() + 5000; this.lgId = Math.max(0, ...(g.lg || []).map(l => l[0])); }
    for (const b of (botMotion || [])) this.bots.set(b[0], { x: b[1], z: b[2], ry: b[3], mv: 0, tx: b[1], tz: b[2], wait: 1 });
    this.dirty = true;
  }
  get pk() { const g = this.g; return g.r + ':' + g.ph + (g.ph === 'night' && g.nts ? ':' + g.nt : ''); }
  inTurn(i) { const g = this.g; if (g.ph !== 'night' || !g.nts) return true; const T = TURNS[g.nts[g.nt]]; return !!T && T.roles.includes(this.effRole(i)); }
  // 몽상가: 자기가 다른 직업이라고 믿는다. 판정은 그 직업처럼 받아 주되 결과는 엉터리
  effRole(i) { const f = this.g.fk; return f && f[i] !== undefined ? f[i] : this.g.P[i][RO]; }
  isFake(i) { const f = this.g.fk; return !!(f && f[i] !== undefined); }
  log(m) { const g = this.g; g.lg = (g.lg || []).concat([[++this.lgId, m]]).slice(-5); this.dirty = true; }
  phase(ph, sec, news) {
    const g = this.g; g.ph = ph; this.end = this.manual && MANUAL.has(ph) ? Infinity : Date.now() + sec * 1000; if (news !== undefined) g.news = news;
    this.botPlan = {}; this.dirty = true;
    if (ph === 'night' || ph === 'lobby') this.scatterBots();
  }
  slotOf(uid) { return this.g.P.findIndex(p => p[U] === uid); }
  name(i) { return this.g.P[i] ? this.g.P[i][NM] : '?'; }
  alive(i) { const p = this.g.P[i]; return !!p && p[AL] === 1; }
  T() {
    const g = this.g, s = SPEEDS[g.opt.spd] || SPEEDS[1], n = (g.P || []).filter(p => p[AL] === 1).length;
    return { ...s, disc: discSeconds(g.opt.spd, n, 'classic', g.opt.off), onD: discSeconds(g.opt.spd, n, 'onuw', g.opt.off) };
  }
  next() { if (this.g.ph !== 'lobby') this.end = 0; }
  extend(d, who) {
    if (this.g.ph !== 'discuss') return;
    this.end = Math.max(Date.now() + 5000, this.end + d * 15000);
    if (who !== undefined) this.log(['more', who, d]); this.dirty = true;
  }
  forceTrial(t) {
    const g = this.g; if (g.ph !== 'vote') return;
    if (!(t >= 0) || !this.alive(t)) { const m = ['tie']; this.log(m); this.phase('voteres', 5, [m]); return; }
    g.tr = t; const m = ['trial2', t]; this.log(m); this.phase('defense', this.T().def, [m]);
  }
  forceFinal(yes, no) { const g = this.g; if (g.ph !== 'final') return; this.resolveFinal(yes, no); }

  // ── 로비 조작 (방장 UI에서 호출) ──
  skipVoters(humans) {
    const g = this.g; if (g.ph === 'end') return humans;
    if (g.ph === 'night' && g.nts) return humans.filter(h => { const i = this.slotOf(h.uid); return i >= 0 && this.alive(i) && this.inTurn(i); });
    const alive = humans.filter(h => { const i = this.slotOf(h.uid); return i >= 0 && this.alive(i); });
    return alive.length ? alive : humans.filter(h => this.slotOf(h.uid) >= 0);
  }
  skipNeed(n) { return this.g.ph === 'discuss' ? n : Math.floor(n / 2) + 1; }
  request(nm, rq, humans) {
    const g = this.g; if (g.ph !== 'lobby') return;
    const k = rq.k, v = rq.v;
    if (k === 'bot+') { const b = g.B.length; this.addBot(humans); if (g.B.length > b) this.log(['setn', nm, 'bot+', g.B.length]); return; }
    if (k === 'bot-') { if (g.B.length) { this.removeBot(); this.log(['setn', nm, 'bot-', g.B.length]); } return; }
    const ok = { mode: ['classic', 'onuw'], maf: [0, 1, 2, 3, 4, 5], neu: [0, 2], dr: [0, 1], fg: [0, 1], rev: [0, 1], spd: [0, 1, 2], act: [0, 1], off: [0, 1], exp: [0, 1], nt: [0, 1] };
    if (!ok[k] || !ok[k].includes(v)) return;
    if ((k === 'mode' ? g.mode : g.opt[k]) === v) return;
    this.setOpt(k, v); this.log(['setn', nm, k, v]);
  }
  setOpt(k, v) { if (this.g.ph !== 'lobby') return; if (k === 'mode') this.g.mode = v; else this.g.opt[k] = v; this.dirty = true; }
  addBot(humans) {
    const g = this.g; if (g.ph !== 'lobby' || humans + g.B.length >= 20) return;
    const used = new Set(g.B.map(b => b[0]));
    let k = 1; while (used.has('bot' + k)) k++;
    const usedC = new Set(g.B.map(b => b[2]));
    let c = Math.floor(Math.random() * COLORS.length); for (let t = 0; t < 20 && usedC.has(c); t++) c = (c + 1) % 20;
    g.B.push(['bot' + k, '봇 ' + BOT_NAMES[(k - 1) % 20], c, Math.floor(Math.random() * 6)]);
    const sp = this.w.randomPoint(); this.bots.set('bot' + k, { x: sp.x, z: sp.z, ry: 0, mv: 0, tx: sp.x, tz: sp.z, wait: 1 });
    this.dirty = true;
  }
  removeBot() { const g = this.g; if (g.ph !== 'lobby' || !g.B.length) return; const b = g.B.pop(); this.bots.delete(b[0]); this.dirty = true; }
  toLobby() { const g = this.g; g.ph = 'lobby'; g.sh = []; g.shc = {}; g.cl = []; g.ck = {}; g.nts = null; g.kp = ''; g.bd = []; g.st = []; g.du = {}; g.cu = []; g.mt = null; g.dg = null; g.oil = []; g.sk = 0; g.cd = 0; this.startAt = 0; g.P = []; g.r = 0; g.win = null; g.pm = {}; g.tr = -1; g.vo = []; g.vt = []; g.fi = []; delete g.C; delete g.F; delete g.oc; delete g.nc; delete g.dead; this.phase('lobby', 0, []); }
  skip() { if (this.g.ph !== 'lobby' && this.g.ph !== 'end') this.end = Date.now(); }

  start(humans) {
    const g = this.g; const list = humans.map(h => [h.uid, h.n, h.c, h.h, 1, '', 0]).concat(g.B.map(b => [b[0], b[1], b[2], b[3], 1, '', 0]));
    const n = list.length; const min = g.mode === 'onuw' ? 3 : 4;
    if (n < min) return `최소 ${min}명이 필요해요 (봇 포함).`;
    if (n > 20) return '최대 20명까지 할 수 있어요.';
    g.P = list; g.r = 0; g.win = null; g.pm = {}; g.tr = -1; g.vo = []; g.vt = []; g.fi = []; g.lg = []; g.oil = []; g.dg = null; g.sh = []; g.shc = {}; g.bd = []; g.st = []; g.du = {}; g.cu = []; g.mt = null; g.kh = -1; this.hist = {}; this.out = new Set(); this.visit = {}; this.lastOut = null; this.lastVisit = {}; this.lastQ = {}; this.txUsed = {}; this.fake = new Set();
    if (g.mode === 'onuw') {
      const deck = onuwDeck(n); deck.forEach((r, i) => { if (i < n) list[i][RO] = r; }); g.C = deck.slice(n); g.F = null; g.oc = Array(n).fill(null); g.dead = [];
      this.phase('role', 9, [['card']]);
    } else {
      const deck = classicDeck(n, { ...g.opt, is3d: this.isNew() }); list.forEach((p, i) => p[RO] = deck[i]);
      g.bet = {}; list.forEach((p, i) => { if (p[RO] === 'I') g.bet[i] = Math.random() < 0.5 ? 'town' : 'mafia'; });
      g.fk = {}; const fakePool = this.isNew() ? ['P', 'T', 'L', 'N', 'A', 'k', 'b'] : ['P'];
      list.forEach((p, i) => { if (p[RO] === 'q') g.fk[i] = fakePool[Math.floor(Math.random() * fakePool.length)]; });
      g.ms = {}; this.msP = {}; g.kn = {};
      // 단서 바꿔치기: 마피아 팀 전체가 한 게임에 나눠 쓰는 총 횟수 (11명 이하 2번, 12명 이상 3번). 미끼꾼의 가짜 단서는 별도
      g.fgM = g.opt.fg === 0 ? 0 : (list.length <= 11 ? 2 : 3); g.fgU = 0;
      this.phase('role', 8, [['role']]);
    }
    this.log(['start', n]);
    return null;
  }

  // ── 매 틱 ──
  tick(peers) {
    const g = this.g, now = Date.now(); const dt = Math.min(0.5, (now - this.lastTick) / 1000); this.lastTick = now;
    const pk = this.pk; const inGame = g.ph !== 'lobby' && g.ph !== 'end';
    const humans = [], reqs = [];
    for (const p of peers) {
      const s = p.s; if (!s || !s.n) continue; humans.push({ uid: p.uid, n: String(s.n).slice(0, 10), c: s.c | 0, h: s.h | 0, j: s.j, rd: s.rd, sv: s.sv });
      if (s.req && s.req.q !== this.lastReq[p.uid]) { if (this.primed) reqs.push([String(s.n).slice(0, 10), s.req]); this.lastReq[p.uid] = s.req.q; }
      this.seen[p.uid] = now; if (p.m && typeof p.m.x === 'number') this.pos[p.uid] = [p.m.x, p.m.z];
      const i = this.slotOf(p.uid); if (i < 0) continue;
      const a = s.a;
      if (a && a.pk === pk && a.q !== this.lastQ[p.uid]) { this.lastQ[p.uid] = a.q; this.act(i, a); }
      if (g.ph === 'discuss' && s.tx && s.tx.pk === pk && this.alive(i) && !this.txUsed[pk + p.uid]) { this.txUsed[pk + p.uid] = 1; this.extend(s.tx.d > 0 ? 1 : -1, i); }
      if (g.ph === 'vote' && s.v && s.v.pk === pk && this.alive(i) && g.vo[i] !== s.v.t) { g.vo[i] = s.v.t; this.dirty = true; }
      if (g.ph === 'final' && s.f && s.f.pk === pk && this.alive(i) && i !== g.tr && g.fi[i] !== s.f.y) { g.fi[i] = s.f.y; this.dirty = true; }
    }
    // 오래 자리를 비운 사람
    if (inGame && !this.manual) for (let i = 0; i < g.P.length; i++) {
      const p = g.P[i]; if (p[U].startsWith('bot') || p[AL] !== 1) continue;
      if (this.seen[p[U]] === undefined) this.seen[p[U]] = now;
      if (now - this.seen[p[U]] > 30000 && !g.opt.off) {
        if (g.mode === 'classic') { p[AL] = 0; this.log(['left', i]); const w = this.winCheck(); if (w) { this.finish(w); break; } }
        this.seen[p[U]] = now + 1e12;
      }
    }
    this.primed = true; // 방장이 막 바뀐 첫 틱에는 예전 요청을 다시 적용하지 않는다
    humans.sort((a, b) => (a.j || 0) - (b.j || 0) || (a.uid < b.uid ? -1 : 1));
    for (const [nm, rq] of reqs) this.request(nm, rq, humans.length);
    // 대기실: 모두 준비하면 5초 뒤 자동 시작
    if (g.ph === 'lobby') {
      const n = Math.min(20, humans.length + g.B.length), min = g.mode === 'onuw' ? 3 : 4;
      const all = humans.length > 0 && humans.slice(0, 20).every(h => h.rd);
      if (all && n >= min) { if (!this.startAt) { this.startAt = now + 5000; this.end = this.startAt; g.cd = 1; this.dirty = true; } }
      else if (this.startAt || g.cd) { this.startAt = 0; g.cd = 0; this.dirty = true; }
      if (this.startAt && now >= this.startAt) {
        this.startAt = 0; g.cd = 0;
        const hs = humans.slice(0, 20); while (hs.length + g.B.length > 20) { const b = g.B.pop(); this.bots.delete(b[0]); }
        this.start(hs);
      }
    }
    // 넘기기 투표: 토론은 살아 있는 사람 전원, 나머지 단계는 과반
    if (g.ph !== 'lobby' && !this.manual) {
      const voters = this.skipVoters(humans), yes = voters.filter(h => h.sv === pk).length, need = this.skipNeed(voters.length);
      // 밤 차례는 넘기기 불가: 시간이 고정이라 누가 깨어 있는지·어떤 직업이 있는지 티 나지 않는다
      if (voters.length && yes >= need && now < this.end && !(g.ph === 'night' && g.nts)) { this.end = now; }
      if ((g.sk || 0) !== yes || g.skn !== need) { g.sk = yes; g.skn = need; this.dirty = true; }
    }
    if (g.ph === 'vote' || g.ph === 'final') this.tallyLive();
    if (this.isNew()) { this.trackNight(); this.missionTick(dt); this.bots3d(now, dt); if (g.ph === 'vote' || g.ph === 'final') this.botsAct(now); } else this.botsAct(now);
    this.botsMove(dt);
    this.botsChat(now);
    if (g.ph !== 'lobby' && now >= this.end) this.advance();
    if (now - this.keep > 4000) this.dirty = true;
    if (this.dirty) { g.rem = Math.max(0, this.end - Date.now()); g.e = (g.e || 0) + 1; this.dirty = false; this.keep = now; return true; }
    return false;
  }

  weight(i) { const g = this.g; if (g.mode === 'classic' && g.bm === i) return 0; return g.mode === 'classic' && g.P[i][RO] === 'O' ? 2 : 1; }
  tallyLive() {
    const g = this.g; const vt = Array(g.P.length).fill(0);
    if (g.ph === 'vote') g.vo.forEach((t, i) => { if (t >= 0 && this.alive(i) && this.alive(t)) vt[t] += this.weight(i); });
    const s = JSON.stringify(vt); if (s !== JSON.stringify(g.vt)) { g.vt = vt; this.dirty = true; }
  }

  advance() {
    const g = this.g, T = this.T();
    if (g.ph === 'end') { this.toLobby(); return; }
    if (g.mode === 'onuw') {
      if (g.ph === 'role') this.phase('night', T.onN, [['onN']]);
      else if (g.ph === 'night') { this.resolveOnuw(); this.phase('dawn', 10, [['dawn']]); }
      else if (g.ph === 'dawn') this.phase('discuss', T.onD, [['onD']]);
      else if (g.ph === 'discuss') { g.vo = Array(g.P.length).fill(-2); g.vt = []; this.phase('vote', T.vote, [['onV']]); }
      else if (g.ph === 'vote') this.resolveOnuwVote();
      return;
    }
    if (this.isNew()) {
      if (g.ph === 'role' || g.ph === 'day') return this.startNight();
      if (g.ph === 'night') return this.advanceNight3d();
      if (g.ph === 'morning') return this.startDay();
      if (g.ph === 'voteres' || g.ph === 'execres') return this.afterMeeting();
    }
    if (g.ph === 'role' || g.ph === 'voteres') this.startNight();
    else if (g.ph === 'night' && g.nts && g.nt < g.nts.length - 1) { g.nt++; this.turnStart = Date.now(); this.end = this.turnStart + (g.nts[g.nt] === 'maf' ? NIGHT_MAF : NIGHT_TURN) * 1000; this.botPlan = {}; this.dirty = true; }
    else if (g.ph === 'night') this.resolveNight();
    else if (g.ph === 'morning' && g.opt.exp && !this.manual) this.startExplore();
    else if (g.ph === 'explore') { g.cl = []; this.phase('discuss', T.disc, [['disc']]); }
    else if (g.ph === 'morning') this.phase('discuss', T.disc, [['disc']]);
    else if (g.ph === 'discuss') { g.vo = Array(g.P.length).fill(-2); g.vt = []; this.phase('vote', T.vote, [['vote']]); }
    else if (g.ph === 'vote') this.resolveVote();
    else if (g.ph === 'defense') { g.fi = Array(g.P.length).fill(-1); this.phase('final', T.fin, [['final', g.tr]]); }
    else if (g.ph === 'final') this.resolveFinal();
    else if (g.ph === 'execres') { const w = this.winCheck(); if (w) this.finish(w); else this.startNight(); }
  }

  startNight() {
    if (this.isNew()) return this.startNight3d();
    const g = this.g; g.r++; g.nc = { k: -1, kb: -1, h: -1, rp: -1, x: -1, ol: -1, ig: 0, dq: -1, used: {}, acts: [] }; g.pm = {}; g.tr = -1; g.vo = []; g.vt = [];
    if (g.dg && this.alive(g.dg.q) && g.P[g.dg.t]) g.pm[g.P[g.dg.q][U]] = ['pQon', g.dg.t]; else g.dg = null;
    g.cl = []; g.nts = null; g.nt = 0;
    if (g.opt.nt && !this.manual) {
      const deck = new Set(g.P.map(p => p[RO]));
      g.nts = TURN_ORDER.slice(); // 직업이 없어도 모든 차례 진행 (어떤 직업이 없는지 힌트 금지)
    }
    this.phase('night', g.nts ? NIGHT_MAF : this.T().night, [['night', g.r]]);
    this.turnStart = Date.now();
    this.log(['night', g.r]);
  }
  // ── 낮 탐색: 맵 곳곳에 단서를 뿌린다 ──
  startExplore() {
    const g = this.g, n = g.P.filter(p => p[AL] === 1).length, cnt = Math.max(3, Math.ceil(n * 0.75));
    g.cl = []; g.ck = {};
    for (let k = 0; k < cnt; k++) { const p = this.w.randomPoint(); g.cl.push([k + 1, +p.x.toFixed(1), +p.z.toFixed(1)]); }
    this.phase('explore', this.T().exp, [['explore', cnt]]);
  }
  clueFor(i) {
    const g = this.g, P = g.P, al = P.map((p, j) => j).filter(j => this.alive(j) && j !== i);
    const maf = al.filter(j => isMafiaTeam(P[j][RO])), non = al.filter(j => !isMafiaTeam(P[j][RO]));
    const deck = new Set(P.map(p => p[RO]));
    const r = Math.random();
    if (r < 0.12) return ['c0'];
    if (r < 0.36 && non.length) return ['cS', rnd(non)];
    if (r < 0.56 && maf.length && non.length) { const pair = shuffle([rnd(maf), rnd(non)]); return ['cP', pair[0], pair[1]]; }
    if (r < 0.72 && al.length >= 3) { const t = shuffle(al.slice()).slice(0, 3); return ['cT', t[0], t[1], t[2], t.filter(j => isMafiaTeam(P[j][RO])).length]; }
    if (r < 0.88) {
      if (Math.random() < 0.35) { const absent = ROLE_ORDER.filter(x => x !== 'C' && !deck.has(x)); if (absent.length) return ['cN', rnd(absent)]; }
      const present = [...deck].filter(x => x !== 'C'); const ro = rnd(present);
      return ['cR', ro, P.some(p => p[RO] === ro && p[AL] === 1) ? 1 : 0];
    }
    if (g.kp) return ['cL', g.kp];
    return non.length ? ['cS', rnd(non)] : ['c0'];
  }

  act(i, a) {
    const g = this.g; if (!this.alive(i)) return;
    if (a.k === 'share') { this.share(i, String(a.s || '')); return; }
    if (a.k === 'bet' && g.mode === 'classic' && g.P[i][RO] === 'I' && g.r <= 2) { g.bet = g.bet || {}; g.bet[i] = a.t ? 'mafia' : 'town'; g.pm[g.P[i][U]] = ['pIb', g.bet[i]]; this.dirty = true; return; }
    if (g.mode === 'onuw') { if (g.ph === 'night' && a.k === 'on') { g.oc[i] = { t: a.t | 0, t2: a.t2 | 0, c: a.c | 0, c2: a.c2 | 0 }; this.dirty = true; } return; }
    if (a.k === 'clue' && g.ph === 'explore') {
      const uidI = g.P[i][U], mine = (g.ck[uidI] || []);
      const c = (g.cl || []).find(x => x[0] === a.t); if (!c || mine.length >= 3) return;
      const pos = uidI.startsWith('bot') ? (this.bots.get(uidI) ? [this.bots.get(uidI).x, this.bots.get(uidI).z] : null) : this.pos[uidI];
      if (pos && Math.hypot(pos[0] - c[1], pos[1] - c[2]) > 4) return;
      g.cl = g.cl.filter(x => x !== c); this.giveClue(i, c[0], this.clueCard(i, false)); return;
    }
    if (this.isNew() && this.act3d(i, a)) return;
    if (g.ph !== 'night' || !this.inTurn(i)) return;
    const me = g.P[i], r = this.effRole(i), nc = g.nc, pm = g.pm, t = a.t | 0;
    if (a.k === 'ignite' && r === 'F') {
      g.oil = (g.oil || []).filter(j => this.alive(j)); if (!g.oil.length) return;
      nc.ig = 1; nc.ol = -1; pm[me[U]] = ['pFi', g.oil.length]; this.dirty = true; return;
    }
    if (a.k === 'med' && r === 'E' && g.opt.off && !nc.used[i] && g.P[t] && g.P[t][AL] !== 1) { nc.used[i] = 1; pm[me[U]] = ['pE', t, g.P[t][RO]]; this.dirty = true; return; }
    if (!this.alive(t)) return;
    const tg = g.P[t];
    if (a.k === 'kill' && r === 'M' && t !== i && !isMafia(tg[RO])) {
      nc.k = t; nc.kb = i;
      { const u = me[U], b = this.bots.get(u), ps = u.startsWith('bot') ? (b ? [b.x, b.z] : null) : this.pos[u]; nc.kp = ps && !g.opt.act && !g.opt.off && this.w.placeName ? this.w.placeName(ps[0], ps[1]) : ''; }
      g.P.forEach(p => { if (isMafia(p[RO])) pm[p[U]] = ['pK', i, t]; });
    } else if (a.k === 'spy' && r === 'S' && t !== i && !nc.used[i]) {
      nc.used[i] = 1; pm[me[U]] = ['pS', t, tg[RO]]; if (isMafia(tg[RO])) this.know(i, t);
    } else if (a.k === 'inv' && r === 'P' && t !== i && !nc.used[i]) {
      nc.used[i] = 1; pm[me[U]] = ['pI', t, this.isFake(i) ? (Math.random() < 0.4 ? 1 : 0) : (tg[RO] === 'M' || tg[RO] === 'Q') ? 1 : 0];
    } else if (a.k === 'heal' && r === 'D') {
      nc.h = t; pm[me[U]] = ['pH', t, t === i ? 1 : 0];
    } else if (a.k === 'scoop' && r === 'R' && g.r >= 2 && !(me[FL] & 2) && t !== i) {
      nc.rp = t; pm[me[U]] = ['pR', t];
    } else if (a.k === 'slay' && r === 'X' && t !== i) {
      nc.x = t; pm[me[U]] = ['pX', t];
    } else if (a.k === 'oil' && r === 'F' && t !== i) {
      nc.ol = t; nc.ig = 0; const cnt = new Set((g.oil || []).filter(j => this.alive(j)).concat([t])).size; pm[me[U]] = ['pF', t, cnt];
    } else if (a.k === 'blk' && r === 'B' && t !== i) {
      if (isMafia(tg[RO])) { this.know(i, t); pm[me[U]] = ['pBm', t]; } else { nc.bm = t; pm[me[U]] = ['pB', t]; }
    } else if (a.k === 'copy' && r === 'Q' && t !== i) {
      nc.dq = t; pm[me[U]] = ['pQ', t, this.isNew() ? 1 : 0];
    } else return;
    nc.acts = (nc.acts || []).filter(x => !(x[0] === i && x[1] === a.k)).concat([[i, a.k, t]]);
    this.dirty = true;
  }

  roleOf(i) { return this.g.opt.rev ? this.g.P[i][RO] : 0; }
  resolveNight() {
    const g = this.g, nc = g.nc, P = g.P, lines = [], atk = new Map();
    const add = (t, by, kind) => { if (!(t >= 0) || !this.alive(t)) return; if (!atk.has(t)) atk.set(t, []); atk.get(t).push({ by, kind }); };
    if (nc.k >= 0) { let by = nc.kb; if (!this.alive(by)) by = P.findIndex(p => p[RO] === 'M' && p[AL] === 1); if (by >= 0) add(nc.k, by, 'maf'); }
    const xi = P.findIndex(p => p[RO] === 'X' && p[AL] === 1); if (xi >= 0 && nc.x >= 0) add(nc.x, xi, 'kil');
    const fi = P.findIndex(p => p[RO] === 'F' && p[AL] === 1);
    g.oil = (g.oil || []).filter(i => this.alive(i));
    if (fi >= 0 && nc.ig) { for (const t of g.oil) add(t, fi, 'fire'); g.oil = []; }
    else if (fi >= 0 && nc.ol >= 0 && !g.oil.includes(nc.ol)) g.oil.push(nc.ol);
    const dead = new Set();
    for (const [t, list] of atk) {
      const v = P[t]; if (dead.has(t) || !this.alive(t)) continue;
      if (nc.h === t) { lines.push(['saved']); continue; }
      if (v[RO] === 'G' && !(v[FL] & 1) && list.every(a => a.kind !== 'fire')) { v[FL] |= 1; lines.push(['armor', t]); continue; }
      if (v[RO] === 'W' && !(v[FL] & 4)) {
        v[FL] |= 4;
        for (const a of list) if (a.by >= 0 && a.by !== t && this.alive(a.by) && !dead.has(a.by)) { P[a.by][AL] = 0; dead.add(a.by); lines.push(['revenge', t, a.by, this.roleOf(a.by)]); }
        continue;
      }
      v[AL] = 0; dead.add(t);
      lines.push(list.every(a => a.kind === 'fire') ? ['burn', t, this.roleOf(t)] : ['kill', t, this.roleOf(t)]);
    }
    if (!lines.length) lines.push(['calm']);
    if (nc.rp >= 0) {
      const rp = P.findIndex(p => p[RO] === 'R'); if (rp >= 0) P[rp][FL] |= 2;
      lines.push(['scoop', nc.rp, P[nc.rp][RO]]);
    }
    g.kp = nc.kp || '';
    const qi = P.findIndex(p => p[RO] === 'Q' && p[AL] === 1);
    g.dg = qi >= 0 && nc.dq >= 0 && this.alive(nc.dq) ? { q: qi, t: nc.dq } : null;
    g.pm = {};
    g.bm = nc.bm >= 0 && this.alive(nc.bm) ? nc.bm : -1; if (g.bm >= 0) g.pm[P[g.bm][U]] = ['pBv'];
    P.forEach((p, h) => {
      if (p[RO] !== 'H' || p[AL] !== 1) return;
      g.pm[p[U]] = ['hae', [...new Set((nc.acts || []).filter(x => x[2] === h && x[0] !== h).map(x => x[0]))]];
    });
    lines.forEach(l => this.log(l));
    const w = this.winCheck(); if (w) { g.news = lines; this.finish(w); return; }
    this.phase('morning', 7, lines);
  }

  resolveVote() {
    const g = this.g; this.tallyLive(); const vt = g.vt || [];
    let max = 0, tops = []; vt.forEach((c, i) => { if (c > max) { max = c; tops = [i]; } else if (c === max && c > 0) tops.push(i); });
    if (max <= 0 || tops.length !== 1) { const t = ['tie']; this.log(t); this.phase('voteres', 5, [t]); return; }
    g.tr = tops[0]; const t = ['trial', g.tr, max];
    this.log(t); this.phase('defense', this.T().def, [t]);
  }
  resolveFinal(fy, fn) {
    const g = this.g; let yes = 0, no = 0;
    if (fy !== undefined) { yes = fy | 0; no = fn | 0; }
    else g.fi.forEach((y, i) => { if (!this.alive(i) || i === g.tr) return; if (y === 1) yes += this.weight(i); else if (y === 0) no += this.weight(i); });
    const v = g.P[g.tr]; let t;
    if (yes > no) {
      v[AL] = 0;
      if (v[RO] === 'J') { t = ['jester', g.tr, yes, no]; this.log(t); g.news = [t]; this.finish('jester'); return; }
      t = ['exec', g.tr, yes, no, this.roleOf(g.tr)];
    } else t = ['spared', g.tr, yes, no];
    this.log(t); this.phase('execres', 6, [t]);
  }
  // 보조가 마피아를 알게 됨 (채팅은 여전히 불가)
  know(i, t) { const g = this.g; g.kn = g.kn || {}; const k = g.kn[i] = g.kn[i] || []; if (!k.includes(t)) k.push(t); this.dirty = true; }
  winCheck() {
    // 시민은 진짜 마피아(보조 제외)만 다 잡으면 이긴다. 마피아 쪽 머릿수는 보조까지 센다
    const g = this.g; let m = 0, core = 0, o = 0, tot = 0; const h = [];
    g.P.forEach(p => { if (p[AL] !== 1) return; tot++; if (isMafiaTeam(p[RO])) { m++; if (isMafia(p[RO])) core++; } else if (isHostile(p[RO])) h.push(p[RO]); else o++; });
    if (tot === 0) return 'draw';
    if (h.includes('X') && tot <= 2) return 'killer';
    if (h.includes('F') && core === 0 && tot <= 2) return 'pyro';
    if (!h.length && core === 0) return 'town';
    if (!h.length && m >= o) return 'mafia';
    return null;
  }
  finish(team) {
    const g = this.g, all = g.P.map((p, i) => i); let w = [], k = team;
    const aliveW = all.filter(i => (g.P[i][RO] === 'W' || g.P[i][RO] === 'q') && g.P[i][AL] === 1);
    if (team === 'town') w = all.filter(i => ROLES[g.P[i][RO]].team === 'town').concat(aliveW);
    else if (team === 'mafia') w = all.filter(i => isMafiaTeam(g.P[i][RO])).concat(aliveW);
    else if (team === 'killer') w = all.filter(i => g.P[i][RO] === 'X' && g.P[i][AL] === 1).concat(aliveW);
    else if (team === 'pyro') w = all.filter(i => g.P[i][RO] === 'F' && g.P[i][AL] === 1).concat(aliveW);
    else if (team === 'jester') w = [g.tr];
    else if (team === 'draw') w = [];
    else { k = team.k; w = team.w; }
    if (g.mode === 'classic') g.P.forEach((p, i) => {
      if (w.includes(i)) return;
      if (p[RO] === 'I' && p[AL] === 1 && g.bet && ((g.bet[i] === 'town' && k === 'town') || (g.bet[i] === 'mafia' && k === 'mafia'))) w.push(i);
      if (p[RO] === 'U' && ((g.rel || {})[i] || 0) >= (g.P.length <= 11 ? 2 : 3)) w.push(i);
      if (p[RO] === 'w' && p[AL] === 1 && ((g.stp || {})[i] || []).length >= 5) w.push(i);
    });
    g.win = { k, w }; this.log(['win', k]); this.phase('end', 40);
  }

  // ── 한밤 모드 ──
  resolveOnuw() {
    const g = this.g, n = g.P.length, orig = g.P.map(p => p[RO]).concat(g.C), cur = orig.slice(), pm = {};
    const nm = i => g.P[i][NM], rn = r => ONUW[r].name, oc = g.oc || [];
    const by = r => g.P.map((p, i) => i).filter(i => orig[i] === r);
    const valid = (t, me) => Number.isInteger(t) && t >= 0 && t < n && t !== me;
    const cc = c => (Number.isInteger(c) && c >= 0 && c < 3) ? c : Math.floor(Math.random() * 3);
    const wolves = by('W');
    for (const i of wolves) {
      if (wolves.length === 1) { const c = cc(oc[i] && oc[i].c); pm[g.P[i][U]] = ['wl', c, cur[n + c]]; }
      else pm[g.P[i][U]] = ['wp', wolves.filter(j => j !== i)];
    }
    for (const i of by('N')) pm[g.P[i][U]] = ['mn', wolves];
    for (const i of by('X')) {
      const o = oc[i];
      if (o && valid(o.t, i)) pm[g.P[i][U]] = ['sx', o.t, cur[o.t]];
      else { const c = cc(o && o.c); let c2 = cc(o && o.c2); if (c2 === c) c2 = (c + 1) % 3; const [c1, c3] = c < c2 ? [c, c2] : [c2, c]; pm[g.P[i][U]] = ['sx2', c1, cur[n + c1], c3, cur[n + c3]]; }
    }
    for (const i of by('B')) {
      const o = oc[i];
      if (o && valid(o.t, i)) { [cur[i], cur[o.t]] = [cur[o.t], cur[i]]; pm[g.P[i][U]] = ['rb', o.t, cur[i]]; }
      else pm[g.P[i][U]] = ['rb0'];
    }
    for (const i of by('T')) {
      const o = oc[i];
      if (o && valid(o.t, i) && valid(o.t2, i) && o.t !== o.t2) { [cur[o.t], cur[o.t2]] = [cur[o.t2], cur[o.t]]; pm[g.P[i][U]] = ['tm', o.t, o.t2]; }
      else pm[g.P[i][U]] = ['tm0'];
    }
    for (const i of by('K')) { const c = cc(oc[i] && oc[i].c); [cur[i], cur[n + c]] = [cur[n + c], cur[i]]; pm[g.P[i][U]] = ['dk', c]; }
    for (const i of by('I')) pm[g.P[i][U]] = ['in', cur[i]];
    g.P.forEach(p => { if (!pm[p[U]]) pm[p[U]] = ['zz']; });
    g.F = cur; g.pm = pm;
  }
  resolveOnuwVote() {
    const g = this.g, n = g.P.length, F = g.F, cnt = Array(n).fill(0);
    g.vo.forEach((t, i) => { if (t >= 0 && t < n) cnt[t]++; });
    g.vt = cnt;
    const max = Math.max(0, ...cnt); let dead = max >= 2 ? cnt.map((c, i) => i).filter(i => cnt[i] === max) : [];
    for (const d of [...dead]) if (F[d] === 'H' && g.vo[d] >= 0 && !dead.includes(g.vo[d])) { dead.push(g.vo[d]); this.log(['hunter', d, g.vo[d]]); }
    dead.forEach(d => g.P[d][AL] = 0); g.dead = dead;
    const team = i => ONUW[F[i]].team, all = g.P.map((p, i) => i);
    const wolvesIn = all.some(i => F[i] === 'W'), deadW = dead.some(i => F[i] === 'W'), deadA = dead.filter(i => F[i] === 'A');
    let k, w;
    if (deadA.length) { w = deadA.slice(); k = 'tanner'; if (deadW) { w = w.concat(all.filter(i => team(i) === 'village')); k = 'tannerV'; } }
    else if (wolvesIn) { if (deadW) { w = all.filter(i => team(i) === 'village'); k = 'village'; } else { w = all.filter(i => team(i) === 'wolf'); k = 'wolf'; } }
    else if (!dead.length) { w = all.filter(i => team(i) === 'village'); k = 'village0'; }
    else { w = all.filter(i => F[i] === 'N'); k = w.length ? 'minion' : 'none'; }
    g.news = [['dead', dead], ['win', k]];
    this.finish({ k, w });
  }

  // ── 봇 ──
  scatterBots() {
    const g = this.g, list = g.ph === 'lobby' ? g.B.map(b => b[0]) : g.P.filter(p => p[U].startsWith('bot')).map(p => p[U]);
    list.forEach((id, k) => {
      const slot = this.slotOf(id); const sp = g.ph === 'night' ? this.w.spawns[(slot < 0 ? k : slot) % this.w.spawns.length] : this.w.randomPoint();
      this.bots.set(id, { x: sp.x, z: sp.z, ry: 0, mv: 0, tx: sp.x, tz: sp.z, wait: Math.random() * 2 });
    });
  }
  botsMove(dt) {
    const g = this.g, seated = SEATED.has(g.ph) || (!!g.opt.off && (g.ph === 'night' || g.ph === 'role'));
    const ids = g.ph === 'lobby' ? g.B.map(b => b[0]) : g.P.filter(p => p[U].startsWith('bot')).map(p => p[U]);
    for (const id of ids) {
      let b = this.bots.get(id); if (!b) { const sp = this.w.randomPoint(); b = { x: sp.x, z: sp.z, ry: 0, mv: 0, tx: sp.x, tz: sp.z, wait: 1 }; this.bots.set(id, b); }
      const slot = this.slotOf(id);
      if (seated && slot >= 0) {
        b.mv = 0;
        if ((g.ph === 'defense' || g.ph === 'final') && slot === g.tr) { b.x = 0; b.z = 0; b.ry = 0; b.sit = false; }
        else { const s = this.w.seats[slot]; b.x = s.x; b.z = s.z; b.ry = s.ry; b.sit = true; }
        continue;
      }
      b.sit = false;
      b.lie = false;
      if (g.ph === 'night' && ((g.nts && slot >= 0 && !this.inTurn(slot)) || this.isNew())) { b.mv = 0; b.lie = slot >= 0 && this.alive(slot); if (b.lie && this.w.homes && this.w.homes[slot] && this.w.homes[slot].bed) { const h = this.w.homes[slot]; b.x = h.bed.x; b.z = h.bed.z; b.ry = h.ry; } continue; }
      if (slot >= 0 && g.ph !== 'lobby' && !this.alive(slot)) { b.mv = 0; b.x = 999; b.z = 999; continue; }
      if (g.ph === 'day') this.botTarget3d(b, id);
      if (g.ph === 'explore' && slot >= 0 && this.alive(slot) && (g.ck[id] || []).length < 1 && g.cl.length) {
        let best = null, bd = 1e9; for (const c of g.cl) { const d = Math.hypot(c[1] - b.x, c[2] - b.z); if (d < bd) { bd = d; best = c; } }
        if (best) { b.tx = best[1]; b.tz = best[2]; b.wait = 0; if (bd < 1.2) this.act(slot, { k: 'clue', t: best[0] }); }
      }
      if (b.wait > 0) { b.wait -= dt; b.mv = 0; continue; }
      const wp = this.route ? this.route(b, b.tx, b.tz) : { x: b.tx, z: b.tz };
      const dx = wp.x - b.x, dz = wp.z - b.z, d = Math.hypot(b.tx - b.x, b.tz - b.z), dd = Math.hypot(dx, dz) || 1;
      if ((d < 0.4 && g.ph !== 'explore' && g.ph !== 'day') || b.stuck > 1.5 || (d < 0.4 && !g.cl.length)) { b.toBell = 0; const p = this.w.randomPoint(); b.tx = p.x; b.tz = p.z; b.wait = 1 + Math.random() * 4; b.stuck = 0; continue; }
      const sp = (g.ph === 'night' ? 3.2 : (g.ph === 'explore' || g.ph === 'day') ? 2.6 : 2.4) * dt, ox = b.x, oz = b.z;
      b.x += dx / dd * sp; b.z += dz / dd * sp;
      const r = this.w.collide(b.x, b.z, 0.4); b.x = r.x; b.z = r.z;
      if (Math.hypot(b.x - ox, b.z - oz) < sp * 0.3) b.stuck = (b.stuck || 0) + dt; else b.stuck = 0;
      b.ry = Math.atan2(dx, dz); b.mv = 1;
    }
  }
  botMotion() {
    const out = [];
    for (const [id, b] of this.bots) out.push([id, +b.x.toFixed(2), +b.z.toFixed(2), +b.ry.toFixed(2), b.mv | 0, b.lie ? 2 : b.sit ? 1 : 0]);
    return out;
  }
  botsAct(now) {
    const g = this.g; if (g.ph === 'lobby' || g.ph === 'end' || g.ph === 'role') return;
    const pk = this.pk, P = g.P, n = P.length, alive = P.map((p, i) => i).filter(i => this.alive(i));
    P.forEach((p, i) => {
      if (!p[U].startsWith('bot') || !this.alive(i)) return;
      const key = pk + i;
      if (this.botPlan[key] === undefined) this.botPlan[key] = g.nts && g.ph === 'night' ? now + 1500 + Math.random() * Math.min(5000, Math.max(500, (this.end - now) * 0.5)) : now + 3000 + Math.random() * Math.max(1000, (this.end - now) * 0.6);
      if (this.botPlan[key] === 0 || now < this.botPlan[key]) return;
      this.botPlan[key] = 0;
      const others = alive.filter(j => j !== i);
      if (!others.length) return;
      if (g.mode === 'onuw') {
        if (g.ph === 'night') {
          const o = shuffle(P.map((q, j) => j).filter(j => j !== i));
          g.oc[i] = { t: P[i][RO] === 'X' && Math.random() < 0.4 ? -1 : o[0], t2: o[1] === undefined ? -1 : o[1], c: Math.floor(Math.random() * 3), c2: Math.floor(Math.random() * 3) };
        } else if (g.ph === 'vote') { const mine = P[i][RO]; const pool = others.filter(j => !(mine === 'W' && P[j][RO] === 'W')); g.vo[i] = this.followVote(pool.length ? pool : others); }
        this.dirty = true; return;
      }
      const r = P[i][RO];
      if (g.ph === 'night') {
        const nonMaf = others.filter(j => !isMafia(P[j][RO]));
        const prey = nonMaf.filter(j => P[j][RO] !== 'X');
        if (r === 'M' && g.nc.k < 0 && nonMaf.length) this.act(i, { k: 'kill', t: rnd(prey.length ? prey : nonMaf) });
        else if (r === 'X') this.act(i, { k: 'slay', t: rnd(others) });
        else if (r === 'F') { const oil = (g.oil || []).filter(j => this.alive(j)); const fresh = others.filter(j => !oil.includes(j)); if (oil.length >= 2 && (Math.random() < 0.5 || !fresh.length)) this.act(i, { k: 'ignite' }); else if (fresh.length) this.act(i, { k: 'oil', t: rnd(fresh) }); }
        else if (r === 'Q') this.act(i, { k: 'copy', t: rnd(others) });
        else if (r === 'D') this.act(i, { k: 'heal', t: rnd(alive) });
        else if (r === 'P') this.act(i, { k: 'inv', t: rnd(others) });
        else if (r === 'S') this.act(i, { k: 'spy', t: rnd(others) });
        else if (r === 'B') this.act(i, { k: 'blk', t: rnd(others) });
        else if (r === 'R' && Math.random() < 0.4) this.act(i, { k: 'scoop', t: rnd(others) });
      } else if (g.ph === 'vote') {
        const kn = (g.kn || {})[i] || [];
        let pool = isMafia(r) ? others.filter(j => !isMafia(P[j][RO])) : isSupport(r) ? others.filter(j => !kn.includes(j)) : others;
        // 봇의 "촉": 마을 봇은 가끔 마피아 팀 쪽으로 기운다 (혼자 봇과 할 때 너무 무작위가 되지 않게)
        if (!isMafiaTeam(r) && Math.random() < 0.3) { const m = others.filter(j => isMafiaTeam(P[j][RO])); if (m.length) pool = m; }
        g.vo[i] = this.followVote(pool.length ? pool : others); this.dirty = true;
      } else if (g.ph === 'final' && i !== g.tr) {
        const acc = P[g.tr][RO];
        g.fi[i] = isMafia(r) ? (isMafia(acc) ? 0 : 1) : isSupport(r) && ((g.kn || {})[i] || []).includes(g.tr) ? 0 : (Math.random() < 0.6 ? 1 : 0); this.dirty = true;
      }
    });
  }
  followVote(pool) {
    const vt = this.g.vt || []; let best = -1, bv = 0;
    pool.forEach(j => { if ((vt[j] || 0) > bv) { bv = vt[j]; best = j; } });
    return best >= 0 && Math.random() < 0.6 ? best : rnd(pool);
  }
  botsChat(now) {
    const g = this.g;
    // 밤: 마피아 봇이 마피아 팀 채팅으로 작전 회의 (사람 마피아가 있을 때만)
    if (g.mode === 'classic' && g.ph === 'night') {
      if (now < this.nextChat) return;
      this.nextChat = now + 5000 + Math.random() * 6000;
      const maf = g.P.map((p, i) => i).filter(i => isMafia(g.P[i][RO]) && this.alive(i));
      if (!maf.some(i => !g.P[i][U].startsWith('bot'))) return;
      const bm = maf.filter(i => g.P[i][U].startsWith('bot')); if (!bm.length || Math.random() < 0.35) return;
      const tg = g.P.map((p, j) => j).filter(j => this.alive(j) && !isMafia(g.P[j][RO])); if (!tg.length) return;
      const line = rnd(BOT_LINES.mafia).replace('{t}', g.P[rnd(tg)][NM]);
      this.bc = this.bc.concat([[++this.bcId, line, 'm', g.P[rnd(bm)][U]]]).slice(-4);
      return;
    } const talk = g.mode === 'onuw' ? g.ph === 'discuss' : (g.ph === 'discuss' || (g.ph === 'morning' && !this.isNew()));
    if (!talk || now < this.nextChat) return;
    this.nextChat = now + 4000 + Math.random() * 6000;
    const bots = g.P.map((p, i) => i).filter(i => g.P[i][U].startsWith('bot') && this.alive(i));
    if (!bots.length || Math.random() < 0.3) return;
    const i = rnd(bots); const others = g.P.map((p, j) => j).filter(j => j !== i && this.alive(j)); if (!others.length) return;
    const line = rnd(BOT_LINES[g.mode === 'onuw' ? 'onuw' : 'classic']).replace('{t}', g.P[rnd(others)][NM]);
    this.bc = this.bc.concat([[++this.bcId, line, 'a', g.P[i][U]]]).slice(-4);
  }
}

install3d(Host);
