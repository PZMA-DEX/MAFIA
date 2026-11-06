// 멀티플레이 연결 — 세 가지 방식 중 되는 것을 자동으로 고른다.
//  1) Firebase Realtime Database (js/config.js 에 값이 있으면) — 직접 호스팅해서 친구들과 할 때
//  2) Claude 아티팩트 room — claude.ai 링크로 열었을 때
//  3) 이 기기 안의 탭끼리(BroadcastChannel) — 연결이 없을 때. 봇과 혼자 하거나 탭 여러 개로 테스트
//
// 모든 방식이 같은 모델을 쓴다: 각자 자기 "presence"를 키별로 갖고 있고(m: 움직임, s: 상태),
// 다른 사람의 presence를 받아서 화면을 그린다. 게임 판정은 방장(가장 먼저 들어온 사람)이 한다.
import { FIREBASE_CONFIG } from './config.js';

const MAX_BYTES = 3900;

export async function connect(roomName, uid, onPeers, onStatus) {
  const safe = ('m-' + String(roomName).toLowerCase().replace(/[^a-z0-9_.-]/g, '')).slice(0, 40);
  if (FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL) {
    try { return await firebaseBackend(safe, uid, onPeers, onStatus); }
    catch (e) { console.warn('firebase 실패', e); }
  }
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const room = await Promise.race([window.claude.use('room'), new Promise(r => setTimeout(() => r(null), 7000))]);
      if (room) return await artifactBackend(room, safe, uid, onPeers, onStatus);
    } catch (e) { console.warn('room 실패', e); }
  }
  return localBackend(safe, uid, onPeers, onStatus);
}

function bytes(o) { return new Blob([JSON.stringify(o)]).size; }

// ───────── Claude 아티팩트 room ─────────
async function artifactBackend(room, name, uid, onPeers, onStatus) {
  const r = await room.join(name);
  const mine = { u: uid };
  r.onPeers(ch => {
    const list = [];
    for (const p of ch.peers) {
      const pr = p.presence || {};
      if (!pr.u) continue;
      list.push({ uid: p.sameTab ? uid : String(pr.u), m: pr.m, s: pr.s, isMe: p.sameTab });
    }
    onPeers(list);
  }, e => onStatus && onStatus('끊김: ' + e.code));
  r.onConnection(c => onStatus && onStatus(c ? 'online' : 'reconnecting'));
  await r.presence({ u: uid });
  return {
    kind: 'room', label: 'Claude 링크 멀티플레이',
    set(patch) {
      Object.assign(mine, patch);
      if (bytes(mine) > MAX_BYTES) { console.warn('presence too big', bytes(mine)); return; }
      r.presence(patch).catch(e => console.warn('presence', e));
    },
    leave() { r.leave(); },
  };
}

// ───────── Firebase Realtime Database ─────────
async function firebaseBackend(name, uid, onPeers, onStatus) {
  const V = '10.12.2';
  const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const D = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
  const app = A.initializeApp(FIREBASE_CONFIG);
  const db = D.getDatabase(app);
  const base = `mafia3d/${name}`;
  const peers = new Map();
  let pending = false;
  const emit = () => {
    if (pending) return; pending = true;
    requestAnimationFrame(() => {
      pending = false;
      onPeers([...peers.values()].map(p => ({ ...p, isMe: p.uid === uid })));
    });
  };
  for (const key of ['m', 's']) {
    const r = D.ref(db, `${base}/${key}`);
    const up = snap => {
      const id = snap.key; let v = null;
      try { v = JSON.parse(snap.val()); } catch (e) { return; }
      const p = peers.get(id) || { uid: id };
      p[key] = v; peers.set(id, p); emit();
    };
    D.onChildAdded(r, up); D.onChildChanged(r, up);
    D.onChildRemoved(r, snap => {
      const p = peers.get(snap.key); if (!p) return;
      delete p[key]; if (!p.m && !p.s) peers.delete(snap.key); emit();
    });
  }
  for (const key of ['m', 's']) D.onDisconnect(D.ref(db, `${base}/${key}/${uid}`)).remove();
  D.onValue(D.ref(db, '.info/connected'), s => onStatus && onStatus(s.val() ? 'online' : 'reconnecting'));
  return {
    kind: 'firebase', label: '온라인 멀티플레이 (Firebase)',
    set(patch) {
      for (const k of Object.keys(patch)) {
        const s = JSON.stringify(patch[k]);
        if (s.length > 6000) { console.warn('too big', k); continue; }
        D.set(D.ref(db, `${base}/${k}/${uid}`), s);
      }
    },
    leave() { for (const k of ['m', 's']) D.remove(D.ref(db, `${base}/${k}/${uid}`)); },
  };
}

// ───────── 같은 기기 탭끼리 ─────────
function localBackend(name, uid, onPeers, onStatus) {
  const bc = ('BroadcastChannel' in window) ? new BroadcastChannel('mafia3d-' + name) : null;
  const mine = { u: uid };
  const peers = new Map();
  const emit = () => onPeers([{ uid, m: mine.m, s: mine.s, isMe: true }, ...[...peers.values()]]);
  const post = msg => { try { bc && bc.postMessage(msg); } catch (e) { } };
  if (bc) bc.onmessage = ev => {
    const d = ev.data || {}; if (!d.u || d.u === uid) return;
    if (d.bye) { peers.delete(d.u); emit(); return; }
    if (d.hello) post({ u: uid, m: mine.m, s: mine.s, full: 1 });
    const p = peers.get(d.u) || { uid: d.u, isMe: false };
    if ('m' in d) p.m = d.m; if ('s' in d) p.s = d.s;
    p.seen = Date.now(); peers.set(d.u, p); emit();
  };
  post({ u: uid, hello: 1 });
  setInterval(() => {
    post({ u: uid, m: mine.m, s: mine.s });
    const now = Date.now(); let ch = false;
    for (const [k, p] of peers) if (now - p.seen > 5000) { peers.delete(k); ch = true; }
    if (ch) emit();
  }, 1000);
  addEventListener('pagehide', () => post({ u: uid, bye: 1 }));
  setTimeout(() => { onStatus && onStatus('online'); emit(); }, 50);
  return {
    kind: 'local', label: '이 기기 전용 (탭끼리 + 봇)',
    set(patch) { Object.assign(mine, patch); post({ u: uid, ...patch }); emit(); },
    leave() { post({ u: uid, bye: 1 }); bc && bc.close(); },
  };
}
