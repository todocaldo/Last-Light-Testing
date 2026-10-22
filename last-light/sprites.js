/* ============================================================================
   LAST LIGHT — sprite renderer (Art wiring Phase 1, v2.2.0)
   ============================================================================
   Paints the battle and deploy grids onto one <canvas> that sits UNDER the
   existing HTML cells. The cells keep doing everything they did before (taps,
   move/attack washes, HP border, active outline, threat pulse, action popup);
   in art mode they are see-through and their glyph text is hidden.

   Rules this file keeps:
   - It only READS game state (G, GW, GH, MISSION_SETTINGS, ENEMY_TIERS,
     WEAPONS, CLASS_SPRITE_KEYS, getClassName). It never writes to G and the
     game never waits on it. The testing harness never loads this file.
   - If anything here throws repeatedly, art mode switches itself off and the
     game falls back to today's glyph grid.
   - A missing image falls back to that tile's glyph, drawn on the canvas.

   Phase 1 scope: stills only (frame 0), floors, terrain, objective, units,
   light and fog, duplicate labels, grid-size option A/B/C on phones.
   Idle loops, attack strips, fx(), badges and effects arrive in Phase 2.
   ============================================================================ */
(function(){
  'use strict';
  const ART = window.LL_ART;
  if(!ART || !ART.sprites) return; // no manifest -> stay in glyph mode
  if(typeof document === 'undefined' || !document.body) return;

  const ART_SIZE = 24;
  const PHONE_MAX_W = 647;          // below the 648px desktop breakpoint
  const SIDE_MARGIN = 16;           // per side, phone layout
  const LIGHT = {                   // sprite-art-spec "Light"
    dimRingDark: 1 - 0.68,          // dim ring at 68% brightness
    unlitDark:   1 - 0.35,          // explored-but-unlit at 35%
    litWash:  'rgba(245,207,122,0.06)',
    ringWash: 'rgba(138,95,34,0.13)'
  };
  const GLOW = { player:'rgba(226,163,61,0.55)', enemy:'rgba(138,111,194,0.60)' };
  const FALLBACK_COLORS = {          // mirrors the pre-art .cell CSS
    floor:['#100e0b','#8c8377'], obstacle:['#0c0b09','#5a5248'], highground:['#1a1712','#c9a876'],
    difficult:['#0f1a12','#4a7856'], objective:['#1c1608','#e2a33d'],
    player:['#20180a','#e2a33d'], enemy:['#180f22','#8a6fc2']
  };

  // ---------------------------------------------------------------- settings
  const MODES = ['A','B','C'];
  const store = window.store || { get:(k,d)=>d, set:()=>false };
  let gridMode = store.get('gridMode', 'C');
  if(!MODES.includes(gridMode)) gridMode = 'C';

  // ---------------------------------------------------------------- images
  const images = {};                // key -> {img, state:'loading'|'ok'|'missing'}
  let imagesVersion = 0;
  function sprite(key){
    if(!key) return null;
    let rec = images[key];
    if(!rec){
      const meta = ART.sprites[key];
      if(!meta){ images[key] = rec = {state:'missing'}; return null; }
      const img = new Image();
      rec = images[key] = {img, meta, state:'loading'};
      img.onload  = ()=>{ rec.state='ok'; imagesVersion++; };
      img.onerror = ()=>{ rec.state='missing'; imagesVersion++; };
      img.src = meta.src;
    }
    return rec.state==='ok' ? rec : null;
  }
  // Preload everything the battle grid can show, so the first battle doesn't pop in.
  Object.keys(ART.sprites).forEach(k=>{
    if(/^(floor_|terrain_|class_|weapon_|enemy_)/.test(k) && !/_f0$/.test(k)) sprite(k);
  });

  // Scaled-frame cache for option C (and any non-whole-number scale): the frame
  // is first blown up with nearest-neighbour to the next whole multiple, then the
  // canvas eases it down to the target size, so every art pixel comes out even.
  const scaledCache = new Map();
  function scaledFrame(rec, frame, k){
    const id = rec.meta.src+'|'+frame+'|'+k;
    let c = scaledCache.get(id);
    if(!c){
      c = document.createElement('canvas');
      c.width = c.height = ART_SIZE*k;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(rec.img, frame*rec.meta.fw, 0, rec.meta.fw, rec.meta.h, 0, 0, ART_SIZE*k, ART_SIZE*k);
      scaledCache.set(id, c);
    }
    return c;
  }

  // ---------------------------------------------------------------- lookups
  function floorVariant(x, y){        // spec "Terrain": fixed (x,y) hash, never random
    let h = (x*374761393 + y*668265263) >>> 0;
    h = Math.imul(h ^ (h>>>13), 1274126177) >>> 0;
    return ((h ^ (h>>>16)) >>> 0) % 3;
  }
  const ABC = ['a','b','c'];
  const ENEMY_KEY_BY_NAME = {};
  try{
    Object.values(ENEMY_TIERS).forEach(list=>list.forEach(e=>{ ENEMY_KEY_BY_NAME[e.name]=e.spriteKey; }));
  }catch(e){}

  function obstacleKey(setting, glyph, x, y){
    const cfg = MISSION_SETTINGS[setting];
    const type = cfg && cfg.obstacleTypes.find(t=>t.glyph===glyph);
    if(!type) return null;
    if(type.spriteKey==='terrain_wall' && setting==='ruins') return 'terrain_wall_ruins_'+ABC[floorVariant(x,y)];
    return type.spriteKey;
  }
  function playerKey(u){
    const cls = getClassName(u);
    if(!cls) return WEAPONS[u.weaponKey] && WEAPONS[u.weaponKey].spriteKey;
    const base = CLASS_SPRITE_KEYS[cls];
    if(u.specialization){
      const spec = base+'_'+String(u.specialization).toLowerCase().replace(/[^a-z]/g,'');
      if(ART.sprites[spec]) return spec;
    }
    return base;
  }
  function enemyKey(u){
    if(u.isCapstoneBoss && G.patron && G.patron.key){
      const k = 'enemy_capstone_'+G.patron.key;
      if(ART.sprites[k]) return k;
    }
    return ENEMY_KEY_BY_NAME[u.baseType] || null;
  }
  function facesFront(key){
    const m = ART.enemyAnim && ART.enemyAnim[key];
    return !!(m && m.faces==='front');
  }

  // ---------------------------------------------------------------- facing
  // Every sprite is drawn facing left. Phase 1 turns a unit to face its nearest
  // visible opponent, flipping only when that opponent is clearly on the other
  // side, and remembers the last facing so units don't twitch between renders.
  const facing = new Map();           // unit id -> 1 (left) | -1 (right)
  function faceFor(u, foes){
    let best=null, bestD=Infinity;
    for(const f of foes){ const d=Math.max(Math.abs(f.x-u.x),Math.abs(f.y-u.y)); if(d<bestD){bestD=d;best=f;} }
    let dir = facing.get(u.id) || 1;
    if(best){ if(best.x > u.x) dir = -1; else if(best.x < u.x) dir = 1; }
    facing.set(u.id, dir);
    return dir;
  }

  // ---------------------------------------------------------------- scene
  // Builds one plain description of what each tile shows, for battle or deploy,
  // using the same visibility rules renderBattle()/renderDeploy() use.
  function buildScene(){
    const scr = G.screen;
    const s = scr==='battle' ? G.battle : G.deploy;
    if(!s || !G.activeMission) return null;
    const setting = G.activeMission.setting;
    const lit = s.litTiles, full = s.fullyLitTiles, disc = s.discoveredTiles;
    const units = [];
    if(scr==='battle'){
      s.units.forEach(u=>{ if(u.alive) units.push(u); });
    } else {
      Object.entries(s.placed).forEach(([id,p])=>{
        const r = G.roster.find(rr=>rr.id===Number(id));
        if(r) units.push(Object.assign(Object.create(r), {x:p.x, y:p.y, side:'player', id:r.id}));
      });
      s.enemies.forEach(e=>units.push(e));
    }
    const objectives = (s.objectives||[]).filter(o=> scr==='battle' ? !o.claimed : true);
    return {scr, s, setting, lit, full, disc, units, objectives};
  }

  // ---------------------------------------------------------------- canvas
  let canvas = null, ctx = null, lastGrid = null, lastSig = '', lastDraw = 0, errorCount = 0;
  function ensureCanvas(grid){
    if(!canvas){
      canvas = document.createElement('canvas');
      canvas.className = 'll-art-canvas';
      canvas.setAttribute('aria-hidden','true');
      ctx = canvas.getContext('2d');
    }
    if(canvas.parentNode !== grid) grid.insertBefore(canvas, grid.firstChild);
  }

  function drawFrame(rec, frame, dx, dy, dw, mirror){
    const k = dw / ART_SIZE;
    const whole = Math.abs(k - Math.round(k)) < 1e-6;
    ctx.save();
    if(mirror){ ctx.translate(dx+dw, dy); ctx.scale(-1,1); dx = 0; dy = 0; }
    if(whole || gridMode==='B'){
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(rec.img, frame*rec.meta.fw, 0, rec.meta.fw, rec.meta.h, dx, dy, dw, dw);
    } else {
      const c = scaledFrame(rec, frame, Math.ceil(k));
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(c, dx, dy, dw, dw);
    }
    ctx.restore();
  }
  function drawGlyph(ch, colors, dx, dy, dw, withBg){
    if(withBg){ ctx.fillStyle = colors[0]; ctx.fillRect(dx, dy, dw, dw); }
    if(!ch) return;
    ctx.fillStyle = colors[1];
    ctx.font = `bold ${Math.round(dw*(ch.length>1?0.39:0.53))}px "Courier New", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, dx+dw/2, dy+dw/2+1);
  }
  function drawFootGlow(side, dx, dy, dw){
    const cx = dx+dw/2, cy = dy+dw*0.86, rx = dw*0.42, ry = dw*0.16;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, GLOW[side]); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry/rx); ctx.translate(-cx, -cy);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawLabel(text, side, dx, dy, dw, dpr){
    const px = Math.max(7*dpr, Math.round(dw*0.30));
    ctx.font = `bold ${px}px "Courier New", monospace`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    const x = dx+dw-Math.max(1,Math.round(dw*0.04)), y = dy+Math.max(1,Math.round(dw*0.02));
    ctx.lineWidth = Math.max(2, Math.round(px*0.28)); ctx.strokeStyle = '#1e1712'; ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = side==='player' ? '#f5cf7a' : '#b9a3e6';
    ctx.fillText(text, x, y);
  }

  function draw(grid){
    const scene = buildScene();
    if(!scene) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = grid.clientWidth, cssH = grid.clientHeight;
    const cs = cssW / GW;                       // CSS px per cell (gap is 0 in art mode)
    const W = Math.round(cssW*dpr), H = Math.round(cssH*dpr);
    if(canvas.width!==W || canvas.height!==H){ canvas.width=W; canvas.height=H; }
    canvas.style.width = cssW+'px'; canvas.style.height = cssH+'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    const edge = i => Math.round(i*cs*dpr);
    const {s, setting, lit, full, disc} = scene;
    const unitAt = new Map();
    scene.units.forEach(u=>unitAt.set(u.x+','+u.y, u));
    const players = scene.units.filter(u=>u.side==='player');
    const visibleEnemies = scene.units.filter(u=>u.side==='enemy' && (!lit || lit.has(u.x+','+u.y)));

    // duplicate labels: only when two living, visible units on a side share a glyph
    const glyphCount = {};
    const glyphOf = u => u.side==='player' ? (WEAPONS[u.weaponKey]||{}).glyph : u.glyph;
    players.concat(visibleEnemies).forEach(u=>{ const g=u.side+':'+glyphOf(u); glyphCount[g]=(glyphCount[g]||0)+1; });

    const labels = [];
    for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){
      const key = x+','+y;
      const dx = edge(x), dy = edge(y), dw = edge(x+1)-dx;
      const isDisc = !disc || disc.has(key);
      if(!isDisc) continue;                    // fog: stays black
      const isLit = !lit || lit.has(key);
      const isFull = !full || full.has(key);

      // floor
      const fl = sprite('floor_'+setting+'_'+ABC[floorVariant(x,y)]);
      if(fl) drawFrame(fl, 0, dx, dy, dw, false); else drawGlyph('.', FALLBACK_COLORS.floor, dx, dy, dw, true);

      // terrain feature (same priority as the render code: obstacle > high ground > difficult)
      if(s.obstacles.has(key)){
        const g = (s.obstacleGlyphs && s.obstacleGlyphs.get(key)) || '▓';
        const t = sprite(obstacleKey(setting, g, x, y));
        if(t) drawFrame(t, 0, dx, dy, dw, false); else drawGlyph(g, FALLBACK_COLORS.obstacle, dx, dy, dw, true);
      } else if(s.highGround && s.highGround.has(key)){
        const t = sprite(TILE_SPRITE_KEYS.highGround+'_'+setting) || sprite(TILE_SPRITE_KEYS.highGround);
        if(t) drawFrame(t, 0, dx, dy, dw, false); else drawGlyph('^', FALLBACK_COLORS.highground, dx, dy, dw, true);
      } else if(s.difficultTerrain && s.difficultTerrain.has(key)){
        const t = sprite(TILE_SPRITE_KEYS.difficult+'_'+setting);
        if(t) drawFrame(t, 0, dx, dy, dw, false); else drawGlyph('~', FALLBACK_COLORS.difficult, dx, dy, dw, true);
      }

      // objective (battle: any unclaimed; deploy: only where lit -- as the render code does)
      const objHere = scene.objectives.some(o=>o.x===x&&o.y===y) && (scene.scr==='battle' || isLit);
      const unit = unitAt.get(key);
      const unitVisible = unit && (unit.side==='player' || isLit);
      if(objHere){
        const t = sprite(TILE_SPRITE_KEYS.objective);
        if(t) drawFrame(t, 0, dx, dy, dw, false); else drawGlyph('✦', FALLBACK_COLORS.objective, dx, dy, dw, true);
      }

      // unit
      if(unitVisible){
        const isPlayer = unit.side==='player';
        const k = isPlayer ? playerKey(unit) : enemyKey(unit);
        const rec = sprite(k);
        if(rec){
          drawFootGlow(unit.side, dx, dy, dw);
          const front = !isPlayer && facesFront(k);
          const dir = front ? 1 : faceFor(unit, isPlayer ? visibleEnemies : players);
          drawFrame(rec, 0, dx, dy, dw, dir===-1);
        } else {
          const ch = isPlayer ? (WEAPONS[unit.weaponKey]||{}).glyph : unit.glyph;
          drawGlyph(ch, FALLBACK_COLORS[unit.side], dx, dy, dw, true);
        }
        if(glyphCount[unit.side+':'+glyphOf(unit)]>1 && unit.label) labels.push([unit.label, unit.side, dx, dy, dw]);
      }

      // light and fog
      if(!isLit){ ctx.fillStyle = `rgba(0,0,0,${LIGHT.unlitDark})`; ctx.fillRect(dx,dy,dw,dw); }
      else if(!isFull){
        ctx.fillStyle = `rgba(0,0,0,${LIGHT.dimRingDark})`; ctx.fillRect(dx,dy,dw,dw);
        ctx.fillStyle = LIGHT.ringWash; ctx.fillRect(dx,dy,dw,dw);
      } else { ctx.fillStyle = LIGHT.litWash; ctx.fillRect(dx,dy,dw,dw); }
    }
    labels.forEach(l=>drawLabel(l[0], l[1], l[2], l[3], l[4], dpr));
  }

  // ---------------------------------------------------------------- layout
  // Phone cell size for the three grid options (proposal, "Grid size on phones").
  function phoneCellSize(){
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    if(vw > PHONE_MAX_W) return null;          // desktop keeps its 48/72px breakpoints
    const dpr = window.devicePixelRatio || 1;
    // Measure the card the grid sits in (it already accounts for safe-area
    // padding); fall back to the proposal's 16px side margins.
    const grid = currentGrid();
    const card = grid && grid.closest('.battlegrid-card');
    const avail = (card && card.clientWidth > 0) ? card.clientWidth - 2 : vw - SIDE_MARGIN*2;
    if(gridMode==='A'){
      const k = Math.max(1, Math.floor(avail*dpr/(GW*ART_SIZE)));
      return ART_SIZE*k/dpr;                   // whole device pixels per art pixel
    }
    return Math.max(ART_SIZE, Math.floor(avail/GW));
  }
  let lastCell = null;
  function applyCellSize(){
    const c = phoneCellSize();
    if(c === lastCell) return;
    lastCell = c;
    if(c===null) document.documentElement.style.removeProperty('--cell-size');
    else document.documentElement.style.setProperty('--cell-size', c+'px');
  }

  // Small switch so the A/B/C choice can be judged on a real phone. It lives in
  // the persistent header (render() never rebuilds that element), and CSS shows
  // it only on the battle/deploy compact header at phone widths.
  let modeSwitch = null;
  function ensureModeSwitch(){
    if(modeSwitch) return;
    const header = document.getElementById('mainHeader');
    if(!header) return;
    const el = modeSwitch = document.createElement('div');
    el.className = 'll-gridmode';
    el.innerHTML = '<span>Grid size</span>' + MODES.map(m=>`<button type="button" data-mode="${m}">${m}</button>`).join('') +
      '<small>A crisp · B fill · C fill, smooth</small>';
    el.addEventListener('click', ev=>{
      const b = ev.target.closest('button[data-mode]');
      if(!b) return;
      ev.stopPropagation();
      gridMode = b.dataset.mode; store.set('gridMode', gridMode);
      lastSig = ''; applyCellSize(); syncModeSwitch(el);
    });
    header.appendChild(el);
    syncModeSwitch(el);
  }
  function syncModeSwitch(el){
    el.querySelectorAll('button[data-mode]').forEach(b=>b.classList.toggle('on', b.dataset.mode===gridMode));
  }

  // ---------------------------------------------------------------- loop
  function sceneSignature(grid){
    return [grid.clientWidth, grid.clientHeight, window.devicePixelRatio, imagesVersion, gridMode].join('|');
  }
  function currentGrid(){
    if(!document.body.classList.contains('ll-art')) return null;
    let scr;
    try{ scr = G && G.screen; }catch(e){ return null; }
    if(scr!=='battle' && scr!=='deploy') return null;
    return document.querySelector(scr==='battle' ? '#screenBattle .grid' : '#screenDeploy .grid');
  }
  function update(now, force){
    const grid = currentGrid();
    if(!grid) return;
    ensureCanvas(grid);
    const sig = sceneSignature(grid);
    // render() rebuilds the grid element on every state change, so a new grid
    // element is the "something changed" signal; the 400ms refresh is a backstop.
    if(!force && grid===lastGrid && sig===lastSig && now-lastDraw < 400) return;
    try{
      draw(grid);
      lastGrid = grid; lastSig = sig; lastDraw = now; errorCount = 0;
    }catch(e){
      errorCount++;
      if(errorCount===1) console.error('[Last Light art]', e);
      if(errorCount>=5){
        document.body.classList.remove('ll-art');
        document.documentElement.style.removeProperty('--cell-size');
        console.warn('[Last Light art] disabled after repeated errors; showing glyphs.');
      }
    }
  }
  function tick(now){
    requestAnimationFrame(tick);
    if(!currentGrid()) return;
    applyCellSize();
    ensureModeSwitch();
    update(now, false);
  }

  document.body.classList.add('ll-art');
  applyCellSize();
  // render() replaces the grid's HTML synchronously; redraw in the same task
  // (a MutationObserver callback runs before the browser paints), so a new grid
  // never shows a frame without its art underneath.
  const mo = new MutationObserver(()=>{ applyCellSize(); update(performance.now(), true); });
  ['screenBattle','screenDeploy'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) mo.observe(el, {childList:true});
  });
  window.addEventListener('resize', ()=>{ lastSig=''; applyCellSize(); });
  window.addEventListener('orientationchange', ()=>{ lastSig=''; applyCellSize(); });
  requestAnimationFrame(tick);

  // Exposed for debugging and the phase screenshots; not used by the game.
  window.LLSprites = {
    get mode(){ return gridMode; },
    setMode(m){ if(MODES.includes(m)){ gridMode=m; store.set('gridMode',m); lastSig=''; applyCellSize(); } },
    redraw(){ lastSig=''; },
    missing(){ return Object.entries(images).filter(([k,r])=>r.state==='missing').map(([k])=>k); }
  };
})();
