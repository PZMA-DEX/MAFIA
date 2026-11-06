// 3D 마을 — 가운데 원탁 광장(20석 + 재판대), 둘레에 집 20채, 숲과 울타리
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });


// Small shared procedural surfaces keep the village crisp without network assets.
function surface(kind) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = 'rgba(31,35,31,.15)'; c.lineWidth = 2;
  if (kind === 'stone') {
    for (let y = 0; y < 128; y += 32) {
      c.beginPath(); c.moveTo(0,y); c.lineTo(128,y); c.stroke();
      for (let x = (y / 32 % 2) * 32; x < 128; x += 64) { c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+32); c.stroke(); }
    }
  } else {
    const step = kind === 'roof' ? 16 : 32;
    for (let y = 0; y < 128; y += step) { c.beginPath(); c.moveTo(0,y); c.lineTo(128,y); c.stroke(); }
    if (kind === 'wood') {
      c.strokeStyle = 'rgba(50,35,20,.07)'; c.lineWidth = 1;
      for (let y = 5; y < 128; y += 7) { c.beginPath(); c.moveTo(0,y); c.bezierCurveTo(30,y-4,70,y+4,128,y); c.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function buildWorld(scene, opts = {}) {
  const segs = [];      // 벽: {ax,az,bx,bz,t}
  const circles = [];   // 기둥/나무: {x,z,r}
  const TABLE = { r0: 2.0, r1: 3.45 };
  const lamps = [], windows = [], spawns = [], houses = [], hidePts = [];
  const root = new THREE.Group(); scene.add(root);
  const stoneTex = surface('stone'), woodTex = surface('wood'), roofTex = surface('roof');
  const stoneMat = M('#a4a398', { map: stoneTex }), timberMat = M('#645c4e', { map: woodTex });
  // Decorative boxes are instanced per material, not separate draw calls per house.
  const details = new Map();
  const detail = (material, x, y, z, w, h, d, ry = 0) => {
    if (!details.has(material)) details.set(material, []);
    const o = new THREE.Object3D(); o.position.set(x,y,z); o.rotation.y = ry; o.scale.set(w,h,d); o.updateMatrix();
    details.get(material).push(o.matrix.clone());
  };

  // 땅
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), M('#657765'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(13, 48), M('#c2bba8', { map: stoneTex }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.01; plaza.receiveShadow = true; root.add(plaza);
  const plazaRim = new THREE.Mesh(new THREE.RingGeometry(12.6, 13.2, 48), M('#827f72'));
  plazaRim.rotation.x = -Math.PI / 2; plazaRim.position.y = 0.02; root.add(plazaRim);
  const pathMat = M('#aaa38f', { map: stoneTex });
  // 원탁 (가운데가 뚫린 고리 모양) + 재판대
  const sh = new THREE.Shape(); sh.absarc(0, 0, 3.2, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 2.15, 0, Math.PI * 2, true); sh.holes.push(hole);
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false, curveSegments: 40 }), M('#655347', { roughness: 0.6 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.95; top.castShadow = true; top.receiveShadow = true; root.add(top);
  const legMat = M('#403b34');
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95), legMat); l.position.set(Math.sin(a) * 2.7, 0.47, Math.cos(a) * 2.7); root.add(l); }
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.3, 32), M('#7a4b46'));
  podium.position.y = 0.15; podium.receiveShadow = true; root.add(podium);
  const podiumLight = new THREE.SpotLight('#ffd9a0', 0, 14, 0.45, 0.5, 1.2);
  podiumLight.position.set(0, 9, 0); podiumLight.target.position.set(0, 0, 0); root.add(podiumLight, podiumLight.target);

  // 의자 20개
  const seats = [];
  const chairMat = M('#766656'), cushion = M('#a06b58');
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2, R = 4.15;
    const x = Math.sin(a) * R, z = Math.cos(a) * R, ry = a + Math.PI;
    seats.push({ x, z, ry });
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.7), cushion); s.position.y = 0.48; c.add(s);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.8, 0.08), chairMat); b.position.set(0, 0.9, -0.33); c.add(b);
    for (const [lx, lz] of [[-0.3, -0.28], [0.3, -0.28], [-0.3, 0.28], [0.3, 0.28]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), chairMat); l.position.set(lx, 0.24, lz); c.add(l); }
    c.traverse(o => { if (o.isMesh) o.castShadow = true; });
    root.add(c);
  }

  // 가로등 6개
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + 0.26, x = Math.sin(a) * 11.6, z = Math.cos(a) * 11.6;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6), M('#2b2b2b')); post.position.set(x, 1.8, z); root.add(post);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf6b', emissiveIntensity: 0.2 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bulbMat); bulb.position.set(x, 3.7, z); root.add(bulb);
    const L = new THREE.PointLight('#ffc977', 0, 13, 1.6); L.position.set(x, 3.4, z); root.add(L);
    detail(timberMat,x,3.96,z,.75,.12,.75);
    detail(timberMat,x,3.43,z,.57,.09,.57);
    for (const dx of [-.23,.23]) for (const dz of [-.23,.23]) detail(timberMat,x+dx,3.68,z+dz,.035,.5,.035);
    lamps.push({ L, bulbMat, x, z }); circles.push({ x, z, r: 0.25 });
  }

  // 집 20채 — 안쪽 고리 10채, 바깥 고리 10채. 플레이어마다 자기 집이 있다.
  const wallCols = ['#d9d2bd', '#c7c9b8', '#c5c9c6', '#d7c6ae', '#cabbb0', '#d2cdb9', '#bcc6bd', '#ded4c0', '#c1c9c3', '#d2c5b3'];
  const roofCols = ['#75645b', '#536a6b', '#655d58', '#5b6b5d', '#78665f', '#7d715b', '#5d686b', '#896b59', '#56696a', '#726858'];
  const HW = 3.3, HD = 2.9, WH = 2.8, TH = 0.22, DOOR = 1.7;
  const homes = [], plates = [];
  const plateMat = (k) => labelSprite(`${k + 1}번 집`, '#f2eee2', 'rgba(35,48,46,0.88)');
  for (let k = 0; k < 20; k++) {
    const inner = k < 10, a = inner ? (k + 0.5) / 10 * Math.PI * 2 : (k - 10) / 10 * Math.PI * 2, R = inner ? 23 : 36.5;
    const hx = Math.sin(a) * R, hz = Math.cos(a) * R, rot = Math.atan2(-hx, -hz);
    const grp = new THREE.Group(); grp.position.set(hx, 0, hz); grp.rotation.y = rot; root.add(grp);
    const wm = M(wallCols[k % 10]); houses.push({ x: hx, z: hz, rot });
    const toW = (lx, lz) => { const c = Math.cos(rot), s = Math.sin(rot); return { x: hx + lx * c + lz * s, z: hz - lx * s + lz * c }; };
    const wall = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, WH, TH), wm);
      m.position.set((ax + bx) / 2, WH / 2, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax);
      m.castShadow = true; m.receiveShadow = true; grp.add(m);
      const A = toW(ax, az), B = toW(bx, bz); segs.push({ ax: A.x, az: A.z, bx: B.x, bz: B.z, t: TH / 2 });
    };
    wall(-HW, -HD, HW, -HD); wall(-HW, -HD, -HW, HD); wall(HW, -HD, HW, HD);
    wall(-HW, HD, -DOOR / 2, HD); wall(DOOR / 2, HD, HW, HD);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR, 0.6, TH), wm); lintel.position.set(0, WH - 0.3, HD); grp.add(lintel);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HD * 2), M('#a08d70', { map: woodTex })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; grp.add(floor);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1.7, 4), M(roofCols[k % 10], { map: roofTex })); roof.position.y = WH + 0.85; roof.rotation.y = Math.PI / 4; roof.scale.set((HW + .35) * Math.SQRT2, 1, (HD + .35) * Math.SQRT2); roof.castShadow = true; grp.add(roof);
    const winMat = new THREE.MeshStandardMaterial({ color: '#9fc3d6', emissive: '#ffb44d', emissiveIntensity: 0 });
    windows.push(winMat);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), winMat); w.position.set(sx * (HW + TH / 2 + 0.01), 1.6, 0); w.rotation.y = sx * Math.PI / 2; grp.add(w); }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2), M('#f3f3f3')); bed.position.set(-HW + 0.85, 0.22, -HD + 1.15); grp.add(bed);
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.1, 1.3), M(roofCols[k % 10])); blanket.position.set(-HW + 0.85, 0.47, -HD + 1.5); grp.add(blanket);
    { const p = toW(-HW + 0.85, -HD + 1.15); circles.push({ x: p.x, z: p.z, r: 0.85 }); }
    const plate = plateMat(k); plate.position.set(0, WH + 0.25, HD + 0.3); plate.scale.set(2.4, 0.6, 1); grp.add(plate); plates.push(plate);
    // All facade details sit on existing walls; door aperture and walkable space stay unchanged.
    const trim = (x,y,z,w,h,d,mat=timberMat) => { const pt=toW(x,z); detail(mat,pt.x,y,pt.z,w,h,d,rot); };
    trim(0,.17,-HD,HW*2,.32,.25,stoneMat);
    for (const sx of [-1,1]) {
      trim(sx*HW,.17,0,.25,.32,HD*2,stoneMat);
      trim(sx*HW,WH-.12,0,.27,.2,HD*2+.18);
      trim(sx*(HW+DOOR/2)/2,.17,HD,HW-DOOR/2,.32,.25,stoneMat);
      trim(sx*(DOOR/2+.06),1.12,HD+.04,.12,2.24,.27);
      // Window casing and cross bars are shallow enough to stay inside wall collision.
      for (const wz of [-.5,.5]) trim(sx*(HW+.13),1.6,wz,.08,.98,.09);
      for (const wy of [1.15,2.05]) trim(sx*(HW+.13),wy,0,.08,.09,1.08);
      trim(sx*(HW+.18),1.6,0,.04,.06,.92,stoneMat);
      trim(sx*(HW+.18),1.6,0,.04,.86,.055,stoneMat);
    }
    trim(0,2.25,HD+.04,DOOR+.24,.13,.27);
    trim(0,WH-.12,HD,HW*2+.18,.2,.27);
    trim(0,.025,HD+.34,DOOR+.24,.035,.66,stoneMat);
    // Bedding details stay within the original bed's footprint.
    trim(-HW+.85,.5,-HD+.46,1.12,.12,.38,stoneMat);
    trim(-HW+.85,.33,-HD+.16,1.4,.65,.12);
    const sleep = toW(0.9, -0.4), doorOut = toW(0, HD + 1.3), doorIn = toW(0, HD - 1.0);
    const bedHead = toW(-HW + 0.85, -HD + 1.15 + 0.82);   // 침대에 누웠을 때 몸이 침대 위에 오도록
    homes.push({ sleep, bed: bedHead, ry: rot, doorOut, doorIn });
    spawns.push(bedHead);
    // 단서를 숨길 만한 구석: 집 안 구석, 집 뒤, 집 옆
    hidePts.push(toW(HW - 0.6, -HD + 0.6), toW(-HW - 0.9, HD - 0.5), toW(HW + 0.9, -HD + 0.4), toW(0.4, -HD - 1.0));
  }
  // 광장 → 안쪽 집 길
  for (let k = 0; k < 10; k++) {
    const a = (k + 0.5) / 10 * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6.5), pathMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = a; p.position.set(Math.sin(a) * 16.5, 0.015, Math.cos(a) * 16.5); root.add(p);
  }

  // A quiet ring lane links the two neighbourhoods without changing any collision.
  const lane = new THREE.Mesh(new THREE.RingGeometry(27.2,28.8,96), pathMat);
  lane.rotation.x=-Math.PI/2; lane.position.y=.012; lane.receiveShadow=true; root.add(lane);

  // 숨김 장소 (시체를 숨길 수 있는 곳): 덤불·상자·건초 더미·우물
  const hideSpots = [];
  const crate = M('#9b8462'), bushM = [M('#3f6150'), M('#526e53')], hay = M('#baa778');
  const dirName = (x, z) => ['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.round(((Math.atan2(x, -z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2 + 0.05, R = 29.5, x = Math.sin(a) * R, z = Math.cos(a) * R, type = k % 3;
    if (type === 0) { // 덤불
      for (const [ox, oz, s] of [[0, 0, 1.1], [0.8, 0.3, 0.8], [-0.7, 0.4, 0.75], [0.1, -0.7, 0.7]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), bushM[(ox > 0) | 0]); b.position.set(x + ox, s * 0.7, z + oz); b.castShadow = true; root.add(b); }
      circles.push({ x, z, r: 1.1 }); hideSpots.push({ x, z, name: `${dirName(x, z)}쪽 덤불` });
    } else if (type === 1) { // 상자
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), crate); b.position.set(x, 0.6, z); b.castShadow = true; root.add(b);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 1), crate); b2.position.set(x + 1.1, 0.45, z + 0.5); b2.rotation.y = 0.4; root.add(b2);
      for (const dx of [-.54,.54]) { detail(timberMat,x+dx,.6,z,.08,1.24,1.44); }
      for (const yy of [.12,1.1]) detail(timberMat,x,yy,z,1.44,.09,1.44);
      circles.push({ x, z, r: 0.95 }, { x: x + 1.1, z: z + 0.5, r: 0.7 }); hideSpots.push({ x: x + 0.5, z: z + 0.2, name: `${dirName(x, z)}쪽 상자 더미` });
    } else { // 건초
      const h = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 1.4, 14), hay); h.position.set(x, 0.7, z); h.castShadow = true; root.add(h);
      const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.1, 14), hay); h2.position.set(x + 1.2, 0.55, z - 0.6); h2.rotation.z = Math.PI / 2; root.add(h2);
      circles.push({ x, z, r: 1.1 }, { x: x + 1.2, z: z - 0.6, r: 0.8 }); hideSpots.push({ x, z, name: `${dirName(x, z)}쪽 건초 더미` });
    }
  }
  // 우물
  const well = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 1, 20, 1, true), M('#9e9b8e', { side: THREE.DoubleSide, map: stoneTex })); well.position.set(0, 0.5, -17.5); root.add(well);
  const wroof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1, 4), M('#565e5b')); wroof.position.set(0, 2.6, -17.5); wroof.rotation.y = Math.PI / 4; root.add(wroof);
  circles.push({ x: 0, z: -17.5, r: 1.35 }); hideSpots.push({ x: 0, z: -17.5, name: '우물' });
  // Roof supports are inside the well's existing circular collider.
  for (const sx of [-.88,.88]) detail(timberMat,sx,1.6,-17.5,.13,1.6,.13);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.16,24), M('#344c50',{roughness:.32}));
  water.rotation.x=-Math.PI/2; water.position.set(0,.18,-17.5); root.add(water);
  // 소집 종 (광장)
  const bell = { x: 0, z: 8.6 };
  { const post = M('#3e2a1c'); for (const sx of [-0.7, 0.7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), post); p.position.set(bell.x + sx, 1.3, bell.z); root.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.22), post); beam.position.set(bell.x, 2.6, bell.z); root.add(beam);
    const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 0.6, 16), M('#c9a227', { metalness: 0.7, roughness: 0.3 })); bl.position.set(bell.x, 2.15, bell.z); root.add(bl);
    circles.push({ x: bell.x - 0.7, z: bell.z, r: 0.2 }, { x: bell.x + 0.7, z: bell.z, r: 0.2 }); }

  // 숲과 울타리
  const trunk = M('#625849'), leaves = [M('#3f6150'), M('#4e6c59'), M('#375646')];
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clear = (x, z, d) => houses.every(h => Math.hypot(x - h.x, z - h.z) > d) && hideSpots.every(h => Math.hypot(x - h.x, z - h.z) > 3);
  for (let i = 0, made = 0; i < 200 && made < (opts.lite ? 34 : 64); i++) {
    const a = rand() * Math.PI * 2, R = 41 + rand() * 6;
    const x = Math.max(-46, Math.min(46, Math.sin(a) * R)), z = Math.max(-46, Math.min(46, Math.cos(a) * R));
    if (!clear(x, z, 6)) continue; made++;
    const s = 0.8 + rand() * 0.7;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.28 * s, 1.6 * s), trunk); t.position.set(x, 0.8 * s, z); t.castShadow = true; root.add(t);
    const l = new THREE.Mesh(new THREE.ConeGeometry(1.5 * s, 3.4 * s, 8), leaves[i % 3]); l.position.set(x, 2.9 * s, z); l.castShadow = true; root.add(l);
    circles.push({ x, z, r: 0.45 * s });
  }
  const B = 48, fence = M('#766e5b');
  for (const [ax, az, bx, bz] of [[-B, -B, B, -B], [B, -B, B, B], [B, B, -B, B], [-B, B, -B, -B]]) {
    const len = Math.hypot(bx - ax, bz - az);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 0.15), fence); m.position.set((ax + bx) / 2, 0.55, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax); root.add(m);
    segs.push({ ax, az, bx, bz, t: 0.1 });
  }

  // One draw call per shared detail material, including all twenty facades.
  for (const [material, matrices] of details) {
    const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,matrices.length);
    matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix)); batch.receiveShadow=true; root.add(batch);
  }

  // 하늘·빛
  const hemi = new THREE.HemisphereLight('#cfe8ff', '#4a5a3a', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff2d6', 1.6); sun.position.set(30, 45, 20); sun.castShadow = !opts.lite;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 140 });
  scene.add(sun);
  const moonGlow = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 16), new THREE.MeshBasicMaterial({ color: '#f4f1d0', fog: false }));
  moonGlow.position.set(-60, 70, -90); scene.add(moonGlow);
  scene.fog = new THREE.Fog('#bcd9ef', 40, 150);
  scene.background = new THREE.Color('#bcd9ef');

  function collide(x, z, r) {
    for (let it = 0; it < 2; it++) {
      for (const s of segs) {
        const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz;
        let t = ((x - s.ax) * dx + (z - s.az) * dz) / L2; t = Math.max(0, Math.min(1, t));
        const px = s.ax + dx * t, pz = s.az + dz * t, ex = x - px, ez = z - pz, d = Math.hypot(ex, ez), m = r + s.t;
        if (d < m) { if (d < 1e-4) { x += 0.01; continue; } x = px + ex / d * m; z = pz + ez / d * m; }
      }
      for (const c of circles) { const ex = x - c.x, ez = z - c.z, d = Math.hypot(ex, ez), m = r + c.r; if (d < m && d > 1e-4) { x = c.x + ex / d * m; z = c.z + ez / d * m; } }
      const d = Math.hypot(x, z);
      if (d > TABLE.r0 - r && d < TABLE.r1 + r && d > 1e-4) {
        const out = TABLE.r1 + r, inn = TABLE.r0 - r;
        const k = (d - inn < out - d) ? inn : out; x = x / d * k; z = z / d * k;
      }
    }
    return { x: Math.max(-47, Math.min(47, x)), z: Math.max(-47, Math.min(47, z)) };
  }
  // 보물찾기용: 덤불·상자 옆, 집 구석, 숲 가장자리처럼 눈에 덜 띄는 곳
  function hiddenPoint() {
    const pool = hidePts.concat(hideSpots.map(h => ({ x: h.x + (Math.random() - 0.5) * 3, z: h.z + (Math.random() - 0.5) * 3 })));
    for (let i = 0; i < 20; i++) {
      const p = Math.random() < 0.8 ? pool[Math.floor(Math.random() * pool.length)] : randomPoint();
      const x = p.x + (Math.random() - 0.5) * 0.6, z = p.z + (Math.random() - 0.5) * 0.6, c = collide(x, z, 0.3);
      if (Math.abs(c.x) < 46 && Math.abs(c.z) < 46) return { x: c.x, z: c.z };
    }
    return randomPoint();
  }
  function randomPoint() {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, R = 5 + Math.random() * 38, x = Math.sin(a) * R, z = Math.cos(a) * R;
      const c = collide(x, z, 0.5); if (Math.hypot(c.x - x, c.z - z) < 0.01) return { x, z };
    }
    return { x: 0, z: 8 };
  }

  let nightK = 0;
  function setNight(k) {
    nightK = k;
    const day = new THREE.Color('#bcd9ef'), night = new THREE.Color('#0b1022');
    const bg = day.clone().lerp(night, k);
    scene.background = bg; scene.fog.color = bg;
    scene.fog.near = 40 - 37.5 * k; scene.fog.far = 150 - 136 * k;
    hemi.intensity = 0.9 - 0.72 * k; sun.intensity = 1.6 - 1.5 * k;
    hemi.color.set(k > 0.5 ? '#6f80b8' : '#cfe8ff');
    for (const l of lamps) { l.L.intensity = 28 * k; l.bulbMat.emissiveIntensity = 0.2 + 2.5 * k; }
    for (const w of windows) w.emissiveIntensity = 1.4 * k;
    moonGlow.visible = k > 0.3;
  }
  // 카메라가 벽을 뚫지 않게: 대상→카메라 선분이 처음 벽에 닿는 비율 (0~1)
  function camClip(ax, az, bx, bz) {
    let best = 1;
    for (const s of segs) {
      const rx = bx - ax, rz = bz - az, sx = s.bx - s.ax, sz = s.bz - s.az, den = rx * sz - rz * sx;
      if (Math.abs(den) < 1e-6) continue;
      const t = ((s.ax - ax) * sz - (s.az - az) * sx) / den, u = ((s.ax - ax) * rz - (s.az - az) * rx) / den;
      if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    return best;
  }
  function inHouse(x, z) {
    for (const h of houses) { const dx = x - h.x, dz = z - h.z, c = Math.cos(h.rot), s = Math.sin(h.rot); const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < HW + 0.3 && Math.abs(lz) < HD + 0.3) return true; }
    return false;
  }
  function houseAt(x, z) {
    for (let k = 0; k < houses.length; k++) { const h = houses[k], dx = x - h.x, dz = z - h.z, c = Math.cos(h.rot), s = Math.sin(h.rot); const lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < HW + 0.2 && Math.abs(lz) < HD + 0.2) return k; }
    return -1;
  }
  function placeName(x, z) {
    if (Math.hypot(x, z) < 13.5) return '광장';
    const hs = houseAt(x, z); if (hs >= 0) return `${hs + 1}번 집`;
    for (const h of hideSpots) if (Math.hypot(x - h.x, z - h.z) < 3.2) return h.name;
    let best = -1, bd = 6.5; houses.forEach((h, k) => { const d = Math.hypot(x - h.x, z - h.z); if (d < bd) { bd = d; best = k; } });
    if (best >= 0) return `${best + 1}번 집 앞`;
    return Math.hypot(x, z) > 40 ? `${dirName(x, z)}쪽 숲` : `${dirName(x, z)}쪽 길`;
  }
  function nearHide(x, z, r = 2.6) { for (const h of hideSpots) if (Math.hypot(x - h.x, z - h.z) < r) return h; return null; }
  function setOwner(k, name) { const p = plates[k]; if (p) p.userData.draw(name ? `${k + 1} · ${name}` : `${k + 1}번 집`, '#fff', name ? 'rgba(60,40,10,0.75)' : 'rgba(0,0,0,0.55)'); }
  const lampPos = lamps.map(l => ({ x: l.x, z: l.z }));
  return { seats, spawns, homes, hideSpots, bell, lampPos, hiddenPoint, collide, randomPoint, setNight, podiumLight, camClip, inHouse, houseAt, placeName, nearHide, setOwner, get night() { return nightK; } };
}

export function labelSprite(text, fg = '#fff', bg = 'rgba(0,0,0,0.5)') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true }));
  sp.userData.draw = (t, f, b) => {
    const x = c.getContext('2d'); x.clearRect(0, 0, 256, 64);
    x.font = 'bold 30px "Noto Sans KR", sans-serif'; const w = Math.min(250, x.measureText(t).width + 26);
    x.fillStyle = b; roundRect(x, 128 - w / 2, 8, w, 48, 10); x.fill();
    x.fillStyle = f; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 128, 33, 236);
    tex.needsUpdate = true;
  };
  sp.userData.draw(text, fg, bg);
  return sp;
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

// 콩 모양 캐릭터
export function makeAvatar(color, hat = 0) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const inner = new THREE.Group(); g.add(inner);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 6, 14), bodyMat); body.position.y = 0.82; body.castShadow = true; inner.add(body);
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }), black = new THREE.MeshBasicMaterial({ color: '#111' });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), white); e.position.set(sx * 0.15, 1.08, 0.36); e.scale.z = 0.6; inner.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), black); p.position.set(sx * 0.15, 1.08, 0.43); inner.add(p);
  }
  const cheek = new THREE.MeshBasicMaterial({ color: '#ff9e9e', transparent: true, opacity: 0.55 });
  for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), cheek); c.position.set(sx * 0.27, 0.93, 0.37); c.rotation.y = sx * 0.5; inner.add(c); }
  const feetMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) });
  const feet = [];
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), feetMat); f.scale.set(1, 0.6, 1.3); f.position.set(sx * 0.18, 0.1, 0.05); inner.add(f); feet.push(f); }
  addHat(inner, hat);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; g.add(shadow);
  const tag = labelSprite('', '#fff'); tag.position.y = 2.05; tag.scale.set(1.9, 0.48, 1); g.add(tag);
  const mark = labelSprite('', '#fff'); mark.position.y = 2.5; mark.scale.set(1.9, 0.48, 1); mark.visible = false; g.add(mark);
  let ghost = false, sit = false, lie = false, ph = Math.random() * 6, tagKey = '', markKey = '';
  const mats = [];
  inner.traverse(o => { if (o.isMesh) mats.push(o.material); });
  g.userData = {
    setName(t, fg = '#fff', bg = 'rgba(0,0,0,0.5)') { const k = t + fg + bg; if (k === tagKey) return; tagKey = k; tag.userData.draw(t, fg, bg); },
    setMark(t, bg = 'rgba(180,20,20,0.85)') { const k = t + bg; if (k === markKey) return; markKey = k; mark.visible = !!t; if (t) mark.userData.draw(t, '#fff', bg); },
    setGhost(on) {
      if (on === ghost) return; ghost = on;
      for (const m of new Set(mats)) { m.transparent = on; m.opacity = on ? 0.38 : 1; m.depthWrite = !on; }
      feet.forEach(f => f.visible = !on); shadow.visible = !on;
    },
    setSit(on) { sit = on; },
    setLie(on) { lie = on; },
    anim(dt, moving) {
      ph += dt * (moving ? 12 : 2);
      const bob = ghost ? 0.35 + Math.sin(ph * 0.5) * 0.12 : moving ? Math.abs(Math.sin(ph)) * 0.08 : Math.sin(ph) * 0.015;
      inner.position.y = lie ? 0.88 : (sit ? 0.5 : 0) + bob;
      inner.rotation.x = lie ? -Math.PI / 2 : 0;
      inner.rotation.z = moving && !ghost && !lie ? Math.sin(ph) * 0.08 : 0;
      if (!ghost) feet.forEach((f, i) => { f.position.z = 0.05 + (moving ? Math.sin(ph + i * Math.PI) * 0.16 : 0); f.position.y = sit ? 0.42 : 0.1; if (sit) f.position.z = 0.42; });
    },
    tag,
  };
  return g;
}

function addHat(p, hat) {
  if (!hat) return;
  const add = (geo, c, y, extra = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...extra })); m.position.y = y; p.add(m); return m; };
  if (hat === 1) { add(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20), '#2b2b2b', 1.5); add(new THREE.CylinderGeometry(0.28, 0.3, 0.34, 20), '#2b2b2b', 1.68); add(new THREE.CylinderGeometry(0.305, 0.305, 0.07, 20), '#b71c1c', 1.56); }
  else if (hat === 2) { const c = add(new THREE.CylinderGeometry(0.28, 0.26, 0.22, 8, 1, true), '#ffc107', 1.6, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }); c.rotation.y = 0.2; }
  else if (hat === 3) { for (const sx of [-1, 1]) { const b = add(new THREE.ConeGeometry(0.14, 0.3, 10), '#ff4f8b', 1.5); b.rotation.z = sx * Math.PI / 2; b.position.x = sx * 0.16; } add(new THREE.SphereGeometry(0.07, 8, 8), '#ff4f8b', 1.5); }
  else if (hat === 4) { const h = add(new THREE.SphereGeometry(0.47, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#455a64', 1.12); h.scale.set(1, 0.9, 1); }
  else if (hat === 5) { const s = add(new THREE.CylinderGeometry(0.02, 0.02, 0.25), '#558b2f', 1.6); for (const sx of [-1, 1]) { const l = add(new THREE.SphereGeometry(0.1, 10, 8), '#7cb342', 1.72); l.scale.set(1.4, 0.4, 0.8); l.position.x = sx * 0.1; l.rotation.z = sx * 0.4; } }
}
