// 3D 탐색 모드 규칙 — 밤엔 집에 숨어들어 처치·시체 숨기기, 낮엔 단서·시체 신고·소집 회의·현장 치료
// Host 클래스에 메서드를 덧붙인다 (install). 오프라인·목록 모드는 host.js의 기존 규칙을 그대로 쓴다.
import { NIGHT_TURN, NIGHT_MAF, ROLES, isMafiaTeam, isMafia, isSupport, isHostile, shuffle, TURNS, TURN_ORDER_3D, ROLE_ORDER, COLORS } from './roles.js';

const U = 0, NM = 1, CO = 2, HA = 3, AL = 4, RO = 5, FL = 6;
// FL 비트: 1 방패 사용, 2 취재 사용, 4 물귀신 반격 사용, 8 죽음 확정(모두가 앎), 16 가짜 시체 사용
const CONFIRMED = 8;
const rnd = a => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function install(Host) {
  const P = Host.prototype;

  P.isNew = function () { const g = this.g; return g.mode === 'classic' && !this.manual && !g.opt.off && !g.opt.act; };
  P.posOf = function (i) {
    const u = this.g.P[i] && this.g.P[i][U]; if (!u) return null;
    if (u.startsWith('bot')) { const b = this.bots.get(u); return b ? [b.x, b.z] : null; }
    return this.pos[u] || null;
  };
  P.near = function (i, xz, r) { const p = this.posOf(i); return !p || dist(p, xz) <= r; }; // 위치를 모르면 믿어 준다
  P.use = function (uid, k) { const g = this.g; g.du = g.du || {}; const d = g.du[uid] = g.du[uid] || {}; d[k] = (d[k] || 0) + 1; return d[k]; };
  P.used = function (uid, k) { const d = (this.g.du || {})[uid]; return d ? d[k] || 0 : 0; };

  // ── 밤 ──
  P.startNight3d = function () {
    const g = this.g;
    // 지난밤 쓰러진 채 아무도 치료하지 못한 사람 → 조용히 죽음 (시체는 남는다)
    g.P.forEach(p => { if (p[AL] === 2) p[AL] = 0; });
    g.r++; g.nc = { k: -1, kb: -1, done: 0, rp: -1, ig: 0, dq: -1, used: {}, acts: [], burn: [], bm: -1, trk: null };
    g.bm = -1; this.lampSeen = {};
    if (g.r === 1) { g.bet = g.bet || {}; g.P.forEach((p, i) => { if (p[RO] === 'I' && !g.bet[i]) g.bet[i] = Math.random() < 0.5 ? 'town' : 'mafia'; }); }
    g.pm = {}; g.tr = -1; g.vo = []; g.vt = []; g.cl = []; g.ck = {}; g.du = {}; g.cu = []; g.st = []; g.dg = null; g.mt = null;
    this.fake = new Set(); this.dayLeft = 0;
    const deck = new Set(g.P.map(p => p[RO]));
    // 어떤 직업이 있는지 티 나지 않게, 직업이 없어도 모든 차례를 똑같이 진행한다
    g.nts = TURN_ORDER_3D.slice();
    g.nt = 0;
    this.phase('night', this.turnSec(), [['night', g.r]]);
    this.turnStart = Date.now();
    this.log(['night', g.r]);
    const w = this.winCheck(); if (w) this.finish(w);
  };
  P.turnSec = function () { const g = this.g; return g.nts && g.nts[g.nt] === 'maf' ? NIGHT_MAF : NIGHT_TURN; };

  // 밤 대상 거리 확인: 실제 위치 또는 그 사람 침대(깨어 있는 사람은 남들 눈에 침대에서 자는 것처럼 보이므로)
  P.nearSleeper = function (i, t) { const tp = this.posOf(t), h = this.w.homes && this.w.homes[t]; return (!tp || this.near(i, tp, 3.5)) || (!!h && this.near(i, [h.bed.x, h.bed.z], 3.5)); };
  P.act3d = function (i, a) {
    const g = this.g, me = g.P[i], uid = me[U], r = this.effRole(i), t = a.t | 0;
    if (g.ph === 'night') {
      if (!this.inTurn(i)) return true;
      const nc = g.nc;
      if (a.k === 'kill' && r === 'M') {
        if (nc.done || !this.alive(t) || isMafia(g.P[t][RO]) || t === i) return true;
        if (!this.nearSleeper(i, t)) return true;
        this.attack(i, t, 'maf'); nc.done = 1; nc.kb = i; nc.k = t;
        nc.acts.push([i, 'kill', t]);
        return true;
      }
      if (a.k === 'drag' && isMafia(r) && g.nts[g.nt] === 'maf') { this.drag(i, t); return true; }
      if (a.k === 'revive' && r === 'D') { this.reviveAt(i, t); return true; }
      if (a.k === 'heal' && r === 'D') { this.reviveHouse(i, t); return true; }
      if (a.k === 'blk' && r === 'B') {
        if (nc.used[i] || !this.alive(t) || t === i || t === this.lastBm) return true;
        nc.used[i] = 1; nc.acts.push([i, 'blk', t]);
        if (isMafia(g.P[t][RO])) { this.know(i, t); g.pm[uid] = ['pBm', t]; } else { nc.bm = t; g.pm[uid] = ['pB', t]; }
        this.dirty = true; return true;
      }
      if (a.k === 'track' && r === 'T') {
        if (nc.used[i] || !this.alive(t) || t === i) return true;
        nc.used[i] = 1; nc.trk = [i, t]; nc.acts.push([i, 'track', t]); g.pm[uid] = ['pTs', t]; this.dirty = true; return true;
      }
      if (a.k === 'clean' && r === 'Y') {
        g.yc = g.yc || {}; if ((g.yc[uid] || 0) >= 2) return true;
        const b = (g.bd || []).find(x => x[0] === t), s = (g.st || []).find(x => x[3] === t);
        const v = b ? b[1] : s ? s[2] : -1; if (v < 0) return true;
        g.yc[uid] = (g.yc[uid] || 0) + 1;
        g.st = (g.st || []).filter(x => x[2] !== v); for (const x of (g.bd || [])) if (x[1] === v) x[7] = 1;
        g.pm[uid] = ['pY', 2 - g.yc[uid]]; this.dirty = true; return true;
      }
      if (a.k === 'ignite' && r === 'F') {
        const oil = (g.oil || []).filter(j => this.alive(j)); if (!oil.length || nc.ig) return true;
        nc.ig = 1; g.pm[uid] = ['pFi', oil.length]; this.dirty = true; return true;
      }
      // 🔭 잠복꾼: 한 집에 오늘 밤 드나든 손님 수 + 그중 한 명의 옷 색깔
      if (a.k === 'watch' && r === 'k') {
        if (nc.used[i] || !this.w.homes || !this.w.homes[t] || t === i) return true;
        const isBot = uid.startsWith('bot'), ps = this.posOf(i), dr = this.w.homes[t].doorOut;
        if (!isBot && !(ps && (this.w.houseAt(ps[0], ps[1]) === t || Math.hypot(ps[0] - dr.x, ps[1] - dr.z) < 3.4))) return true;
        nc.used[i] = 1; nc.acts.push([i, 'watch', t]); this.markOut(i, t);
        const vis = Object.keys(this.visit || {}).map(Number).filter(j => j !== t && j !== i && this.visit[j].has(t));
        let cnt = vis.length, col = cnt ? g.P[rnd(vis)][CO] : -1;
        if (this.isFake(i)) { cnt = Math.floor(Math.random() * 3); col = cnt ? g.P[rnd(g.P.map((p, j) => j))][CO] : -1; }
        g.pm[uid] = ['pWt', t, cnt, col]; this.dirty = true; return true;
      }
      // 🔗 인연술사: 잠든 두 사람이 같은 편인지
      if (a.k === 'bond' && r === 'b') {
        if (nc.used[i] || !this.alive(t) || t === i) return true;
        if (!uid.startsWith('bot') && !this.nearSleeper(i, t)) return true;
        nc.bd = nc.bd || {}; const first = nc.bd[i];
        this.markOut(i, t);
        if (first === undefined || first === t || !this.alive(first)) { nc.bd[i] = t; g.pm[uid] = ['pBd1', t]; this.dirty = true; return true; }
        const side = j => isMafiaTeam(g.P[j][RO]) ? 'm' : ROLES[g.P[j][RO]].team;
        let same = side(first) === side(t) ? 1 : 0; if (this.isFake(i)) same = Math.random() < 0.5 ? 1 : 0;
        nc.used[i] = 1; nc.acts.push([i, 'bond', t]); g.pm[uid] = ['pBd', first, t, same]; this.dirty = true; return true;
      }
      return false; // spy / copy / inv / scoop 는 기존 처리
    }
    if (g.ph !== 'day') return true;
    if (a.k === 'clue') {
      const mine = g.ck[uid] || [], c = (g.cl || []).find(x => x[0] === t);
      if (!c || mine.length >= 3 || !this.near(i, [c[1], c[2]], 4)) return true;
      g.cl = g.cl.filter(x => x !== c);
      this.giveClue(i, c[0], this.clueCard(i, this.fake.has(c[0])));
      if (this.lures && this.lures.has(c[0])) g.P.forEach(p => { if (isMafiaTeam(p[RO])) g.pm[p[U]] = ['pVl', i]; });
      return true;
    }
    if (a.k === 'forge' && isMafiaTeam(r)) {
      const c = (g.cl || []).find(x => x[0] === t); if (!c || (g.fgU || 0) >= (g.fgM || 0) || this.fake.has(t) || !this.near(i, [c[1], c[2]], 4)) return true;
      this.fake.add(t); g.fgU = (g.fgU || 0) + 1;
      g.P.forEach((p, j) => { if (isMafiaTeam(p[RO])) g.pm[p[U]] = ['pFg', j === i ? 1 : 0, g.fgM - g.fgU, g.fgM]; }); this.dirty = true; return true;
    }
    if (a.k === 'report') {
      const b = (g.bd || []).find(x => x[0] === t); if (!b || b[6] >= 0) return true;
      if (!this.near(i, [b[2], b[3]], b[4] ? 3 : 4.5)) return true;
      this.meeting('rep', i, b); return true;
    }
    if (a.k === 'call') {
      if ((g.cu || []).includes(i)) return true;
      const p = this.posOf(i); if (p && Math.hypot(p[0], p[1]) > 14) return true;
      g.cu = (g.cu || []).concat([i]); this.meeting('call', i, null); return true;
    }

    if (a.k === 'appraise' && r === 'A') {
      g.ac = g.ac || {}; if (this.used(uid, 'a') || (g.ac[uid] || 0) >= 3) return true;
      const key = String(a.s || ''); if (!(this.hist && this.hist[uid] && this.hist[uid][key])) return true;
      this.use(uid, 'a'); g.ac[uid] = (g.ac[uid] || 0) + 1;
      let lie = this.lies && this.lies[uid] && key in this.lies[uid] ? this.lies[uid][key] : 99;
      if (this.isFake(i)) lie = Math.random() < 0.5 ? -1 : Math.floor(Math.random() * 3);
      g.pm[uid] = ['pA', lie]; this.dirty = true; return true;
    }
    if (a.k === 'lock' && r === 'K') {
      g.kc = g.kc || {}; const h = this.w.homes && this.w.homes[t]; if (!h || !g.P[t] || (g.kc[uid] || 0) >= 2 || (g.lk || []).includes(t)) return true;
      if (!this.near(i, [h.doorOut.x, h.doorOut.z], 4) && !this.near(i, [h.sleep.x, h.sleep.z], 4)) return true;
      g.kc[uid] = (g.kc[uid] || 0) + 1; g.lk = (g.lk || []).concat([t]); g.pm[uid] = ['pKk', t, 2 - g.kc[uid]]; this.dirty = true; return true;
    }
    if (a.k === 'lamp' && r === 'L') {
      const lp = this.w.lampPos && this.w.lampPos[t]; if (!lp || this.used(uid, 'l')) return true;
      if (!this.near(i, [lp.x, lp.z], 4)) return true;
      this.use(uid, 'l'); g.lit = g.lit || {}; g.lit[i] = t; g.pm[uid] = ['pLs']; this.dirty = true; return true;
    }
    if (a.k === 'search' && r === 'Z') {
      g.zc = g.zc || {}; const hs = this.w.hideSpots && this.w.hideSpots[t]; if (!hs || (g.zc[uid] || 0) >= 3) return true;
      if (!this.near(i, [hs.x, hs.z], 4)) return true;
      g.zc[uid] = (g.zc[uid] || 0) + 1;
      const found = (g.bd || []).filter(b => b[4] && b[6] < 0 && Math.hypot(b[2] - hs.x, b[3] - hs.z) < 4);
      found.forEach(b => b[4] = 0);
      g.pm[uid] = found.length ? ['pZ1', hs.name] : ['pZ0', hs.name, this.hideTouched && this.hideTouched.has(t) ? 1 : 0];
      this.dirty = true; return true;
    }
    if (a.k === 'lure' && r === 'V') {
      if (this.used(uid, 'v')) return true; const p = this.posOf(i) || [0, 0];
      this.use(uid, 'v'); const id = 900 + Math.floor(Math.random() * 9000);
      g.cl = (g.cl || []).concat([[id, +p[0].toFixed(1), +p[1].toFixed(1)]]); this.fake.add(id); (this.lures = this.lures || new Set()).add(id);
      g.pm[uid] = ['pV']; this.dirty = true; return true;
    }
    if (a.k === 'bet' && r === 'I') {
      if (g.r > 2) return true; g.bet = g.bet || {}; g.bet[i] = t ? 'mafia' : 'town'; g.pm[uid] = ['pIb', g.bet[i]]; this.dirty = true; return true;
    }
    if (a.k === 'relic' && r === 'U') {
      const b = (g.bd || []).find(x => x[0] === t); if (!b || b[6] >= 0 || !this.near(i, [b[2], b[3]], 4)) return true;
      g.rel = g.rel || {}; if (b[1] >= 0) g.rel[i] = (g.rel[i] || 0) + 1;
      g.pm[uid] = ['pU', g.rel[i] || 0, g.P.length <= 11 ? 2 : 3];
      this.meeting('rep', i, b); return true;
    }
    if (a.k === 'stamp' && r === 'w') {
      const h = this.w.homes && this.w.homes[t]; if (!h || !g.P[t] || t === i) return true;
      g.stp = g.stp || {}; const mine = g.stp[i] || []; if (mine.includes(t)) return true;
      if (!this.near(i, [h.doorOut.x, h.doorOut.z], 4)) return true;
      const op = this.posOf(t);
      if (this.alive(t) && op && dist(op, [h.doorOut.x, h.doorOut.z]) < 9) { g.pm[uid] = ['pwx']; g.pm[g.P[t][U]] = ['pwn', i]; this.dirty = true; return true; }
      g.stp[i] = mine.concat([t]); g.pm[uid] = ['pw', t, g.stp[i].length]; this.dirty = true; return true;
    }
    if (a.k === 'medium' && r === 'E') {
      if (this.used(uid, 'm')) return true;
      const b = (g.bd || []).find(x => x[0] === t); if (!b || !this.near(i, [b[2], b[3]], 3.5)) return true;
      this.use(uid, 'm'); g.pm[uid] = b[1] >= 0 ? ['pM', b[1], b[7] ? 'C' : g.P[b[1]][RO]] : ['c0']; this.dirty = true; return true;
    }
    if (a.k === 'slay' && r === 'X') {
      if (this.used(uid, 'x') || t === i || !this.alive(t)) return true;
      const tp = this.posOf(t); if (tp && !this.near(i, tp, 3)) return true;
      this.use(uid, 'x'); this.attack(i, t, 'kil'); g.pm[uid] = ['pXd', t];
      const w = this.winCheck(); if (w) this.finish(w);
      return true;
    }
    if (a.k === 'oil' && r === 'F') {
      if (this.used(uid, 'f') >= 2 || t === i || !this.alive(t)) return true;
      const tp = this.posOf(t); if (tp && !this.near(i, tp, 3)) return true;
      g.oil = (g.oil || []).filter(j => this.alive(j)); if (g.oil.includes(t)) return true;
      this.use(uid, 'f'); g.oil.push(t); g.pm[uid] = ['pFd', t, g.oil.length]; this.dirty = true; return true;
    }
    if (a.k === 'dummy' && r === 'J') {
      if (me[FL] & 16) return true;
      const p = this.posOf(i) || [0, 0]; me[FL] |= 16;
      g.bd = (g.bd || []).concat([[this.bodyId(), -1, +p[0].toFixed(1), +p[1].toFixed(1), 0, Math.floor(Math.random() * 20), -1]]);
      g.pm[uid] = ['pJd']; this.dirty = true; return true;
    }
    return true;
  };
  // 의사: 밤, 의사 차례에 핏자국·시체 곁에서 치료 → 오늘 밤 쓰러진 사람이면 자기 집에서 깨어남
  P.reviveAt = function (i, t) {
    const g = this.g, uid = g.P[i][U], nc = g.nc;
    if (nc.used[i]) { g.pm[uid] = ['pDn']; this.dirty = true; return; }
    let v = -1;
    const b = (g.bd || []).find(x => x[0] === t), s = (g.st || []).find(x => x[3] === t);
    if (b && this.near(i, [b[2], b[3]], 3.5)) v = b[1];
    if (v < 0 && s && this.near(i, [s[0], s[1]], 3.5)) v = s[2];
    if (v < 0 && !b && !s) return;
    nc.used[i] = 1; nc.acts.push([i, 'revive', v]);
    if (v >= 0 && g.P[v][AL] === 2) {
      g.P[v][AL] = 1;
      g.bd = (g.bd || []).filter(x => x[1] !== v); g.st = (g.st || []).filter(x => x[2] !== v);
      g.pm[uid] = ['pD', v]; g.pm[g.P[v][U]] = ['pRv'];
      if (g.P[v][U].startsWith('bot')) { const h = this.w.homes[v]; const bb = this.bots.get(g.P[v][U]); if (bb && h) { bb.x = h.sleep.x; bb.z = h.sleep.z; } }
      nc.saved = (nc.saved || 0) + 1;
    } else g.pm[uid] = ['pD0'];
    this.dirty = true;
  };
  // 의사: 집 앞·집 안에서 치료 → 그 집 주인이 오늘 밤 쓰러졌다면 시체가 어디 있든 살아난다
  P.reviveHouse = function (i, h) {
    const g = this.g, uid = g.P[i][U], nc = g.nc, home = this.w.homes && this.w.homes[h];
    if (!home || !g.P[h]) return;
    if (nc.used[i]) { g.pm[uid] = ['pDn']; this.dirty = true; return; }
    const p = this.posOf(i);
    if (p && Math.min(dist(p, [home.sleep.x, home.sleep.z]), dist(p, [home.doorOut.x, home.doorOut.z])) > 5.5) return;
    nc.used[i] = 1; nc.acts.push([i, 'heal', h]); this.markOut(i, h);
    if (g.P[h][AL] === 2) {
      g.P[h][AL] = 1;
      g.bd = (g.bd || []).filter(x => x[1] !== h); g.st = (g.st || []).filter(x => x[2] !== h);
      g.pm[uid] = ['pD', h]; g.pm[g.P[h][U]] = ['pRv'];
      if (g.P[h][U].startsWith('bot')) { const bb = this.bots.get(g.P[h][U]); if (bb) { bb.x = home.sleep.x; bb.z = home.sleep.z; } }
      nc.saved = (nc.saved || 0) + 1;
    } else g.pm[uid] = ['pDh', h];
    this.dirty = true;
  };
  // 밤 외출·남의 집 방문 기록 (단서 재료)
  P.markOut = function (i, house) { this.out = this.out || new Set(); this.visit = this.visit || {}; this.out.add(i); if (house >= 0 && house !== i) (this.visit[i] = this.visit[i] || new Set()).add(house); };
  P.trackNight = function () {
    const g = this.g; if (g.ph !== 'night' || !this.w.houseAt) return;
    const lit = g.lit || {}, lamps = this.w.lampPos || [];
    g.P.forEach((p, i) => {
      if (p[AL] !== 1) return; const ps = this.posOf(i); if (!ps) return; const h = this.w.houseAt(ps[0], ps[1]); if (h !== i) this.markOut(i, h);
      for (const [who, li] of Object.entries(lit)) { const lp = lamps[li]; if (lp && +who !== i && Math.hypot(ps[0] - lp.x, ps[1] - lp.z) < 7) (this.lampSeen[li] = this.lampSeen[li] || new Set()).add(i); }
    });
  };
  P.giveClue = function (i, id, card) {
    const g = this.g, uid = g.P[i][U], key = g.r + '-' + id;
    g.ck[uid] = (g.ck[uid] || []).concat([[key, card]]);
    this.hist = this.hist || {}; (this.hist[uid] = this.hist[uid] || {})[key] = card;
    this.lies = this.lies || {}; (this.lies[uid] = this.lies[uid] || {})[key] = this._lastLie === undefined ? -1 : this._lastLie;
    this.dirty = true;
  };
  P.share = function (i, key) {
    const g = this.g, uid = g.P[i][U], card = this.hist && this.hist[uid] && this.hist[uid][key];
    g.shc = g.shc || {};
    if (!card || !card[2] || (g.shc[uid] || 0) >= 3) return;
    if ((g.sh || []).some(x => x[0] === uid + key)) return;
    g.shc[uid] = (g.shc[uid] || 0) + 1;
    g.sh = (g.sh || []).concat([[uid + key, i, card]]).slice(-5);
    this.log(['shared', i]); this.dirty = true;
  };
  // 단서 카드: 2~3문장. 가짜(마피아가 바꿔치기한) 카드는 한 문장이 거짓
  P.clueCard = function (i, fake) {
    const g = this.g, Pl = g.P, n = Pl.length, all = Pl.map((p, j) => j), others = all.filter(j => j !== i);
    const team = j => isMafiaTeam(Pl[j][RO]) ? 'm' : ROLES[Pl[j][RO]].team === 'neutral' ? 'n' : 't';
    const deck = [...new Set(Pl.map(p => p[RO]))];
    const out = this.lastOut, visit = this.lastVisit || {};
    const alv = others.filter(j => this.alive(j));
    const pool = alv.length >= 2 ? alv : others;
    const gens = {
      not: lie => { const a = rnd(pool), opts = deck.filter(r => r !== Pl[a][RO]); return ['sNot', a, lie ? Pl[a][RO] : rnd(opts.length ? opts : ROLE_ORDER)]; },
      nm: lie => { const cand = pool.filter(j => lie ? team(j) === 'm' : team(j) !== 'm'); if (!cand.length) return null; return ['sNM', rnd(cand), 0]; },
      neu: lie => { const a = rnd(pool), v = team(a) === 'n' ? 1 : 0; return ['sNeu', a, lie ? 1 - v : v]; },
      out: lie => { if (!out || g.r < 1) return null; const a = rnd(pool), v = out.has(a) ? 1 : 0; return ['sOut', a, lie ? 1 - v : v]; },
      vis: lie => { if (!out || g.r < 1) return null; const a = rnd(pool), v = visit[a] && visit[a].size ? 1 : 0; return ['sVis', a, lie ? 1 - v : v]; },
      same: lie => { if (pool.length < 2) return null; const [a, b] = shuffle(pool.slice()).slice(0, 2), v = team(a) === team(b) ? 1 : 0; return ['sSame', a, b, lie ? 1 - v : v]; },
      len: lie => { const a = rnd(pool), L = [...ROLES[Pl[a][RO]].name.replace(/\s/g, '')].length; return ['sLen', a, lie ? (L > 2 ? L - 1 : L + 1) : L]; },
      trio: lie => { if (pool.length < 3) return null; const t = shuffle(pool.slice()).slice(0, 3), k = t.filter(j => team(j) === 'm').length; return ['sTrio', t[0], t[1], t[2], lie ? (k ? k - 1 : 1) : k]; },
      role: lie => { const ro = rnd(deck.filter(r => r !== 'C')); if (!ro) return null; const v = Pl.some(p => p[RO] === ro && p[AL] === 1) ? 1 : 0; return ['sRole', ro, lie ? 1 - v : v]; },
      none: lie => { const abs = ROLE_ORDER.filter(r => r !== 'C' && !deck.includes(r)); if (lie) { const pr = deck.filter(r => r !== 'C'); return pr.length ? ['sNone', rnd(pr)] : null; } return abs.length ? ['sNone', rnd(abs)] : null; },
      hide: lie => { if (lie) return null; const h = (g.bd || []).find(b => b[4] && b[1] >= 0); return h && this.w.placeName ? ['sHide', this.w.placeName(h[2], h[3])] : null; },
    };
    const keys = shuffle(Object.keys(gens)), want = Math.random() < 0.45 ? 3 : 2, lieAt = fake ? Math.floor(Math.random() * want) : -1, st = [];
    for (const k of keys) { if (st.length >= want) break; const s = gens[k](st.length === lieAt); if (s) st.push(s); }
    this._lastLie = lieAt < st.length ? lieAt : -1;
    if (!st.length) st.push(['sNot', rnd(others), rnd(ROLE_ORDER)]);
    return ['cc', st, Math.random() < 0.6 ? 1 : 0];
  };
  // ── 개인 미션 (낮): 깨면 단서 카드 또는 단서 위치 힌트 ──
  P.newMission = function (i) {
    const g = this.g, uid = g.P[i][U], done = (this.msDone[uid] || 0); if (done >= 3) { delete g.ms[uid]; return; }
    const w = this.w, opts = [];
    if (w.hideSpots) { const h = rnd(w.hideSpots); opts.push(['go', h.x, h.z, h.name]); }
    if (w.lampPos) { const k = Math.floor(Math.random() * w.lampPos.length), l = w.lampPos[k]; opts.push(['go', l.x, l.z, `${k + 1}번 가로등`]); }
    if (w.homes) { const others = g.P.map((p, j) => j).filter(j => j !== i && j < w.homes.length); if (others.length) { const j = rnd(others), h = w.homes[j]; opts.push(['go', h.doorOut.x, h.doorOut.z, `${j + 1}번 집(${g.P[j][NM]}) 앞`]); } }
    if (w.bell) opts.push(['go', w.bell.x, w.bell.z + 1.2, '광장 소집 종']);
    const ppl = g.P.map((p, j) => j).filter(j => j !== i && this.alive(j));
    if (ppl.length) opts.push(['stay', rnd(ppl), 6]);
    const m = rnd(opts); g.ms[uid] = m.concat([done]); this.msP[uid] = 0; this.dirty = true;
  };
  P.missionTick = function (dt) {
    const g = this.g; if (g.ph !== 'day' || !g.ms) return;
    for (const [uid, m] of Object.entries(g.ms)) {
      const i = this.slotOf(uid); if (i < 0 || !this.alive(i)) continue;
      const p = this.posOf(i); if (!p) continue;
      let ok = false;
      if (m[0] === 'go') ok = Math.hypot(p[0] - m[1], p[1] - m[2]) < 2.6;
      else if (m[0] === 'stay') { const q = this.posOf(m[1]); if (!this.alive(m[1])) { this.newMission(i); continue; } if (q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 4) { this.msP[uid] = (this.msP[uid] || 0) + dt; if (this.msP[uid] >= m[2]) ok = true; } }
      if (!ok) continue;
      this.msDone[uid] = (this.msDone[uid] || 0) + 1;
      const left = (g.cl || []).filter(c => !(this.lures && this.lures.has(c[0])));
      if (Math.random() < 0.5 || !left.length) this.giveClue(i, 'm' + this.msDone[uid], this.clueCard(i, false));
      else { const c = rnd(left); this.giveClue(i, 'h' + this.msDone[uid], ['hint', this.w.placeName ? this.w.placeName(c[1], c[2]) : '어딘가']); }
      g.pm[uid] = ['msOk'];
      this.newMission(i);
    }
  };
  P.bodyId = function () { this.bid = (this.bid || Math.floor(Math.random() * 1000)) + 1; return this.bid; };

  // 습격: 방패꾼 → 버팀, 물귀신(밤) → 되살아나 습격자가 대신 쓰러짐, 그 외 → 쓰러짐 + 그 자리에 시체·핏자국
  P.attack = function (by, t, kind) {
    const g = this.g, v = g.P[t];
    if (kind === 'maf' && (g.lk || []).includes(t)) { g.P.forEach(p => { if (isMafia(p[RO])) g.pm[p[U]] = ['pKl', t]; }); this.dirty = true; return; }
    if (v[RO] === 'G' && !(v[FL] & 1)) { v[FL] |= 1; g.pm[g.P[by][U]] = ['pKa', t]; (g.nc.armor = g.nc.armor || []).push(t); if (kind === 'kil') this.log(['armor', t]); this.dirty = true; return; }
    if (kind === 'maf' && v[RO] === 'W' && !(v[FL] & 4)) { v[FL] |= 4; this.down(by); return; }
    this.down(t);
    if (kind === 'maf') g.P.forEach(p => { if (isMafia(p[RO])) g.pm[p[U]] = ['pKd', t]; });
  };
  P.down = function (t) {
    const g = this.g, p = this.posOf(t) || [0, 0];
    g.P[t][AL] = 2;
    const id = this.bodyId();
    g.bd = (g.bd || []).concat([[id, t, +p[0].toFixed(1), +p[1].toFixed(1), 0, g.P[t][CO], -1]]);
    g.st = (g.st || []).concat([[+p[0].toFixed(1), +p[1].toFixed(1), t, id]]);
    g.pm[g.P[t][U]] = ['down'];
    this.dirty = true;
  };
  // 시체 끌기/내려놓기 (밤, 마피아 팀 차례)
  P.drag = function (i, id) {
    const g = this.g, carrying = (g.bd || []).find(x => x[6] === i), p = this.posOf(i);
    if (carrying) {
      if (p) { carrying[2] = +p[0].toFixed(1); carrying[3] = +p[1].toFixed(1); }
      carrying[6] = -1; carrying[4] = this.w.nearHide && this.w.nearHide(carrying[2], carrying[3]) ? 1 : 0; this.touchHide(carrying[2], carrying[3]);
      this.dirty = true; return;
    }
    const b = (g.bd || []).find(x => x[0] === id); if (!b || b[6] >= 0 || b[1] < 0) return;
    if (p && dist(p, [b[2], b[3]]) > 3) return;
    b[6] = i; b[4] = 0; this.dirty = true;
  };
  P.touchHide = function (x, z) { const hs = this.w.hideSpots || []; hs.forEach((h, k) => { if (Math.hypot(h.x - x, h.z - z) < 3.5) (this.hideTouched = this.hideTouched || new Set()).add(k); }); };
  P.dropAll = function () {
    const g = this.g;
    for (const b of (g.bd || [])) if (b[6] >= 0) { const p = this.posOf(b[6]); if (p) { b[2] = +p[0].toFixed(1); b[3] = +p[1].toFixed(1); } b[6] = -1; b[4] = this.w.nearHide && this.w.nearHide(b[2], b[3]) ? 1 : 0; }
  };

  P.advanceNight3d = function () {
    const g = this.g;
    if (g.nts[g.nt] === 'maf') this.dropAll();
    if (g.nt < g.nts.length - 1) { g.nt++; this.turnStart = Date.now(); this.end = this.turnStart + this.turnSec() * 1000; this.botPlan = {}; this.dirty = true; return; }
    this.resolveNight3d();
  };
  P.resolveNight3d = function () {
    const g = this.g, nc = g.nc, Pl = g.P, lines = [['dawn3', g.r]];
    Pl.forEach((p, i) => { if (p[AL] === 2) p[AL] = 0; if (p[AL] === 0 && !(p[FL] & CONFIRMED)) { p[FL] |= CONFIRMED; lines.push(['kill', i, this.roleOf(i)]); } }); // 아침 사망 공개, 시체와 신고 기능은 유지
    const visitNow = this.visit || {};
    this.lastOut = this.out || new Set(); this.lastVisit = visitNow; this.out = new Set(); this.visit = {};
    const morningPm = {};
    if (nc.trk) { const [tr, tg] = nc.trk; if (Pl[tr]) morningPm[Pl[tr][U]] = ['pT', tg, this.isFake(tr) ? (Math.random() < 0.5 ? [Math.floor(Math.random() * Pl.length)] : []) : [...(visitNow[tg] || [])].filter(h => h < Pl.length)]; }
    for (const [who, li] of Object.entries(g.lit || {})) { const w = Pl[+who]; if (w && w[AL] === 1) morningPm[w[U]] = ['pL', this.isFake(+who) ? shuffle(Pl.map((q, j) => j).filter(j => j !== +who && this.alive(j))).slice(0, Math.floor(Math.random() * 3)) : shuffle([...((this.lampSeen || {})[li] || [])]).slice(0, 2)]; }
    g.lit = {};
    Pl.forEach((p, h) => {
      if (this.effRole(h) !== 'N' || p[AL] !== 1) return;
      if (this.isFake(h)) { morningPm[p[U]] = ['pN', Math.random() < 0.35 ? 1 : 0, Math.random() < 0.35 ? 1 : 0]; return; }
      const ring = h < 10 ? 0 : 10, L = ring + (h - ring + 9) % 10, Rr = ring + (h - ring + 1) % 10;
      const came = x => Object.entries(visitNow).some(([who, set]) => +who !== x && set.has(x));
      morningPm[p[U]] = ['pN', L < Pl.length && came(L) ? 1 : 0, Rr < Pl.length && came(Rr) ? 1 : 0];
    });
    g.lk = [];
    if (nc.bm >= 0 && this.alive(nc.bm)) { g.bm = nc.bm; this.lastBm = nc.bm; morningPm[Pl[nc.bm][U]] = ['pBv']; } else this.lastBm = -1;
    if (nc.saved) lines.push(['revived']);
    const fi = Pl.findIndex(p => p[RO] === 'F' && p[AL] === 1);
    if (fi >= 0 && nc.ig) {
      for (const t of (g.oil || []).filter(j => this.alive(j))) { Pl[t][AL] = 0; Pl[t][FL] |= CONFIRMED; lines.push(['burn', t, this.roleOf(t)]); }
      g.oil = [];
    }
    for (const t of (nc.armor || [])) lines.push(['armor', t]);
    if (nc.rp >= 0) { const rp = Pl.findIndex(p => p[RO] === 'R'); if (rp >= 0) Pl[rp][FL] |= 2; lines.push(['scoop', nc.rp, Pl[nc.rp][RO]]); }
    // 다음 낮 변장
    const qi = Pl.findIndex(p => p[RO] === 'Q' && p[AL] === 1);
    g.dg = qi >= 0 && nc.dq >= 0 && this.alive(nc.dq) ? { q: qi, t: nc.dq } : null;
    // 마피아의 집 (목격 단서용)
    g.kh = nc.kb >= 0 ? nc.kb : -1;
    const keep = {}; Pl.forEach(p => { const m = g.pm[p[U]]; if (m && (m[0] === 'down' || m[0] === 'pKd' || m[0] === 'pKa')) keep[p[U]] = m; });
    g.pm = keep;
    Pl.forEach((p, h) => {
      if (p[RO] !== 'H' || p[AL] !== 1) return;
      g.pm[p[U]] = ['hae', [...new Set((nc.acts || []).filter(x => x[2] === h && x[0] !== h).map(x => x[0]))]];
    });
    if (g.dg) g.pm[Pl[g.dg.q][U]] = ['pQon', g.dg.t];
    Object.assign(g.pm, morningPm);
    lines.slice(1).forEach(l => this.log(l));
    const w = this.winCheck(); if (w) { g.news = lines; this.finish(w); return; }
    this.phase('morning', Math.max(10, Math.min(25, lines.length * 3)), lines);
  };

  // ── 낮 ──
  P.startDay = function () {
    const g = this.g, n = g.P.filter(p => p[AL] === 1).length;
    g.cl = []; g.ck = {}; g.du = {}; g.cu = []; this.fake = new Set();
    const cnt = g.opt.exp ? Math.max(4, Math.ceil(n * 1.3)) : 0;
    for (let k = 0; k < cnt; k++) { const p = this.w.hiddenPoint ? this.w.hiddenPoint() : this.w.randomPoint(); g.cl.push([k + 1, +p.x.toFixed(1), +p.z.toFixed(1)]); }
    this.dayCalled = Date.now();
    g.ms = {}; this.msP = {}; this.msDone = {}; g.P.forEach((p, i) => { if (p[AL] === 1 && !p[U].startsWith('bot')) this.newMission(i); });
    this.phase('day', this.T().day, [['day', cnt]]);
  };
  P.meeting = function (kind, by, body) {
    const g = this.g; if (g.ph !== 'day') return;
    this.dropAll();
    this.dayLeft = Math.max(0, this.end - Date.now() - 30000);
    const lines = [];
    if (kind === 'rep') {
      const place = this.w.placeName ? this.w.placeName(body[2], body[3]) : '어딘가';
      const v = body[1];
      lines.push(['rep', by, v, v < 0 ? -1 : 0, place]);
      if (v < 0) lines.push(['repD']);
      else {
        const p = g.P[v], cold = p[AL] === 0; if (p[AL] === 2) p[AL] = 0;
        p[FL] |= CONFIRMED; lines.push([cold ? 'repCold' : 'repNew', v, this.roleOf(v)]);
        g.st = (g.st || []).filter(x => x[2] !== v);
      }
      g.bd = (g.bd || []).filter(x => x !== body);
      g.mt = { k: 'rep', by, v };
    } else { lines.push(['call', by]); g.mt = { k: 'call', by }; }
    lines.forEach(l => this.log(l));
    g.vo = []; g.vt = [];
    this.phase('discuss', this.T().disc, lines);
  };
  P.afterMeeting = function () {
    const g = this.g, w = this.winCheck(); if (w) { this.finish(w); return; }
    g.mt = null;
    if (this.dayLeft > 15000) { this.phase('day', this.dayLeft / 1000, [['dayGo']]); this.dayLeft = 0; }
    else this.startNight();
  };

  // 단서 (3D 탐색 모드)
  P.clueFor3d = function (i) {
    const g = this.g, r = Math.random();
    const hidden = (g.bd || []).filter(b => b[4] && b[1] >= 0);
    if (r < 0.1 && hidden.length && this.w.placeName) return ['cH', this.w.placeName(hidden[0][2], hidden[0][3])];
    if (r < 0.17 && g.kh >= 0 && g.P[g.kh]) return ['cK', `${g.kh + 1}번 집`];
    return this.clueFor(i);
  };
  P.fakeClue = function (i) {
    const g = this.g, al = g.P.map((p, j) => j).filter(j => this.alive(j) && j !== i);
    const maf = al.filter(j => isMafiaTeam(g.P[j][RO])), non = shuffle(al.filter(j => !isMafiaTeam(g.P[j][RO])));
    const r = Math.random();
    if (r < 0.4 && maf.length) return ['cS', rnd(maf)];
    if (r < 0.75 && non.length >= 2) return ['cP', non[0], non[1]];
    if (non.length >= 3) return ['cT', non[0], non[1], non[2], 1];
    return ['c0'];
  };

  // ── 봇 (3D 탐색 모드) ──
  P.route = function (b, tx, tz) {
    const w = this.w; if (!w.houseAt || !w.homes) return { x: tx, z: tz };
    const hb = w.houseAt(b.x, b.z), ht = w.houseAt(tx, tz);
    if (hb < 0) b.exiting = false;
    if (hb >= 0 && hb !== ht) { const h = w.homes[hb]; if (!b.exiting && Math.hypot(b.x - h.doorIn.x, b.z - h.doorIn.z) > 0.7) return h.doorIn; b.exiting = true; return h.doorOut; }
    if (ht >= 0 && hb !== ht) { const h = w.homes[ht]; if (!b.entering && Math.hypot(b.x - h.doorOut.x, b.z - h.doorOut.z) > 0.9) return h.doorOut; b.entering = true; return h.doorIn; }
    b.entering = false;
    return { x: tx, z: tz };
  };
  P.bots3d = function (now, dt) {
    const g = this.g; if (!this.isNew()) return;
    const Pl = g.P;
    if (g.ph === 'night') {
      // 밤: 봇은 자기 집에서 잠들어 있고, 자기 차례에 원격으로 행동한다 (그 시간엔 다른 사람은 잠들어 있다)
      Pl.forEach((p, i) => {
        if (!p[U].startsWith('bot') || !this.alive(i) || !this.inTurn(i)) return;
        const key = this.pk + i; if (this.botPlan[key] === undefined) this.botPlan[key] = now + 2500 + Math.random() * 5000;
        if (!this.botPlan[key] || now < this.botPlan[key]) return; this.botPlan[key] = 0;
        const others = Pl.map((q, j) => j).filter(j => j !== i && this.alive(j));
        const r = p[RO];
        if (r === 'M' && !g.nc.done) {
          const prey = others.filter(j => !isMafia(Pl[j][RO]) && Pl[j][RO] !== 'X'); if (!prey.length) return;
          const t = rnd(prey), tp = this.posOf(t), b = this.bots.get(p[U]);
          if (b && tp) { b.x = tp[0] + 0.6; b.z = tp[1]; }
          this.act3d(i, { k: 'kill', t });
          if (Math.random() < 0.45) { const body = (g.bd || []).find(x => x[1] === t); const hs = this.w.hideSpots; if (body && hs && hs.length) { const h = hs.reduce((a, c) => Math.hypot(c.x - body[2], c.z - body[3]) < Math.hypot(a.x - body[2], a.z - body[3]) ? c : a); body[2] = +(h.x + 1.2).toFixed(1); body[3] = +h.z.toFixed(1); body[4] = 1; } }
          if (b) { const h = this.w.homes[i]; if (h) { b.x = h.sleep.x; b.z = h.sleep.z; } }
          this.markOut(i, t);
        } else if (r === 'D') {
          const v = Pl.findIndex(q => q[AL] === 2);
          const h = v >= 0 && Math.random() < 0.55 ? v : rnd(others.concat([i]));
          if (h !== undefined) this.reviveHouse(i, h);
        } else if (r === 'F') { const oil = (g.oil || []).filter(j => this.alive(j)); if (oil.length >= 2 && Math.random() < 0.6) this.act3d(i, { k: 'ignite' }); }
        else if (r === 'S') { const t = rnd(others); this.markOut(i, t); this.act(i, { k: 'spy', t }); }
        else if (r === 'B') { const c = others.filter(j => !((g.kn || {})[i] || []).includes(j)); if (c.length) { const t = rnd(c); this.markOut(i, t); this.act3d(i, { k: 'blk', t }); } }
        else if (r === 'T') { const t = rnd(others); this.act3d(i, { k: 'track', t }); }
        else if (r === 'k') { const t = rnd(others); if (t !== undefined && t < (this.w.homes || []).length) this.act3d(i, { k: 'watch', t }); }
        else if (r === 'b' && others.length >= 2) { const [x, y] = shuffle(others.slice()).slice(0, 2); this.act3d(i, { k: 'bond', t: x }); this.act3d(i, { k: 'bond', t: y }); }
        else if (r === 'Q') { const t = rnd(others); this.markOut(i, t); this.act(i, { k: 'copy', t }); }
        else if (r === 'P') { const t = rnd(others); this.markOut(i, t); this.act(i, { k: 'inv', t }); }
        else if (r === 'R' && g.r >= 2 && Math.random() < 0.4) { const t = rnd(others); this.markOut(i, t); this.act(i, { k: 'scoop', t }); }
      });
      return;
    }
    if (g.ph !== 'day') return;
    // 낮: 단서 줍기·바꿔치기, 시체 신고, 소집, 치료, 낮 처치
    const elapsed = 1 - Math.max(0, this.end - now) / (this.T().day * 1000);
    Pl.forEach((p, i) => {
      if (!p[U].startsWith('bot') || !this.alive(i)) return;
      const b = this.bots.get(p[U]); if (!b) return;
      const me = [b.x, b.z], r = p[RO], maf = isMafiaTeam(r);
      b.cool = (b.cool || 0) - dt; if (b.cool > 0) return;
      for (const body of (g.bd || [])) {
        if (body[6] >= 0) continue;
        const d = dist(me, [body[2], body[3]]);
        if (d < (body[4] ? 1.8 : 6)) {
          b.seen = b.seen || {}; if (b.seen[body[0]]) continue; b.seen[body[0]] = 1;
          if (Math.random() < (maf ? 0.25 : 0.8)) { b.tx = body[2]; b.tz = body[3]; b.wantRep = body[0]; }
        }
        if (b.wantRep === body[0] && d < 3) { b.wantRep = 0; this.act3d(i, { k: r === 'U' ? 'relic' : 'report', t: body[0] }); return; }
      }
      if (r === 'X' && !this.used(p[U], 'x') && elapsed > 0.2) { const v = Pl.map((q, j) => j).find(j => j !== i && this.alive(j) && this.posOf(j) && dist(me, this.posOf(j)) < 1.6); if (v !== undefined && Math.random() < 0.08) { this.act3d(i, { k: 'slay', t: v }); b.cool = 3; return; } }
      if (r === 'F' && this.used(p[U], 'f') < 2) { const v = Pl.map((q, j) => j).find(j => j !== i && this.alive(j) && this.posOf(j) && dist(me, this.posOf(j)) < 1.8 && !(g.oil || []).includes(j)); if (v !== undefined && Math.random() < 0.05) { this.act3d(i, { k: 'oil', t: v }); b.cool = 3; } }
      if (r === 'J' && !(p[FL] & 16) && Math.random() < 0.002) this.act3d(i, { k: 'dummy' });
      if (maf && (g.fgU || 0) < (g.fgM || 0) && Math.random() < 0.4) { const c = (g.cl || []).find(c => dist(me, [c[1], c[2]]) < 1.5); if (c && Math.random() < 0.5) { this.act3d(i, { k: 'forge', t: c[0] }); b.cool = 2; } }
      if (elapsed > 0.55 && !(g.cu || []).includes(i) && Math.random() < 0.0015 * dt * 60) {
        const h = Math.hypot(b.x, b.z); if (h < 13) this.act3d(i, { k: 'call' }); else if (!b.toBell) { b.toBell = 1; b.tx = this.w.bell ? this.w.bell.x : 0; b.tz = this.w.bell ? this.w.bell.z + 1.5 : 6; b.wait = 0; }
      }
    });
  };
  P.botTarget3d = function (b, id) {
    // 낮 탐색: 단서 1개까지 줍기, 그 뒤엔 마을을 거닐기
    const g = this.g, slot = this.slotOf(id);
    if (g.ph !== 'day' || slot < 0 || !this.alive(slot)) return;
    if ((g.ck[id] || []).length < 2 && g.cl.length && !b.wantRep) {
      let best = null, bd = 1e9; for (const c of g.cl) { const d = Math.hypot(c[1] - b.x, c[2] - b.z); if (d < bd) { bd = d; best = c; } }
      if (best) { b.tx = best[1]; b.tz = best[2]; b.wait = 0; if (bd < 1.4) this.act3d(slot, { k: 'clue', t: best[0] }); }
    }
  };
}
