/* Presentation-only icon layer. Original text is retained for game comparisons. */
(() => {
  const P = {
    moon:'M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z',
    sun:'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    knife:'M15 3 4 14l6 1L20 5l-5-2ZM10 15l5 6 3-3-5-6',
    sword:'M14 3h7v7L10 21l-3-3L18 7M5 13l6 6M3 21l4-4',
    shield:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z',
    badge:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',
    medical:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
    crown:'M3 6l5 5 4-7 4 7 5-5-2 13H5L3 6Zm3 10h12',
    bell:'M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3Zm5 4h4M12 2v2',
    paper:'M6 3h12v18H6V3Zm3 5h6m-6 4h6m-6 4h4',
    stone:'m8 3 8 1 4 8-3 9H6L3 12 8 3Zm0 8h2m4 0h2m-6 5h4',
    person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3',
    cards:'M6 3h13v17H6V3Zm-3 3v16h13M12 7l3 4-3 4-3-4 3-4Z',
    fire:'M13 2c1 6 6 7 6 13a7 7 0 0 1-14 0c0-3 2-6 4-8 0 4 2 5 3 5s3-5 1-10Z',
    mail:'M3 6h18v14H3V6Zm0 0 9 8 9-8M9 3h6',
    broom:'m16 3-7 12m-4-3 9 5-4 5-8-5 3-5Zm1 3-2 3m5-1-2 3',
    trap:'M3 18h18v3H3v-3Zm2-1 1-5 3 4 3-5 3 5 3-4 1 5M8 8l4-5 4 5',
    search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0m-2 5 7 7',
    lock:'M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4M12 14v3',
    steps:'M6 3c4 0 4 8 1 8S2 3 6 3Zm1 11 1 3-3 1-1-3 3-1Zm10-6c4 0 4 8 1 8s-5-8-1-8Zm1 11 1 3-3 1-1-3 3-1Z',
    lantern:'M8 3h8M9 3v3m6-3v3M7 6h10l2 12H5L7 6Zm-1 15h12M12 9v6',
    torch:'m5 3 8 3-1 6-7-2V3Zm1 8-2 10h4l3-9M17 5l3-2m-4 7h5',
    home:'m3 10 9-8 9 8M5 9v12h14V9M9 21v-8h6v8',
    dice:'M4 3h16v18H4V3Zm4 5h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
    urn:'M8 3h8M9 3v4c-8 6-5 13 3 13s11-7 3-13V3M7 22h10M7 12h10',
    telescope:'m3 9 14-6 4 8-14 6-4-8Zm8 7-3 6m5-7 3 7',
    link:'m10 14-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 4 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0m-4-4 8-8',
    fog:'M7 17a4 4 0 1 1 1-7 5 5 0 0 1 9-1 4 4 0 1 1 1 8H7Zm-3 3h.01M1 23h.01M17 3a3 3 0 0 0 4 4 4 4 0 0 1-4-4Z',
    wave:'M2 7q3-5 6 0t6 0 6 0M2 12q3-5 6 0t6 0 6 0M2 17q3-5 6 0t6 0 6 0',
    eye:'M2 12S6 5 12 5s10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    mask:'M3 5c6 3 12 3 18 0v8c0 4-9 9-9 9s-9-5-9-9V5Zm4 6h3m4 0h3m-8 5h6',
    wolf:'m3 3 6 4h6l6-4-1 13-8 6-8-6L3 3Zm4 9h2m6 0h2m-7 5h4',
    cup:'M4 3h12v16H4V3Zm12 3h5v8h-5M3 22h14M8 7v8m4-8v8',
    axe:'m5 3 13 18M8 7l4-4 9 5-6 6-7-7Z',
    bow:'M5 3q22 9 0 18L17 12 5 3Zm-3 9h19m-4-3 4 3-4 3',
    phone:'M6 2h12v20H6V2Zm4 3h4m-3 16h2',
    book:'M12 5C8 2 5 2 2 3v17c4-1 7 0 10 2 3-2 6-3 10-2V3c-3-1-6-1-10 2Zm0 0v17',
    people:'M14 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M3 21v-4a7 7 0 0 1 14 0v4M17 4a3 3 0 0 1 0 6m2 3c3 1 3 4 3 8',
    chat:'M3 3h18v14H9l-6 5V3Z',
    check:'m4 12 5 5L20 5',
    cross:'m5 5 14 14M19 5 5 19',
    pin:'M18 9c0 5-6 13-6 13S6 14 6 9a6 6 0 1 1 12 0Zm-4 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    sparkle:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
    sound:'M3 9h4l5-5v16l-5-5H3V9Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16',
    mute:'M3 9h4l5-5v16l-5-5H3V9Zm13 0 6 6m0-6-6 6',
    door:'M5 21V3h14v18M9 3v18m6-9h.01M2 21h20',
    bed:'M3 7v15m0-5h18v5M3 10h18v7M6 7h5v3',
    skull:'M8 17a8 8 0 1 1 8 0v5H8v-5Zm0-6h1m6 0h1m-4 8v3',
    bot:'M4 7h16v13H4V7Zm4 5h1m6 0h1m-7 4h6M12 3v4M1 11v5m22-5v5',
    flag:'M5 22V3h14l-3 5 3 5H5',
    vote:'M4 12h16v10H4V12Zm3 3h10M9 2l10 4-4 10-10-4L9 2Z',
    balance:'M12 2v20M5 22h14M3 6h18M5 6l-4 8h8L5 6Zm14 0-4 8h8l-4-8Z',
    gear:'M12 3v3m0 12v3M3 12h3m12 0h3M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    refresh:'M3 11a9 9 0 0 1 16-6l2 3M21 3v5h-5M21 13A9 9 0 0 1 5 19l-2-3m0 5v-5h5',
    ghost:'M4 22V10a8 8 0 1 1 16 0v12l-4-3-4 3-4-3-4 3Zm4-12h1m6 0h1',
    pencil:'m3 17 14-14 4 4L7 21H3v-4Zm11-11 4 4',
    hand:'M6 12V6h3v6-9h3v9-8h3v9-6h3v10l-4 5H8l-5-8 3-2Z',
    target:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-4 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0M12 12h.01',
    globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
    lamp:'M8 16a7 7 0 1 1 8 0v3H8v-3Zm1 6h6M10 12l2 2 2-2m-2 2v5',
    trophy:'M7 3h10v8a5 5 0 0 1-10 0V3ZM7 5H3v5l4 2m10-7h4v5l-4 2M12 16v6m-5 0h10',
    controller:'M6 6h12l4 13-6-1-2-3h-4l-2 3-6 1L6 6Zm0 5h4m-2-2v4m8-3h.01m2 3h.01',
    pack:'M6 7h12v15H6V7Zm3 0V2h6v5M9 13h6v6H9v-6Z',
    barrel:'M6 3h12l2 9-2 9H6l-2-9 2-9Zm-1 5h14M5 16h14',
    grave:'M6 21V8a6 6 0 0 1 12 0v13M3 21h18M9 9h6m-3-3v9',
  };
  const groups = {
    moon:'🌙 😴 🥱',sun:'☀️ 🌅',knife:'🔪',sword:'🗡️ ⚔️',shield:'🛡️',badge:'🚓',medical:'💉',crown:'👑',bell:'🔔',paper:'📜 📋',stone:'🗿',person:'🧑 🧑‍🌾',cards:'🃏',fire:'🔥',mail:'🤐',broom:'🧹',trap:'🪤',search:'🔍 🔎',lock:'🔒',steps:'👣',lantern:'🏮 🕯️',torch:'🔦',home:'🏠 🏘️',dice:'🎲',urn:'⚱️',telescope:'🔭',link:'🔗 🤝',fog:'🌫️',wave:'🌊',eye:'👁️ 👀',mask:'🎭 🕵️ 🦹 🦝',wolf:'🐺',cup:'🍺',axe:'🪓',bow:'🏹',phone:'📱',book:'📒 📖',people:'👥',chat:'💬 🗣️',check:'✅ ✔ 👍',cross:'✕ ✖',pin:'📍',sparkle:'✨ 💫 🎉 🔮',sound:'📢 🔊',mute:'🔇 😶',door:'🚪',bed:'🛏️',skull:'💀 😵',bot:'🤖',flag:'🚨',vote:'🗳️',balance:'⚖️',gear:'⚙️',refresh:'🔁',ghost:'👻',pencil:'📝',hand:'✋ 🙌 🫳 👉',target:'🎯 🔴',globe:'🌐',lamp:'💡',trophy:'🏆',controller:'🕹️',pack:'🎒',barrel:'🛢️',grave:'🪦',shield:'🛡️ 🕊️',steps:'👣 🍂',flag:'🚨 🚀 ❔'
  };
  const map = new Map();
  for (const [name, glyphs] of Object.entries(groups)) for (const glyph of glyphs.split(' ')) map.set(glyph, name);
  const regex = new RegExp([...map.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
  const style = document.createElement('style');
  style.textContent = '.ui-icon{display:inline-flex;position:relative;width:1.05em;height:1.05em;vertical-align:-.15em;align-items:center;justify-content:center;pointer-events:none;flex-shrink:0}.ui-icon svg{width:100%;height:100%;overflow:visible;pointer-events:none}.ui-icon-original{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.roleBig .ui-icon,.dexi .ui-icon{color:var(--acc,#d5b97b)}';
  document.head.append(style);
  const excluded = '.ui-icon,script,style,textarea,input,select,canvas,svg,[contenteditable],#chatLog,.nm,#nick,#roomCode,#roomTag';
  function replace(node) {
    if (!node.parentElement || node.parentElement.closest(excluded)) return;
    const raw = node.nodeValue;
    regex.lastIndex=0;
    if (!regex.test(raw)) return;
    regex.lastIndex=0;
    const frag=document.createDocumentFragment(); let last=0;
    for (const m of raw.matchAll(regex)) {
      frag.append(document.createTextNode(raw.slice(last,m.index)));
      const holder=document.createElement('span'); holder.className='ui-icon'; holder.setAttribute('aria-hidden','true');
      const original=document.createElement('span'); original.className='ui-icon-original'; original.textContent=m[0]; holder.append(original);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','1.65'); svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round');
      const path=document.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d',P[map.get(m[0])]); svg.append(path); holder.append(svg); frag.append(holder); last=m.index+m[0].length;
    }
    frag.append(document.createTextNode(raw.slice(last))); node.replaceWith(frag);
  }
  function scan(root) {
    if(root.nodeType===3) { replace(root); return; }
    if(root.nodeType!==1 || root.matches(excluded)) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replace);
  }
  // SVG content must never take delegated button events away from its parent.
  const labels={btnSide:'플레이어 목록',btnChatT:'채팅 크기 변경',btnMenu:'메뉴',pDex:'직업 도감',pQuit:'닫기',chatSend:'메시지 보내기'};
  function nameButtons(root) {
    if(root.nodeType!==1)return;
    for(const [id,label] of Object.entries(labels)) { const b=root.id===id?root:root.querySelector('#'+id); if(b&&!b.hasAttribute('aria-label'))b.setAttribute('aria-label',label); }
  }
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    for(const r of records){if(r.type==='characterData')replace(r.target);else for(const node of r.addedNodes){scan(node);nameButtons(node);}}
    observe();
  });
  function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
  scan(document.body); nameButtons(document.body); observe();
})();
