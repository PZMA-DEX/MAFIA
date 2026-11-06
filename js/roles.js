// 직업 정의 — 클래식(마피아42식) + 한밤 모드(한밤의 늑대인간식)

export const COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#00acc1', '#f06292',
  '#6d4c41', '#eeeeee', '#546e7a', '#c0ca33', '#3949ab', '#26a69a', '#ff7043', '#ab47bc',
  '#7cb342', '#ffca28', '#5c6bc0', '#212121',
];
export const COLOR_NAMES = ['빨강', '파랑', '초록', '노랑', '주황', '보라', '청록', '분홍', '갈색', '하양',
  '회색', '라임', '남색', '민트', '살구', '자주', '연두', '금색', '하늘', '검정'];
export const HATS = ['없음', '중절모', '왕관', '리본', '헬멧', '새싹'];

// ───────── 클래식 모드 ─────────
// desc: 온라인(3D 탐색) 규칙, off: 오프라인·목록 모드에서 달라지는 점
// day: 낮 행동, night: 밤 행동(자기 차례에 대상 곁에서 E)
export const ROLES = {
  // 마피아 팀
  M: { name: '마피아', team: 'mafia', icon: '🔪', night: 'kill', verb: '처치하기',
    desc: '밤, 마피아 차례에 남의 집에 숨어들어 잠든 사람 곁에서 E로 처치해요(마피아끼리 하룻밤 1명). 다른 마피아와는 서로 알고 밤에 채팅할 수 있지만, 보조 직업이 누군지는 몰라요. 쓰러진 시체를 E로 끌고 가 덤불·상자·우물·건초 더미 곁에 내려놓으면 숨겨져요. 낮에는 죽일 수 없고, 숨은 단서를 가짜로 바꿔치기(마피아 팀 전체가 한 게임에 2~3번, 판 설정에 따라 없음)하며 함께 찾는 척 연기해요. 칼잡이는 죽일 수 없어요.',
    off: '오프라인: 밤에 목록에서 처치할 사람을 골라요.',
    win: '마피아 팀(보조 포함) 수가 나머지 이상이 되고, 칼잡이·방화범이 모두 죽으면 승리. 마피아가 모두 잡히면 보조가 살아 있어도 패배' },
  S: { name: '밀정', team: 'mafia', icon: '🕵️', night: 'spy', verb: '정체 엿보기',
    desc: '보조 차례에 잠든 사람 곁에서 E로 정확한 직업을 알아내요(밤마다 1번). 마피아가 누군지 모르고 채팅도 못 하지만, 엿본 사람이 마피아면 그때부터 알게 돼요. 경찰 조사에는 "마피아 아님"으로 나와요. 낮엔 단서 바꿔치기를 할 수 있어요.', win: '마피아 팀과 함께 승리' },
  // 마을 사람들
  P: { name: '경찰', team: 'town', icon: '🚓', night: 'inv', verb: '조사하기',
    desc: '조사 차례에 잠든 사람 곁에서 E로 조사하면 마피아인지 바로 알려 줘요. 보조 직업과 중립은 "마피아 아님"으로 나와요.', win: '마피아(보조 제외)와 칼잡이·방화범이 모두 사라지면 승리' },
  D: { name: '의사', team: 'town', icon: '💉', night: 'revive', verb: '치료하기',
    desc: '밤의 마지막, 의사 차례에 한 집(내 집 포함)을 찾아가 집 앞이나 집 안에서 E로 치료해요(밤마다 1번). 그 집 주인이 오늘 밤 습격당해 쓰러졌다면, 시체가 어디 숨겨져 있든 사라지고 자기 집에서 깨어나요. 아니면 아무 일도 없어요. 아침이 오면 늦어요!',
    off: '오프라인: 밤에 한 명을 골라 지켜요. 그 사람이 습격당하면 살아나요.', win: '마을 사람들과 함께 승리' },
  G: { name: '방패꾼', team: 'town', icon: '🛡️', tier: 'protect', night: null,
    desc: '마피아나 칼잡이의 공격을 딱 한 번 버텨요. 불은 못 막아요.', win: '마을 사람들과 함께 승리' },
  O: { name: '이장', team: 'town', icon: '👑', tier: 'vote', night: null,
    desc: '회의의 지목 투표와 찬반 투표에서 내 표가 2표로 계산돼요.', win: '마을 사람들과 함께 승리' },
  E: { name: '무녀', team: 'town', icon: '🔔', tier: 'info', day: 'medium', verb: '넋 읽기',
    desc: '낮에 시체 곁에서 E로 넋을 읽어 그 사람의 직업을 알아내요(하루 1번). 밤에는 유령들의 대화를 엿들어요.',
    off: '오프라인: 밤마다 죽은 사람 한 명의 직업을 알아내요.', win: '마을 사람들과 함께 승리' },
  R: { name: '소식꾼', team: 'town', icon: '📜', tier: 'info', night: 'scoop', once: true, verb: '취재하기',
    desc: '둘째 밤부터 딱 한 번, 조사 차례에 잠든 사람 곁에서 E로 취재하면 다음 날 아침 그 사람의 직업이 모두에게 알려져요.', win: '마을 사람들과 함께 승리' },
  H: { name: '돌지킴이', team: 'town', icon: '🗿', tier: 'info', night: null,
    desc: '밤사이 나에게 능력을 쓴 사람(처치 시도·조사·모습 훔치기 등)이 누구인지 아침에 알게 돼요. 어떤 능력이었는지는 몰라요.', win: '마을 사람들과 함께 승리' },
  C: { name: '주민', team: 'town', icon: '🧑', night: null,
    desc: '특별한 능력은 없지만 누구보다 열심히 단서를 찾고 시체를 신고할 수 있어요. 소집과 투표로 마피아 팀을 몰아내세요.', win: '마을 사람들과 함께 승리' },
  // 중립 (중립)
  J: { name: '어릿광대', team: 'neutral', icon: '🃏', day: 'dummy', verb: '가짜 시체 놓기',
    desc: '회의에서 처형당하면 그 즉시 혼자 승리하고 게임이 끝나요. 게임 중 한 번, 낮에 서 있는 자리에 가짜 시체를 놓을 수 있어요. 누군가 신고하면 회의가 열려요 — 의심을 받아 보세요!', win: '처형당하면 단독 승리' },
  X: { name: '칼잡이', team: 'neutral', icon: '🗡️', night: 'slay', verb: '처치하기',
    desc: '밤, 칼잡이 차례에 남의 집에 숨어들어 잠든 사람을 처치해요(하룻밤 1명, 마피아와 따로). 마피아는 나를 죽일 수 없어요. 모두를 적으로 돌리고 끝까지 살아남으세요.', off: '오프라인: 밤에 목록에서 골라요.', win: '최후의 1~2인으로 살아남으면 단독 승리' },
  F: { name: '방화범', team: 'neutral', icon: '🔥', day: 'oil', night: 'ignite', verb: '기름 붓기',
    desc: '낮에 사람 곁에서 E로 몰래 기름을 부어요(하루 2번, 상대는 몰라요). 밤, 방화범 차례에 E를 누르면 기름 묻은 사람이 모두 불타요(의사가 지킨 사람은 무사해요).', off: '오프라인: 밤마다 기름을 붓거나 점화해요.', win: '최후의 1~2인으로 살아남으면 단독 승리' },
  // ── 새 마피아 보조 직업 ──
  B: { name: '협박꾼', team: 'mafia', icon: '🤐', night: 'blk', verb: '협박 편지 넣기', sup: 1,
    desc: '보조 차례에 잠든 사람 곁에서 E로 협박 편지를 넣어요(밤마다 1명, 같은 사람 연속 불가). 마피아가 누군지 모르지만, 편지를 넣으려던 사람이 마피아면 알게 되고 편지는 거둬들여요. 그 사람은 다음 날 회의의 모든 투표에서 표가 세지지 않아요(본인만 알아요). 낮엔 단서 바꿔치기도 할 수 있어요.', win: '마피아 팀과 함께 승리' },
  Y: { name: '청소부', team: 'mafia', icon: '🧹', night: 'clean', verb: '흔적 지우기', sup: 1, only3d: 1,
    desc: '보조 차례에 시체나 핏자국 곁에서 E로 흔적을 지워요(게임당 2번). 마피아가 누군지 몰라요. 핏자국이 사라지고, 무녀가 그 시체의 넋을 읽으면 「주민」으로 보여요. 낮엔 단서 바꿔치기도 할 수 있어요.', win: '마피아 팀과 함께 승리' },
  V: { name: '미끼꾼', team: 'mafia', icon: '🪤', day: 'lure', verb: '가짜 단서 숨기기', sup: 1, only3d: 1,
    desc: '낮에 하루 1번, 서 있는 자리에 가짜 단서를 숨겨요. 주운 사람은 거짓이 섞인 카드를 받고, 마피아 팀은 누가 주웠는지 알게 돼요. 마피아가 누군지는 몰라요. 바꿔치기 횟수와는 별개라, 바꿔치기가 없는 판에서도 쓸 수 있어요.', win: '마피아 팀과 함께 승리' },
  // ── 새 시민 직업 ──
  A: { name: '감정사', team: 'town', icon: '🔍', day: 'appraise', verb: '단서 감정', tier: 'info', only3d: 1,
    desc: '📒 수첩에서 내가 주운 단서 카드를 감정하면, 거짓 문장이 몇 번째인지(또는 모두 진실인지) 알려 줘요. 하루 1번, 게임당 3번.', win: '마을 사람들과 함께 승리' },
  K: { name: '자물쇠장이', team: 'town', icon: '🔒', day: 'lock', verb: '문 잠그기', tier: 'protect', only3d: 1,
    desc: '낮에 아무 집(내 집 포함) 문 앞에서 E로 문을 잠가요. 그날 밤 그 집 주인을 노린 처치는 실패해요. 게임당 2번.', win: '마을 사람들과 함께 승리' },
  T: { name: '추적자', team: 'town', icon: '👣', night: 'track', verb: '미행 표시하기', tier: 'info', only3d: 1,
    desc: '조사 차례에 잠든 사람 곁에서 E로 미행 표시를 해요. 아침에 그 사람이 그날 밤 들어간 집들을 알려 줘요(밤마다 1명).', win: '마을 사람들과 함께 승리' },
  L: { name: '등불지기', team: 'town', icon: '🏮', day: 'lamp', verb: '가로등 밝히기', tier: 'info', only3d: 1,
    desc: '낮에 광장 가로등 곁에서 E로 불을 밝혀 둬요(하루 1번). 그날 밤 그 가로등 근처(7m)를 지나간 사람 이름을 아침에 최대 2명까지 알려 줘요.', win: '마을 사람들과 함께 승리' },
  Z: { name: '수색꾼', team: 'town', icon: '🔦', day: 'search', verb: '수색하기', tier: 'info', only3d: 1,
    desc: '낮에 덤불·상자·건초·우물 곁에서 E로 수색해요(게임당 3번). 숨긴 시체가 있으면 드러나고, 없으면 최근 누가 손댄 흔적이 있는지 알려 줘요.', win: '마을 사람들과 함께 승리' },
  N: { name: '이웃사촌', team: 'town', icon: '🏠', night: null, tier: 'info', only3d: 1,
    desc: '내 양옆 두 집에 밤사이 손님(집주인이 아닌 사람)이 들어오면 아침에 왼쪽·오른쪽 어느 집이었는지 알려 줘요. 누구인지는 몰라요.', win: '마을 사람들과 함께 승리' },
  // ── 새 중립 직업 ──
  I: { name: '도박꾼', team: 'neutral', icon: '🎲', day: 'bet',
    desc: '마을 사람들과 마피아 팀 중 한쪽에 몰래 걸어요(둘째 날 낮까지 바꿀 수 있고, 안 고르면 무작위). 경찰 조사엔 "마피아 팀 아님"으로 나와요.', win: '살아서, 내가 건 쪽이 이기면 함께 승리' },
  U: { name: '도굴꾼', team: 'neutral', icon: '⚱️', day: 'relic', only3d: 1,
    desc: '낮에 시체 곁에서 E로 유품을 챙겨요(시체마다 1번, 숨긴 시체도 가능). 유품을 챙기면 그 시체는 자동으로 신고돼요.', win: '유품을 11명 이하 판은 2개, 12명 이상 판은 3개 모으면 함께 승리(죽어도 인정)' },
  k: { name: '잠복꾼', team: 'town', icon: '🔭', night: 'watch', verb: '잠복하기', tier: 'info', only3d: 1,
    desc: '조사 차례에 아무 집 앞(또는 집 안)에서 E로 잠복해요(밤마다 1번). 오늘 밤 그 집에 집주인 말고 몇 명이 드나들었는지, 그리고 그중 한 명의 옷 색깔을 바로 알려 줘요. 이름은 몰라요.', win: '마을 사람들과 함께 승리' },
  b: { name: '인연술사', team: 'town', icon: '🔗', night: 'bond', verb: '인연의 실 묶기', tier: 'info', only3d: 1,
    desc: '조사 차례에 잠든 두 사람에게 차례로 E를 눌러 실을 묶어요(밤마다 1쌍). 두 사람이 같은 편인지 다른 편인지 바로 알려 줘요. 편은 마을 / 마피아 팀(보조 포함) / 중립으로 나눠요.', win: '마을 사람들과 함께 승리' },
  q: { name: '몽상가', team: 'neutral', icon: '🌫️', night: null,
    desc: '자기가 다른 마을 직업(경찰·추적자·등불지기·이웃사촌·감정사·잠복꾼·인연술사 중 하나)이라고 굳게 믿고 있어요. 그 직업처럼 능력을 쓰지만 결과는 엉터리예요. 본인은 게임이 끝나거나 죽기 전까지 진짜 정체를 몰라요. 경찰 조사엔 "마피아 팀 아님".', win: '끝까지 살아남으면 이긴 쪽과 함께 승리' },
  W: { name: '물귀신', team: 'neutral', icon: '🌊', night: null,
    desc: '밤에 처음 습격당하면 되살아나고, 나를 습격한 자가 대신 쓰러져요(한 번만). 처형은 막지 못해요.', win: '게임이 끝날 때 살아 있으면 이긴 쪽과 함께 승리' },
};
// 역할별 밤 차례 (이 판에 그 직업이 있으면, 죽었어도 차례는 돌아간다 — 누가 죽었는지 티 나지 않게)
export const TURNS = {
  maf: { name: '마피아의 시간', icon: '🔪', roles: ['M'], say: '마피아' },
  sup: { name: '보조의 시간', icon: '🕵️', roles: ['S', 'B', 'Y'], say: '마피아 보조' },
  kil: { name: '칼잡이의 시간', icon: '🗡️', roles: ['X'], say: '칼잡이' },
  pyro: { name: '방화범의 시간', icon: '🔥', roles: ['F'], say: '방화범' },
  inv: { name: '조사의 시간', icon: '🚓', roles: ['P', 'R', 'E', 'T', 'k', 'b'], say: '조사 직업들' },
  doc: { name: '의사의 시간', icon: '💉', roles: ['D'], say: '의사' },
};
// 밤 차례 시간: 누가 맡든, 일찍 끝내든 똑같이 고정 (넘기기 불가) — 마피아 차례만 처치·시체 옮기기 때문에 조금 길게
export const NIGHT_TURN = 45, NIGHT_MAF = 60;
export const TURN_ORDER = ['maf', 'sup', 'kil', 'pyro', 'inv', 'doc'];         // 오프라인·목록 모드
export const TURN_ORDER_3D = ['maf', 'sup', 'kil', 'pyro', 'inv', 'doc'];
export const ROLE_ORDER = ['M', 'S', 'B', 'Y', 'V', 'P', 'D', 'G', 'K', 'O', 'E', 'R', 'H', 'T', 'L', 'Z', 'N', 'A', 'k', 'b', 'C', 'J', 'X', 'F', 'W', 'I', 'U', 'q'];
export const TEAM_NAME = { town: '마을 사람들', mafia: '마피아 팀', neutral: '중립', wolf: '늑대인간 팀', village: '마을 팀', tanner: '무두장이' };
export const isMafiaTeam = r => !!ROLES[r] && ROLES[r].team === 'mafia';
// 진짜 마피아(보조 제외): 서로 알고, 밤 채팅을 하고, 시민은 이들만 다 잡으면 이긴다
export const isMafia = r => r === 'M';
export const isSupport = r => isMafiaTeam(r) && r !== 'M';

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export { shuffle };

// n명일 때 직업 구성 (opt.maf: 0=자동, opt.neu: 0 없음 / 2 랜덤, opt.dr: 1 몽상가 넣기 / 0 빼기)
// 인원 단계: 7명 이하 1 / 8~11명 2 / 12~19명 3 / 20명 4 — 마피아 팀과 중립이 같은 단계를 따른다
export const tierCount = n => n <= 7 ? 1 : n <= 11 ? 2 : n <= 19 ? 3 : 4;
export function mafCount(n, opt = {}) { const m = opt.maf || tierCount(n); return Math.max(1, Math.min(m, Math.floor((n - 1) / 2))); }
// 중립 인원 = 마피아 팀과 같은 단계. 몽상가 넣기면 그중 1자리는 몽상가
export const supCount = n => n >= 8 ? 1 : 0;
export function neuCount(n, opt = {}) {
  const neuMode = opt.neu === undefined ? 2 : opt.neu;
  if (neuMode === 0) return 0;
  return Math.min(tierCount(n), Math.max(0, n - mafCount(n, opt) - supCount(n) - 2));
}
export const isHostile = r => r === 'X' || r === 'F';
// 구성 규칙
//  마피아: 7명 이하 1 / 8~11명 2 / 12~19명 3 / 20명 4 · 보조 직업은 이와 별도로 8명부터 1명(랜덤)
//  보조는 마피아와 서로 모르고 채팅도 못 함. 밀정·협박꾼이 밤에 마피아에게 능력을 쓰면 그 사람이 마피아인 걸 알게 됨
//  중립: 마피아 팀과 같은 수 (랜덤, 7명 이하 판엔 칼잡이·방화범 제외, 위험 중립은 한 판에 1명)
//  시민: 경찰(4명~)·의사(5명~) 고정, 나머지는 정보 → 보호 → 투표 순으로 돌며 랜덤, 12명 미만은 보호형 1개까지
//  주민은 8명 이하 1명, 그 이상 최대 2명 (시민 수 ÷ 5)
//  opt.is3d=false(오프라인·간단 규칙)면 3D 이동이 필요한 직업은 빠진다 · opt.neu: 0 없음 / 1 어릿광대만 / 2 랜덤
export function classicDeck(n, opt = {}) {
  const is3d = opt.is3d !== false;
  const ok = r => is3d || !ROLES[r].only3d;
  const maf = mafCount(n, opt);
  const dr = opt.dr === undefined ? 1 : opt.dr;
  const neu = neuCount(n, opt);
  const deck = [];
  for (let i = 0; i < maf; i++) deck.push('M');
  if (n >= 8) { const sup = ROLE_ORDER.filter(r => ROLES[r].sup || r === 'S').filter(ok); deck.push(sup[Math.floor(Math.random() * sup.length)]); }
  const neuPool = shuffle(ROLE_ORDER.filter(r => ROLES[r].team === 'neutral' && r !== 'q' && !(n <= 7 && isHostile(r))).filter(ok));
  const neus = neu ? (dr ? ['q'].concat(neuPool.slice(0, neu - 1)) : neuPool.slice(0, neu)) : [];
  // 중립 중 위험한 직업(칼잡이·방화범)은 한 판에 1명까지
  for (let k = 0; k < neus.length; k++) if (isHostile(neus[k]) && neus.slice(0, k).some(isHostile)) { const alt = neuPool.find(r => !isHostile(r) && !neus.includes(r)); if (alt) neus[k] = alt; }
  const town = n - deck.length - neus.length;
  const tw = [];
  if (town >= 1) tw.push('P');
  if (town >= 2 && n >= 5) tw.push('D');
  const plain = n <= 8 ? Math.min(1, Math.max(0, town - tw.length)) : Math.min(2, Math.floor(town / 5));
  const tiers = { info: [], protect: [], vote: [] };
  for (const r of shuffle(ROLE_ORDER.filter(r => ROLES[r].tier && ok(r)))) tiers[ROLES[r].tier].push(r);
  const order = ['info', 'protect', 'info', 'vote', 'info', 'protect'];
  let k = 0, protects = 0, guard = 0;
  while (tw.length < town - plain && guard++ < 200) {
    const t = order[k++ % order.length];
    if (t === 'protect' && n < 12 && protects >= 1) continue;
    const r = tiers[t].shift(); if (!r) { if (!tiers.info.length && !tiers.protect.length && !tiers.vote.length) break; continue; }
    if (t === 'protect') protects++;
    tw.push(r);
  }
  while (tw.length < town) tw.push('C');
  return shuffle(deck.concat(neus, tw));
}

// 대기실 표시용: 무작위 없이 인원 구성만 요약
export function deckSummary(n, opt = {}) {
  const maf = mafCount(n, opt);
  const dr = opt.dr === undefined ? 1 : opt.dr;
  const neu = neuCount(n, opt);
  const town = n - maf - supCount(n) - neu, fixed = (town >= 1 ? 1 : 0) + (town >= 2 && n >= 5 ? 1 : 0);
  const plain = n <= 8 ? Math.min(1, Math.max(0, town - fixed)) : Math.min(2, Math.floor(town / 5));
  const sp = Math.max(0, town - fixed - plain);
  const parts = [`🔪 마피아 ${maf}명${supCount(n) ? ' + 🕵️ 보조 직업 1명 (랜덤 · 마피아와 서로 몰라요)' : ''}`];
  if (neu) parts.push(`🎭 중립 ${neu}명${dr ? (neu === 1 ? ' (🌫️ 몽상가)' : ' (🌫️ 몽상가 1명 + 랜덤)') : ' (랜덤 · 몽상가 없음)'}`);
  parts.push(`🏘️ 마을 ${town}명: 🚓경찰${fixed > 1 ? ' · 💉의사' : ''}${sp ? ` · 특수 직업 ${sp}명 랜덤` : ''}${plain ? ` · 주민 ${plain}명` : ''}`);
  return parts.join('<br>');
}

// ───────── 한밤 모드 (한밤의 늑대인간) ─────────
// ───────── 한밤 모드 (한밤의 늑대인간) ─────────
export const ONUW = {
  W: { name: '늑대인간', team: 'wolf', icon: '🐺',
    desc: '밤에 다른 늑대인간이 누군지 알게 돼요. 늑대인간이 나 혼자라면 가운데 카드 1장을 볼 수 있어요. 아무 늑대인간도 처형되지 않으면 승리해요.' },
  N: { name: '하수인', team: 'wolf', icon: '🦹',
    desc: '늑대인간 편이에요. 밤에 늑대인간이 누군지 알게 돼요(늑대인간은 나를 몰라요). 내가 대신 처형되어도 늑대인간이 살아 있으면 승리해요.' },
  X: { name: '예언자', team: 'village', icon: '👁️',
    desc: '밤에 다른 플레이어 1명의 카드, 또는 가운데 카드 2장을 볼 수 있어요.' },
  B: { name: '강도', team: 'village', icon: '🦝',
    desc: '밤에 다른 플레이어 1명과 카드를 바꾸고 새 카드를 확인해요. 바꾼 카드의 편이 내 편이 돼요.' },
  T: { name: '말썽쟁이', team: 'village', icon: '🃏',
    desc: '밤에 나를 뺀 두 플레이어의 카드를 서로 바꿔요(내용은 못 봐요).' },
  K: { name: '주정뱅이', team: 'village', icon: '🍺',
    desc: '밤에 내 카드를 가운데 카드 1장과 바꿔요. 새 카드가 뭔지는 몰라요.' },
  I: { name: '불면증환자', team: 'village', icon: '🥱',
    desc: '밤이 끝날 때 내 카드가 최종적으로 뭔지 확인해요.' },
  A: { name: '무두장이', team: 'tanner', icon: '🪓',
    desc: '삶에 지쳤어요. 내가 처형되면 나 혼자 승리해요.' },
  H: { name: '사냥꾼', team: 'village', icon: '🏹',
    desc: '내가 처형되면, 내가 투표한 사람도 함께 쓰러져요.' },
  V: { name: '마을주민', team: 'village', icon: '🧑‍🌾', desc: '특별한 능력은 없어요. 대화로 늑대인간을 찾아내세요.' },
};
// 밤 행동 순서
export const ONUW_ORDER = ['W', 'N', 'X', 'B', 'T', 'K', 'I'];

export function onuwDeck(n) {
  const order = ['W', 'W', 'X', 'B', 'T', 'V', 'I', 'K', 'N', 'A', 'H', 'V', 'V', 'W', 'V', 'X', 'V', 'V', 'V', 'V', 'V', 'V', 'V'];
  return shuffle(order.slice(0, n + 3));
}

// ───────── 메시지 코드 → 문장 ─────────
// presence 용량(4KB)을 아끼려고 계산 담당 기기는 문장 대신 짧은 코드만 보낸다.
export const WIN_TEXT = {
  town: '🎉 마피아를 모두 잡았어요! 마을 사람들 승리',
  killer: '🗡️ 마지막까지 살아남은 건 칼잡이! 칼잡이 단독 승리',
  pyro: '🔥 마을이 잿더미가 됐어요! 방화범 단독 승리',
  draw: '🕯️ 마을에 아무도 남지 않았어요. 무승부',
  mafia: '🔪 마피아가 마을을 장악했어요! 마피아 팀 승리',
  jester: '🃏 어릿광대의 계획대로! 어릿광대 단독 승리',
  village: '🎉 늑대인간을 처형했어요! 마을 팀 승리',
  village0: '🎉 늑대인간은 모두 가운데에! 아무도 처형하지 않아 마을 팀 승리',
  wolf: '🐺 늑대인간이 살아남았어요! 늑대인간 팀 승리',
  tanner: '🪓 무두장이가 처형됐어요! 무두장이 승리',
  tannerV: '🪓 무두장이 승리 + 늑대인간도 처형돼 마을 팀도 승리',
  minion: '🦹 늑대인간이 없는데 마을이 사람을 처형했어요! 하수인 승리',
  none: '😶 늑대인간이 없는데 무고한 사람을 처형했어요. 승자 없음',
};
const hasB = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const yeyo = w => `「${w}」${hasB(w) ? '이에요' : '예요'}`;
const yeosseo = w => `「${w}」${hasB(w) ? '이었어요' : '였어요'}`;
const eunNeun = w => `「${w}」${hasB(w) ? '은' : '는'}`;
const iGa = w => `「${w}」${hasB(w) ? '이' : '가'}`;
export function fmt(m, P) {
  if (!Array.isArray(m)) return String(m || '');
  const [c, a, b, d, e] = m;
  const N = i => (P && P[i] ? P[i][1] : '?');
  const R = r => (ROLES[r] ? ROLES[r].name : '?');
  const O = r => (ONUW[r] ? ONUW[r].name : '?');
  const rv = r => (r ? ` (직업: ${R(r)})` : '');
  switch (c) {
    case 'start': return `🎭 게임 시작! ${a}명이 참가했어요.`;
    case 'role': return '🎭 직업이 정해졌어요. 내 직업을 확인하세요.';
    case 'card': return '🌙 카드를 받았어요. 내 카드를 확인하세요.';
    case 'night': return `🌙 ${a}번째 밤. 모두 자기 집으로 돌아가 잠들어요. 내 차례가 오면 움직일 수 있어요.`;
    case 'left': return `🚪 ${N(a)}님이 마을을 떠났어요.`;
    case 'kill': return `💀 ${N(a)}님이 밤사이 쓰러진 채 발견됐어요.${rv(b)}`;
    case 'saved': return '💉 의사가 습격당한 누군가를 살려 냈어요!';
    case 'armor': return `🛡️ 방패꾼 ${N(a)}님이 습격을 버텨 냈어요!`;
    case 'calm': return '🌅 조용한 밤이었어요. 아무도 쓰러지지 않았어요.';
    case 'scoop': return `📜 소식! ${N(a)}님의 직업은 「${R(b)}」입니다.`;
    case 'disc': return '🗣️ 토론 시간이에요. 밤에 본 것을 이야기해 보세요.';
    case 'vote': return '🗳️ 재판대에 올릴 사람을 고르세요.';
    case 'tie': return '🤝 표가 갈려서 아무도 재판대에 오르지 않았어요.';
    case 'trial': return `⚖️ ${N(a)}님이 ${b}표로 재판대에 올랐어요. 최후의 변론을 들어 보세요.`;
    case 'trial2': return `⚖️ ${N(a)}님이 재판대에 올랐어요. 최후의 변론을 들어 보세요.`;
    case 'final': return `⚖️ ${N(a)}님을 처형할까요? 찬성/반대를 고르세요.`;
    case 'exec': return `🪦 찬성 ${b} : 반대 ${d} — ${N(a)}님이 처형됐어요.${rv(e)}`;
    case 'spared': return `🙌 찬성 ${b} : 반대 ${d} — ${N(a)}님은 살아남았어요.`;
    case 'jester': return `🃏 찬성 ${b} : 반대 ${d} — ${N(a)}님이 처형됐어요… 그런데 어릿광대였어요!`;
    case 'win': return WIN_TEXT[a] || '';
    case 'burn': return `🔥 ${N(a)}님이 불길에 휩싸여 쓰러졌어요.${rv(b)}`;
    case 'revenge': return `🌊 습격당한 ${N(a)}님이 물귀신처럼 되살아났어요! 대신 ${N(b)}님이 끌려가 쓰러졌어요.${rv(d)}`;
    case 'more': return `⏱️ ${N(a)}님이 토론 시간을 ${b > 0 ? '15초 늘렸어요' : '15초 줄였어요'}.`;
    case 'setn': {
      const L = { mode: ['모드', { classic: '클래식', onuw: '한밤의 늑대인간' }], maf: ['마피아 팀 수', ['자동', '1명', '2명', '3명', '4명', '5명']], neu: ['중립 직업', ['없음', '랜덤', '랜덤']], fg: ['단서 바꿔치기', ['없음', '있음']], dr: ['몽상가', ['빼기', '넣기']],
        rev: ['죽으면', ['직업 숨김', '직업 공개']], spd: ['속도', ['빠름', '보통', '느긋']], act: ['진행 방식', ['3D 탐색', '간단(목록)']], off: ['진행', ['온라인', '오프라인(한자리)']], exp: ['단서', ['끄기', '켜기']], nt: ['밤 진행', ['모두 동시에', '역할별 차례']] };
      if (b === 'bot+') return `🤖 ${a}님이 봇을 넣었어요. (봇 ${d}명)`;
      if (b === 'bot-') return `🤖 ${a}님이 봇을 뺐어요. (봇 ${d}명)`;
      const l = L[b]; if (!l) return ''; const v = l[1][d], last = String(v).charCodeAt(String(v).length - 1), jong = last >= 0xac00 && last <= 0xd7a3 ? (last - 0xac00) % 28 : 0;
      return `⚙️ ${a}님이 ${l[0]}${hasB(l[0]) ? '을' : '를'} 「${v}」${jong && jong !== 8 ? '으로' : '로'} 바꿨어요.`;
    }
    case 'explore': return `🔍 탐색 시간! 마을 곳곳에 빛나는 단서 ${a}개가 떨어졌어요. 다가가서 E로 주우세요 (1인당 2개).`;
    // 3D 탐색 모드
    case 'dawn3': return `☀️ ${a}일째 아침이 밝았어요. 마을을 둘러보세요 — 보이지 않는 사람이 있나요?`;
    case 'day': return `🔍 낮이에요! 단서 ${a}개가 마을에 떨어졌어요. 시체를 찾으면 신고, 광장에선 소집(하루 1번)으로 회의를 열 수 있어요.`;
    case 'dayGo': return '🔍 회의가 끝났어요. 낮이 이어져요.';
    case 'rep': return `🚨 ${N(a)}님이 ${d === -1 ? '시체' : N(b) + '님의 시체'}를 「${e}」에서 발견해 신고했어요! 모두 원탁으로!`;
    case 'repD': return `🃏 그런데… 가짜 시체였어요! 누가 이런 장난을?`;
    case 'repCold': return `🪦 ${N(a)}님은 이미 차갑게 식어 있었어요.${rv(b)}`;
    case 'repNew': return `🪦 ${N(a)}님의 죽음이 확인됐어요.${rv(b)}`;
    case 'call': return `🔔 ${N(a)}님이 종을 울려 소집했어요! 모두 원탁으로!`;
    case 'revived': return '💉 누군가 의사의 손길로 기적처럼 깨어났어요!';
    case 'down': return '💫 누군가에게 습격당해 정신을 잃었어요… 의사가 찾아와 주길 기다려요.';
    case 'pKd': return `🔪 ${N(a)}님을 처치했어요. 시체를 E로 끌어 숨길 수 있어요.`;
    case 'pKa': return `🛡️ ${N(a)}님이 공격을 버텼어요! 오늘 밤 처치는 실패예요.`;
    case 'pDn': return '💉 이번 밤엔 이미 치료했어요.';
    case 'pDh': return `💉 ${N(a)}님의 집을 살폈지만 다친 사람은 없었어요.`;
    case 'pD': return `💉 ${N(a)}님을 치료해 살려 냈어요! 자기 집에서 깨어날 거예요.`;
    case 'pD0': return '💉 치료해 봤지만… 이미 늦었어요. 되살릴 수 없어요.';
    case 'pM': return `🔔 넋이 말해요: ${N(a)}님의 직업은 ${yeyo(R(b))}.`;
    case 'pXd': return `🗡️ ${N(a)}님을 처치했어요. 누가 보진 않았겠죠?`;
    case 'pFd': return `🔥 ${N(a)}님에게 몰래 기름을 부었어요. (기름 묻은 사람 ${b}명)`;
    case 'pFg': return `🎭 ${a ? '단서를 가짜로 바꿔치기했어요' : '마피아 팀 누군가가 단서를 가짜로 바꿔치기했어요'}. (마피아 팀 남은 횟수 ${b}/${d}번)`;
    case 'pJd': return '🃏 가짜 시체를 놓았어요. 누가 신고할까요?';
    case 'pRv': return '💉 의사 덕분에 깨어났어요! 무슨 일이 있었는지는 기억나지 않아요.';
    case 'cH': return `👣 흔적 단서: 「${a}」 쪽으로 무언가 끌려간 자국이 있어요.`;
    case 'cK': return `👣 목격 단서: 어젯밤 마피아는 「${a}」 쪽에서 나왔어요.`;
    case 'cc': return `${b ? '📜' : '🔒'} ${b ? '단서 카드 (공유 가능)' : '비밀 단서 (공유 불가)'}\n` + (a || []).map(x => '• ' + fmt(x, P)).join('\n');
    case 'sNot': return `${N(a)}님은 ${iGa(R(b))} 아니에요.`;
    case 'sNM': return b ? `${N(a)}님은 마피아 팀이에요.` : `${N(a)}님은 마피아 팀이 아니에요.`;
    case 'sNeu': return b ? `${N(a)}님은 중립 직업이에요.` : `${N(a)}님은 중립 직업이 아니에요.`;
    case 'sOut': return b ? `${N(a)}님은 어젯밤 집을 나간 적이 있어요.` : `${N(a)}님은 어젯밤 집에서 한 번도 나오지 않았어요.`;
    case 'sVis': return b ? `${N(a)}님은 어젯밤 남의 집에 들어간 적이 있어요.` : `${N(a)}님은 어젯밤 남의 집에 들어가지 않았어요.`;
    case 'sSame': return d ? `${N(a)}님과 ${N(b)}님은 같은 편이에요.` : `${N(a)}님과 ${N(b)}님은 서로 다른 편이에요.`;
    case 'sLen': return `${N(a)}님의 직업은 이름이 ${b}글자예요.`;
    case 'sTrio': return `${N(a)}, ${N(b)}, ${N(d)}님 중 마피아 팀은 ${e}명이에요.`;
    case 'sRole': return `${eunNeun(R(a))} ${b ? '아직 살아 있어요' : '이미 죽었어요'}.`;
    case 'sNone': return `이 판에는 ${iGa(R(a))} 없어요.`;
    case 'sHide': return `「${a}」 쪽으로 무언가 끌려간 자국이 있어요.`;
    case 'shared': return `📢 ${N(a)}님이 단서를 공유했어요.`;
    case 'pA': return a < 0 ? '🔍 감정 결과: 이 카드는 모두 진실이에요.' : a === 99 ? '🔍 감정 결과: 이 카드는 너무 오래돼서 감정할 수 없어요.' : `🔍 감정 결과: ${a + 1}번째 문장이 거짓이에요!`;
    case 'pKk': return `🔒 ${a + 1}번 집 문을 잠갔어요. 오늘 밤 그 집 주인은 안전해요. (남은 횟수 ${b})`;
    case 'pKl': return `🔒 ${N(a)}님 집 문이 굳게 잠겨 있었어요. 오늘 밤 처치는 실패예요.`;
    case 'pT': return a === -1 ? '👣 미행 결과를 얻지 못했어요.' : (b && b.length ? `👣 ${N(a)}님은 어젯밤 ${b.map(h => (h + 1) + '번 집(' + N(h) + ')').join(', ')}에 들어갔어요.` : `👣 ${N(a)}님은 어젯밤 남의 집에 들어가지 않았어요.`);
    case 'pTs': return `👣 ${N(a)}님에게 미행 표시를 했어요. 아침에 결과가 와요.`;
    case 'pL': return a && a.length ? `🏮 어젯밤 밝힌 가로등 곁을 지나간 사람: ${a.map(N).join(', ')}` : '🏮 어젯밤 밝힌 가로등 곁엔 아무도 지나가지 않았어요.';
    case 'pLs': return '🏮 가로등을 밝혀 뒀어요. 오늘 밤 이 근처를 지나가는 사람을 기억할게요.';
    case 'pZ1': return `🔦 「${a}」에서 숨겨진 시체를 찾아냈어요! 이제 모두에게 보여요.`;
    case 'pZ0': return b ? `🔦 「${a}」엔 시체는 없지만, 최근 누가 손댄 흔적이 있어요.` : `🔦 「${a}」엔 아무 흔적도 없어요.`;
    case 'pN': return a || b ? `🏠 어젯밤 ${a && b ? '양옆 두 집 모두' : a ? '왼쪽 집' : '오른쪽 집'}에 손님이 들어왔어요.` : '🏠 어젯밤 옆집들은 조용했어요.';
    case 'pB': return `🤐 ${N(a)}님에게 협박 편지를 넣었어요. 내일 회의에서 그 사람의 표는 세지지 않아요.`;
    case 'pBv': return '🤐 머리맡에서 협박 편지를 발견했어요… 오늘 회의에서 내 표는 세지지 않아요.';
    case 'pY': return `🧹 흔적을 지웠어요. (남은 횟수 ${a})`;
    case 'pV': return '🪤 가짜 단서를 숨겼어요. 누가 줍는지 알려 줄게요.';
    case 'pVl': return `🪤 ${N(a)}님이 미끼 단서를 주웠어요!`;
    case 'pIb': return a === 'town' ? '🎲 마을 사람들 쪽에 걸었어요.' : '🎲 마피아 팀 쪽에 걸었어요.';
    case 'pU': return `⚱️ 유품을 챙겼어요! (${a}/${b}개)`;
    case 'pw': return `🎒 ${a + 1}번 집에 도장을 찍었어요! (${b}/5채)`;
    case 'pwx': return `🎒 들켰어요! 집주인이 가까이 있어 도장을 못 찍었어요.`;
    case 'pwn': return `🎒 누군가 내 집 이름표에 도장을 찍으려다 들켰어요: ${N(a)}님!`;
    case 'hint': return `💡 힌트 (미션 보상 · 공유 불가)\n「${a}」 근처 어딘가에 단서가 숨어 있어요.`;
    case 'msOk': return '🎯 미션 완료! 보상이 📒 수첩에 들어갔어요.';
    case 'c0': return '🍂 낙엽만 바스락… 아무 단서도 없었어요.';
    case 'cS': return `✅ 확실한 단서: ${N(a)}님은 마피아 팀이 아니에요.`;
    case 'cP': return `🧩 추리 단서: ${N(a)}님과 ${N(b)}님 중 적어도 한 명은 마피아 팀이에요.`;
    case 'cT': return `🧩 추리 단서: ${N(a)}, ${N(b)}, ${N(d)}님 중 마피아 팀은 ${e}명이에요.`;
    case 'cR': return `✅ 확실한 단서: ${eunNeun(R(a))} ${b ? '아직 살아 있어요' : '이미 죽었어요'}.`;
    case 'cN': return `✅ 확실한 단서: 이 판에는 ${iGa(R(a))} 없어요.`;
    case 'cL': return `👣 목격 단서: 어젯밤 마피아가 「${a}」 근처에 있었어요.`;
    case 'onN': return '🌙 모두 눈을 감으세요… 내 카드의 능력을 고르세요.';
    case 'dawn': return '🌅 아침이 밝았어요. 밤사이 알게 된 것을 확인하세요.';
    case 'onD': return '🗣️ 토론 시간! 누가 늑대인간일까요? 카드는 바뀌었을 수도 있어요.';
    case 'onV': return '🗳️ 한 번뿐인 투표예요. 늑대인간라고 생각하는 사람을 고르세요.';
    case 'dead': return a && a.length ? `🪦 처형: ${a.map(N).join(', ')}` : '🕊️ 아무도 처형되지 않았어요.';
    case 'hunter': return `🏹 사냥꾼 ${N(a)}님이 쓰러지며 ${N(b)}님을 쏘았어요!`;
    // 개인 메시지
    case 'pK': return `🔪 ${N(a)}님이 ${N(b)}님을 처치 대상으로 정했어요.`;
    case 'pS': return `🕵️ ${N(a)}님의 직업은 ${yeyo(R(b))}.${b === 'M' ? ' 🔴 같은 편이에요! (채팅은 못 하지만 이제 누군지 알아요)' : ''}`;
    case 'pWt': return `🔭 ${a + 1}번 집 앞에서 잠복했어요. 오늘 밤 손님 ${b}명${b && d >= 0 ? ` · 그중 한 명은 ${COLOR_NAMES[d] || '?'}색 옷이었어요` : b ? '' : ' — 아무도 드나들지 않았어요'}.`;
    case 'pBd1': return `🔗 ${N(a)}님에게 실 한쪽을 묶었어요. 이제 다른 잠든 사람에게 E로 나머지 한쪽을 묶으세요.`;
    case 'pBd': return `🔗 ${N(a)}님과 ${N(b)}님은 ${d ? '같은 편이에요 🤝' : '다른 편이에요 ⚔️'}`;
    case 'pBm': return `🤐 ${N(a)}님 집에 편지를 넣으려다 보니… 마피아였어요! 🔴 같은 편이라 편지는 거둬들였어요. (채팅은 못 하지만 이제 누군지 알아요)`;
    case 'pI': return b ? `🚓 ${N(a)}님은 마피아 팀이에요!` : `🚓 ${N(a)}님은 마피아 팀이 아니에요.`;
    case 'pH': return b ? '💉 오늘 밤은 나 자신을 지켜요.' : `💉 오늘 밤 ${N(a)}님을 지켜요.`;
    case 'pR': return `📜 ${N(a)}님을 취재했어요. 아침에 모두에게 알려져요.`;
    case 'pX': return `🗡️ 오늘 밤 ${N(a)}님을 노려요.`;
    case 'pF': return `🔥 ${N(a)}님에게 몰래 기름을 부었어요. (기름 묻은 사람: ${b}명)`;
    case 'pFi': return `🔥 오늘 밤 기름 묻은 ${a}명에게 불을 붙여요!`;
    case 'pQ': return `🎭 ${N(a)}님의 모습을 훔쳤어요. 다음 ${b ? '낮' : '밤'}에 그 모습으로 보여요.`;
    case 'pQon': return `🎭 지금 나는 ${N(a)}님의 모습이에요.`;
    case 'hae': return a && a.length ? `🗿 어젯밤 나에게 능력을 쓴 사람: ${a.map(N).join(', ')}` : '🗿 어젯밤 아무도 나에게 능력을 쓰지 않았어요.';
    case 'pE': return `🔔 ${N(a)}님의 넋이 말해요. 직업은 ${yeyo(R(b))}.`;
    case 'wl': return `🐺 늑대인간은 나 혼자예요. 가운데 ${a + 1}번 카드를 봤더니 ${yeosseo(O(b))}.`;
    case 'wp': return `🐺 함께하는 늑대인간: ${(a || []).map(N).join(', ')}`;
    case 'mn': return a && a.length ? `🦹 늑대인간은 ${a.map(N).join(', ')}님이에요.` : '🦹 플레이어 중에 늑대인간이 없어요. 모두 가운데에 있어요!';
    case 'sx': return `👁️ ${N(a)}님의 카드는 ${yeyo(O(b))}.`;
    case 'sx2': return `👁️ 가운데 ${a + 1}번은 「${O(b)}」, ${d + 1}번은 ${yeyo(O(e))}.`;
    case 'rb': return `🦝 ${N(a)}님과 카드를 바꿨어요. 내 새 카드는 ${yeyo(O(b))}.`;
    case 'rb0': return '🦝 아무것도 훔치지 않았어요.';
    case 'tm': return `🃏 ${N(a)}님과 ${N(b)}님의 카드를 바꿨어요.`;
    case 'tm0': return '🃏 아무 카드도 바꾸지 않았어요.';
    case 'dk': return `🍺 가운데 ${a + 1}번 카드와 바꿨어요. 뭐였는지는 몰라요.`;
    case 'in': return `🥱 밤이 끝났을 때 내 카드는 ${yeyo(O(a))}.`;
    case 'zz': return '😴 조용히 잠들었어요.';
  }
  return '';
}

// 오프라인·목록 모드(간단 규칙)의 밤 능력
const LEGACY_NIGHT = { B: ['blk', '협박 편지 넣기'], M: ['kill', '처치 대상으로 정하기'], S: ['spy', '정체 엿보기'], Q: ['copy', '모습 훔치기'], P: ['inv', '조사하기'], D: ['heal', '지키기'], R: ['scoop', '취재하기'], X: ['slay', '처치 대상으로 정하기'], F: ['oil', '기름 붓기'] };
export function legacyNight(r) { const l = LEGACY_NIGHT[r]; return l ? { k: l[0], verb: l[1], icon: ROLES[r].icon } : null; }
