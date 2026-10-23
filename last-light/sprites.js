/* ============================================================================
   LAST LIGHT — sprite renderer (Art wiring Phases 1–2, v2.2.1)
   ============================================================================
   Paints the battle and deploy grids onto one <canvas> that sits UNDER the
   existing HTML cells. The cells keep doing everything they did before (taps,
   move/attack washes, HP border, active outline, threat pulse, action popup);
   in art mode they are see-through and their glyph text is hidden.

   Rules this file keeps:
   - It only READS game state (G, GW, GH, MISSION_SETTINGS, ENEMY_TIERS,
     WEAPONS, CLASS_SPRITE_KEYS, getClassName). It never writes to G and the
     game never waits on it. The testing harness never loads this file.
   - The game reports events through fx(type, data) (a no-op in the game
     core); this file installs the real handler. Deaths, damage from sources
     with no fx() call (spores, splash, thorns) and new arrivals are noticed
     by comparing each unit's hp/alive between frames.
   - If anything here throws repeatedly, art mode switches itself off and the
     game falls back to the glyph grid.
   - A missing image falls back to that tile's glyph, drawn on the canvas.

   Phase 1 (v2.2.0): floors, terrain, objective, units, light and fog,
     duplicate labels, phone grid-size option A/B/C.
   Phase 3 (v2.2.2): LL_ICON_HTML / LL_PORTRAIT_HTML / LL_TILE_HTML, which the
     game's ic() / portraitBox() / tic() call to swap emoji, letter portraits and
     Battle Key symbols for the pixel icons, sprite portraits and real tiles.
   Phase 2 (v2.2.1): idle loops, attack / Heal / Cast Bolt / ability strips,
     Brood Swarm frame, projectiles (arrow, violet bolt), hit flash + shake +
     spark, heal motes, death fade-and-drop, fade-in for new arrivals, elite /
     mutation / Elder / capstone / Awakening / Endless Bout phase-2 effects,
     boss aura, objective pulse, healer/caster badges on recruits.
   ============================================================================ */
(function(){
  'use strict';
  const ART = window.LL_ART;
  if(!ART || !ART.sprites) return; // no manifest -> stay in glyph mode
  if(typeof document === 'undefined' || !document.body) return;

  const ART_SIZE = 24;
  const PAD = 3;                     // effect canvases extend 3 art px past the sprite
  const PHONE_MAX_W = 647;           // below the 648px desktop breakpoint
  const SIDE_MARGIN = 16;            // per side, phone layout
  const LIGHT = {                    // sprite-art-spec "Light"
    dimRingDark: 1 - 0.68,           // dim ring at 68% brightness
    unlitDark:   1 - 0.35,           // explored-but-unlit at 35%
    litWash:  'rgba(245,207,122,0.06)',
    ringWash: 'rgba(138,95,34,0.13)'
  };
  const GLOW = { player:'rgba(226,163,61,0.55)', enemy:'rgba(138,111,194,0.60)' };
  const PAL = { O:'#1e1712', S:'#3a322a', h:'#f2ead8', e:'#8a5f22', E:'#e2a33d', y:'#f5cf7a',
    r:'#5e2323', R:'#9c3b3b', c:'#4b3a70', C:'#8a6fc2', v:'#b9a3e6', m:'#3f5236', g:'#7a9c6a' };
  const FALLBACK_COLORS = {          // mirrors the pre-art .cell CSS
    floor:['#100e0b','#8c8377'], obstacle:['#0c0b09','#5a5248'], highground:['#1a1712','#c9a876'],
    difficult:['#0f1a12','#4a7856'], objective:['#1c1608','#e2a33d'],
    player:['#20180a','#e2a33d'], enemy:['#180f22','#8a6fc2']
  };

  // ---------------------------------------------------------------- timing
  const T = {
    frameMs: 110,            // one beat of an attack strip
    playerIdleMs: 1600,      // player idle loop (A/B bob), enemies use their manifest idle_ms
    flashMs: 70,             // 1-frame white hit flash, before the spark
    shakeMs: 200,
    deathMs: 520,            // fade-and-drop
    fadeInMs: 260,
    projectileMsPerCell: 120,// about half a cell per 60ms (spec "Effects")
    objectiveFrameMs: 180,
    elitePulseMs: 1400, elderPulseMs: 2800, frogHopMs: 900,
    idleFps: 30
  };
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};

  // Player strips (sprite-art-spec). sig = Heal / Cast Bolt sequence for the
  // Guardian and Arcanist lines; everything else (attacks, Lv2 abilities,
  // Lv3 skills) plays `strike`. Arcanist split set by Randall 2026-10-23,
  // with the last strike frame held for an extra beat.
  const GUARDIAN = {sig:[2,3,4,0], strike:[5,6,7,0]};
  const ARCANIST = {sig:[2,3,4,5,0], strike:[6,7,7,0]};
  const PLAYER_ANIM = {
    weapon_longsword:{strike:[2,3,3,0]}, weapon_spear:{strike:[2,3,3,0]},
    weapon_longbow:{strike:[2,2,3,0]}, weapon_quarterstaff:{strike:[2,3,3,0]},
    weapon_dagger:{strike:[2,3,4,0]},
    class_vanguard:{strike:[2,3,4,2,0]}, class_duelist:{strike:[2,3,2,4,5,0]},
    class_rogue:{strike:[2,3,4,5,6,0]}, class_ranger:{strike:[2,3,3,4,0]},
    class_primal:{strike:[2,3,4,5,6,0], ms:85},
    class_guardian:GUARDIAN, class_guardian_sunborn:GUARDIAN, class_guardian_lightwalker:GUARDIAN,
    class_arcanist:ARCANIST, class_arcanist_spellbinder:ARCANIST, class_arcanist_blightcaller:ARCANIST,
    class_vanguard_anvil:{strike:[2,3,4,2,0]}, class_vanguard_hammer:{strike:[2,3,4,5,0]},
    class_duelist_stormdancer:{strike:[2,3,4,5,0]}, class_duelist_bloodbound:{strike:[2,3,4,5,0]},
    class_rogue_bladedancer:{strike:[2,3,4,5,6,0]}, class_rogue_deathmark:{strike:[2,3,4,5,6,0]},
    class_ranger_hawkeye:{strike:[2,3,3,4,0]}, class_ranger_blacksky:{strike:[2,3,3,4,0]},
    class_primal_tigerform:{strike:[2,3,4,5,0], ms:95}, class_primal_bearform:{strike:[2,3,3,0]}
  };
  const ARROW_SHOOTERS = /^(weapon_longbow|class_ranger)/;

  // ---------------------------------------------------------------- settings
  const MODES = ['A','B','C'];
  const store = window.store || { get:(k,d)=>d, set:()=>false };
  let gridMode = store.get('gridMode', 'B');   // B chosen by Randall 2026-10-22; A/C stay on the switch
  if(!MODES.includes(gridMode)) gridMode = 'B';

  // ---------------------------------------------------------------- images
  const images = {};                // key -> {img, meta, state:'loading'|'ok'|'missing'}
  let imagesVersion = 0;
  function sprite(key){
    if(!key) return null;
    let rec = images[key];
    if(!rec){
      const meta = ART.sprites[key];
      if(!meta){ images[key] = rec = {state:'missing'}; return null; }
      const img = new Image();
      rec = images[key] = {img, meta, state:'loading', frames:[]};
      img.onload  = ()=>{ rec.state='ok'; imagesVersion++; };
      img.onerror = ()=>{ rec.state='missing'; imagesVersion++; };
      img.src = meta.src;
    }
    return rec.state==='ok' ? rec : null;
  }
  Object.keys(ART.sprites).forEach(k=>{
    if(/^(floor_\w+_[abc]$|terrain_|class_|weapon_|enemy_|fx_|ui_badge_)/.test(k) && !/_f0$/.test(k)) sprite(k);
    if(/^icon_(?!s$)/.test(k)) sprite(k);
  });
  function frameCount(rec){ return rec.meta.frames || 1; }
  // One frame of a strip as its own small canvas (cached).
  function frameCanvas(rec, i){
    i = Math.max(0, Math.min(frameCount(rec)-1, i|0));
    let c = rec.frames[i];
    if(!c){
      c = document.createElement('canvas');
      c.width = rec.meta.fw; c.height = rec.meta.h;
      c.getContext('2d', {willReadFrequently:true}).drawImage(rec.img, i*rec.meta.fw, 0, rec.meta.fw, rec.meta.h, 0, 0, rec.meta.fw, rec.meta.h);
      rec.frames[i] = c;
    }
    return c;
  }

  // ---------------------------------------------------------------- silhouette effects
  // Every elite/mutation effect is computed from the sprite's own silhouette
  // (sprite-art-spec "Elite and mutation effects"), so it works on any enemy.
  const effectCache = new Map();
  function hash2(x, y){ let h=(x*374761393 + y*668265263)>>>0; h=Math.imul(h^(h>>>13),1274126177)>>>0; return ((h^(h>>>16))>>>0); }
  function effectCanvas(rec, frame, kind){
    const id = rec.meta.src+'|'+frame+'|'+kind;
    let c = effectCache.get(id);
    if(c) return c;
    const src = frameCanvas(rec, frame);
    const w = src.width, h = src.height, W = w+PAD*2, H = h+PAD*2;
    const data = src.getContext('2d').getImageData(0,0,w,h).data;
    const inside = (x,y)=> x>=0&&y>=0&&x<w&&y<h && data[(y*w+x)*4+3]>0;
    // distance (Chebyshev-free, 4-neighbour rings) from the silhouette, up to 3
    const dist = new Uint8Array(W*H).fill(9);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(inside(x,y)) dist[(y+PAD)*W+x+PAD]=0;
    for(let ring=1; ring<=3; ring++){
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        if(dist[y*W+x]!==9) continue;
        const n = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>{ const X=x+dx,Y=y+dy; return X>=0&&Y>=0&&X<W&&Y<H&&dist[Y*W+X]===ring-1; });
        if(n) dist[y*W+x]=ring;
      }
    }
    c = document.createElement('canvas'); c.width=W; c.height=H;
    const x2 = c.getContext('2d');
    const put = (x,y,col)=>{ x2.fillStyle=col; x2.fillRect(x,y,1,1); };
    let minY=H, maxY=0, sumX=0, n=0;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(dist[y*W+x]===0){ minY=Math.min(minY,y); maxY=Math.max(maxY,y); sumX+=x; n++; }
    const cx = n ? Math.round(sumX/n) : W/2;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const d = dist[y*W+x];
      const upperLeft = (x+y) < (W+H)/2 + 2;
      switch(kind){
        case 'flash': if(d===0) put(x,y,PAL.h); break;
        case 'ghost': if(d===0) put(x,y,PAL.c); break;
        case 'ghostC': if(d===0) put(x,y,PAL.C); break;
        case 'tintR': if(d===0) put(x,y,PAL.R); break;
        case 'rimV': if(d===1) put(x,y,PAL.v); break;
        case 'rimC': if(d===1) put(x,y,PAL.C); break;
        case 'rimR': if(d===1) put(x,y,PAL.R); break;
        case 'rimr': if(d===1) put(x,y,PAL.r); break;
        case 'rimY': if(d===1) put(x,y,PAL.y); break;
        case 'rimE': if(d===1) put(x,y,PAL.E); break;
        case 'rim2V': if(d===2) put(x,y,PAL.v); break;
        case 'rim2C': if(d===2) put(x,y,PAL.C); break;
        case 'haze': if(d===2 && upperLeft && ((x+y)&1)===0) put(x,y,PAL.c); break;
        case 'hazeWide': if((d===2 && ((x+y)&1)===0) || (d===3 && upperLeft && (x%2===0) && (y%2===0))) put(x,y,PAL.c); break;
        case 'hazeBloat': if(d===3 && upperLeft && ((x+y)&1)===0) put(x,y,PAL.c); break;
        case 'bloat':
          if(d===1) put(x,y, (hash2(x,y)%4===0) ? PAL.g : PAL.S);
          else if(d===0 && hash2(x+7,y+3)%17===0) put(x,y, (hash2(x,y)&1) ? PAL.g : PAL.m);
          break;
      }
    }
    if(kind==='crack' || kind==='crackB' || kind==='crackWide' || kind==='crackWideB'){
      const wide = kind.startsWith('crackWide'), alt = kind.endsWith('B');
      const jag = [0,1,0,-1];
      for(let y=minY+2; y<=maxY-1; y++){
        const x = cx + jag[y%4];
        const cells = wide ? [x, x+1] : [x];
        if(!cells.every(xx=>dist[y*W+xx]===0)) continue;
        cells.forEach((xx,i)=>put(xx,y, ((y+i+(alt?1:0))&1) ? PAL.v : PAL.C));
        [cells[0]-1, cells[cells.length-1]+1].forEach(xx=>{ if(dist[y*W+xx]===0) put(xx,y,PAL.O); });
      }
    }
    if(kind==='embers'){
      const top = minY + Math.round((maxY-minY)*0.25), mid = minY + Math.round((maxY-minY)*0.55);
      for(let i=0;i<5;i++){ const x=cx-3+i, y=top+i; if(dist[y*W+x]===0) put(x,y, i&1?PAL.E:PAL.y); }
      for(let i=0;i<4;i++){ const x=cx+3-i, y=mid+i; if(dist[y*W+x]===0) put(x,y, i&1?PAL.y:PAL.E); }
    }
    effectCache.set(id, c);
    return c;
  }

  // ---------------------------------------------------------------- drawing primitives
  let canvas = null, ctx = null;
  // Upscaled copies for option C (and any non-whole scale): blown up with
  // nearest-neighbour to the next whole multiple, then eased down when drawn.
  const upCache = new WeakMap();
  function upscaled(src, k){
    let m = upCache.get(src); if(!m){ m = new Map(); upCache.set(src, m); }
    let c = m.get(k);
    if(!c){
      c = document.createElement('canvas'); c.width = src.width*k; c.height = src.height*k;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(src, 0, 0, c.width, c.height);
      m.set(k, c);
    }
    return c;
  }
  // Draws a source (whole canvas) with its top-left at (dx,dy) device px, `s`
  // device px per art px. o: {alpha, flipX, flipY, rot (quarter turns), comp}
  function blit(src, dx, dy, s, o){
    o = o || {};
    const dw = src.width*s, dh = src.height*s;
    ctx.save();
    if(o.alpha!==undefined) ctx.globalAlpha = Math.max(0, Math.min(1, o.alpha));
    if(o.comp) ctx.globalCompositeOperation = o.comp;
    ctx.translate(dx+dw/2, dy+dh/2);
    if(o.rot) ctx.rotate(o.rot*Math.PI/2);
    if(o.flipX || o.flipY) ctx.scale(o.flipX?-1:1, o.flipY?-1:1);
    if(Math.abs(s-Math.round(s))<1e-6 || gridMode==='B'){
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, -dw/2, -dh/2, dw, dh);
    } else {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(upscaled(src, Math.ceil(s)), -dw/2, -dh/2, dw, dh);
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
  function radial(cx, cy, rx, ry, color, alpha){
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = alpha===undefined?1:alpha;
    ctx.translate(cx, cy); ctx.scale(1, ry/rx); ctx.translate(-cx, -cy);
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

  // ---------------------------------------------------------------- lookups
  function floorVariant(x, y){        // spec "Terrain": fixed (x,y) hash, never random
    return hash2(x, y) % 3;
  }
  const ABC = ['a','b','c'];
  const ENEMY_KEY_BY_NAME = {};
  try{ Object.values(ENEMY_TIERS).forEach(list=>list.forEach(e=>{ ENEMY_KEY_BY_NAME[e.name]=e.spriteKey; })); }catch(e){}

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
  function unitKey(u){ return u.side==='player' ? playerKey(u) : enemyKey(u); }
  function enemyMeta(key){ return (ART.enemyAnim && ART.enemyAnim[key]) || null; }
  function facesFront(key){ const m = enemyMeta(key); return !!(m && m.faces==='front'); }
  function hasMut(u, name){ return !!(u.mutations && u.mutations.includes(name)); }
  function idleSeq(key){
    const m = enemyMeta(key);
    return {frames: (m && m.idle) || [0,1], loop: (m && m.idle_ms) || T.playerIdleMs};
  }
  function actionSeq(key, kind){
    const m = enemyMeta(key);
    if(m){
      if(kind==='ability' && m.ability) return {seq:m.ability.frames, ms:m.ability.hold_ms||500};
      return {seq:m.attack || [0], ms:T.frameMs};
    }
    const a = PLAYER_ANIM[key] || {strike:[0]};
    if((kind==='heal' || kind==='cast') && a.sig) return {seq:a.sig, ms:a.ms||T.frameMs, sig:true};
    return {seq:a.strike, ms:a.ms||T.frameMs};
  }

  // ---------------------------------------------------------------- per-unit visual state
  // vis[id]: what the renderer remembers about a unit between frames. Never
  // written back into G.
  let vis = new Map(), sceneOwner = null, sceneReady = false, effects = [], summonWatch = null;
  const facing = new Map();          // unit id -> 1 (left) | -1 (right)
  function V(id){ let v = vis.get(id); if(!v){ v = {}; vis.set(id, v); } return v; }
  function realUnit(u){
    if(!u) return null;
    const list = (G.battle && G.battle.units) || [];
    return list.find(x=>x.id===u.id) || u;
  }
  let clock = ()=>performance.now(), frozen = false;   // test hooks (LLSprites._freeze)
  function nowMs(){ return clock(); }

  // Starts a one-shot strip on a unit, turned toward its target.
  function startAction(unit, target, kind){
    if(!unit) return null;
    const key = unitKey(unit);
    if(!key) return null;
    const v = V(unit.id), now = nowMs();
    // fx('skill') or fx('ability') is followed at once by fx('attack') for the
    // same blow; keep the strip that is already playing.
    if(v.anim && now - v.anim.start < 60 && kind==='strike') return v.anim;
    const a = actionSeq(key, kind);
    let mirror = v.mirror || false;
    if(target && !facesFront(key)){ if(target.x > unit.x) mirror = true; else if(target.x < unit.x) mirror = false; }
    if(target) facing.set(unit.id, mirror ? -1 : 1);
    const nudge = target ? {x: Math.sign(target.x-unit.x), y: Math.sign(target.y-unit.y)} : {x:0,y:0};
    const second = !!(v.lastActionAt && now - v.lastActionAt < 1200 && unit.side==='enemy');
    v.anim = {seq:a.seq, ms:a.ms, start:now, kind, mirror, nudge, sig:!!a.sig, second};
    v.lastActionAt = now;
    return v.anim;
  }
  // When the blow lands: about halfway through the strip.
  function impactDelay(anim){
    if(!anim) return 0;
    const i = Math.max(1, Math.floor((anim.seq.length-1)/2));
    return i*anim.ms;
  }
  function expectImpact(target, at, spark){
    if(!target) return;
    const v = V(target.id);
    v.impactAt = at; v.impactSpark = spark; v.impactSetAt = nowMs();
  }
  function addProjectile(kind, from, to, launchAt){
    const d = Math.max(Math.abs(to.x-from.x), Math.abs(to.y-from.y));
    const dur = Math.max(T.projectileMsPerCell, d*T.projectileMsPerCell);
    effects.push({type:'proj', kind, fx:from.x, fy:from.y, tx:to.x, ty:to.y, start:launchAt, dur});
    return launchAt + dur;
  }
  function addSpark(key, x, y, at, frames){
    effects.push({type:'anim', key, x, y, start:at, frames});
  }

  // ---------------------------------------------------------------- fx() handler
  function onFx(type, data){
    if(!document.body.classList.contains('ll-art') || !G || G.screen!=='battle') return;
    const now = nowMs();
    if(type==='attack'){
      const a = realUnit(data.attacker), t = realUnit(data.defender);
      const anim = startAction(a, t, 'strike');
      let land = now + impactDelay(anim);
      const key = a && unitKey(a);
      if(a && t && key && ARROW_SHOOTERS.test(key) && Math.max(Math.abs(t.x-a.x),Math.abs(t.y-a.y))>1){
        land = addProjectile('arrow', a, t, land);
      }
      expectImpact(t, land, 'fx_hit');
    } else if(type==='cast'){
      const a = realUnit(data.caster), t = realUnit(data.target);
      const anim = startAction(a, t, 'cast');
      const land = addProjectile('bolt', a, t, now + impactDelay(anim));
      expectImpact(t, land, 'fx_hit_violet');
    } else if(type==='heal'){
      const a = realUnit(data.healer), t = realUnit(data.target);
      const anim = startAction(a, t && t.id!==a.id ? t : null, 'heal');
      if(t) addSpark('fx_heal', t.x, t.y, now + impactDelay(anim), [170,170,170]);
    } else if(type==='skill'){
      const a = realUnit(data.caster), t = data.target ? realUnit(data.target) : null;
      startAction(a, t, 'strike');
    } else if(type==='ability'){
      const a = realUnit(data.unit), t = data.target ? realUnit(data.target) : null;
      if(data.ability && data.ability.summon){
        const anim = startAction(a, null, 'ability');
        // the summoned Crawler appears on the Brood Swarm beat
        summonWatch = {near:a ? {x:a.x, y:a.y} : null, until: now+400, beat: now + Math.min(250, anim ? anim.ms/2 : 250), known: new Set(((G.battle&&G.battle.units)||[]).map(u=>u.id))};
      } else {
        startAction(a, t, 'strike');
      }
    }
  }
  window.fx = function(type, data){ try{ onFx(type, data); }catch(e){ console.error('[Last Light art] fx', e); } };

  // ---------------------------------------------------------------- change detection
  // Damage with no fx() call (spores, splash, thorns, corrosive blood), deaths and
  // new arrivals are found by comparing each unit with the last frame.
  function detectChanges(now){
    const b = G.battle;
    if(!b) return;
    for(const u of b.units){
      const v = V(u.id);
      if(!v.seen){
        v.seen = true; v.prevHp = u.hp; v.prevAlive = u.alive;
        if(sceneReady){
          const summoned = summonWatch && now < summonWatch.until && !summonWatch.known.has(u.id);
          v.fadeInAt = summoned ? summonWatch.beat : now;
        }
        continue;
      }
      if(u.hp < v.prevHp){
        const pending = v.impactAt && now - v.impactSetAt < 1500;
        const at = pending ? Math.max(now, v.impactAt) : now;
        v.flashAt = at; v.shakeAt = at;
        if(pending && v.impactSpark) addSpark(v.impactSpark, u.x, u.y, at + T.flashMs, [90,110]);
        v.impactAt = 0;
      } else if(v.impactAt && now - v.impactSetAt > 1500){ v.impactAt = 0; }
      if(v.prevAlive && !u.alive){
        v.deathAt = Math.max(now, (v.flashAt||0) + T.flashMs + 60);
        v.deathX = u.x; v.deathY = u.y;
      }
      v.prevHp = u.hp; v.prevAlive = u.alive;
    }
  }

  // ---------------------------------------------------------------- scene
  function buildScene(){
    const scr = G.screen;
    const s = scr==='battle' ? G.battle : G.deploy;
    if(!s || !G.activeMission) return null;
    const setting = G.activeMission.setting;
    const lit = s.litTiles, full = s.fullyLitTiles, disc = s.discoveredTiles;
    const units = [];
    if(scr==='battle'){
      s.units.forEach(u=>{ units.push(u); });
    } else {
      Object.entries(s.placed).forEach(([id,p])=>{
        const r = G.roster.find(rr=>rr.id===Number(id));
        if(r) units.push(Object.assign(Object.create(r), {x:p.x, y:p.y, side:'player', id:r.id, alive:true}));
      });
      s.enemies.forEach(e=>units.push(e));
    }
    const objectives = (s.objectives||[]).filter(o=> scr==='battle' ? !o.claimed : true);
    return {scr, s, setting, lit, full, disc, units, objectives};
  }
  function faceFor(u, foes){
    let best=null, bestD=Infinity;
    for(const f of foes){ const d=Math.max(Math.abs(f.x-u.x),Math.abs(f.y-u.y)); if(d<bestD){bestD=d;best=f;} }
    let dir = facing.get(u.id) || 1;
    if(best){ if(best.x > u.x) dir = -1; else if(best.x < u.x) dir = 1; }
    facing.set(u.id, dir);
    return dir;
  }

  // Which elite effects an enemy shows (spec: shared glow always, plus at most
  // two special overlays when mutations stack).
  function enemyLook(u){
    const look = {glow:null, specials:[]};
    const bout2 = G.battle && G.battle.missionType==='arenabout' && u.isBoss && u.phasesRemaining===1;
    if(bout2) look.bout2 = true;
    if(u.isBoss) look.glow = (u.isCapstoneBoss && u.hasAwakened) ? 'awake' : 'elder';
    else if(u.mutations && u.mutations.length) look.glow = 'elite';
    const order = [];
    if(hasMut(u,'Splitting') || u.hasSplit) order.push('split');
    if(hasMut(u,'Two-headed')) order.push('twohead');
    if(hasMut(u,'Bloated')) order.push('bloat');
    if(hasMut(u,'Frog-Legged')) order.push('frog');
    look.specials = order.slice(0,2);
    return look;
  }

  // ---------------------------------------------------------------- draw
  function draw(grid, now){
    const scene = buildScene();
    if(!scene) return false;
    const owner = scene.s;
    if(sceneOwner !== owner){ vis = new Map(); effects = []; summonWatch = null; sceneOwner = owner; sceneReady = false; }
    if(scene.scr==='battle') detectChanges(now);
    const motion = !reduceMotion.matches;
    const dpr = window.devicePixelRatio || 1;
    const cssW = grid.clientWidth, cssH = grid.clientHeight;
    const cs = cssW / GW;
    const W = Math.round(cssW*dpr), H = Math.round(cssH*dpr);
    if(canvas.width!==W || canvas.height!==H){ canvas.width=W; canvas.height=H; }
    canvas.style.width = cssW+'px'; canvas.style.height = cssH+'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    const edge = i => Math.round(i*cs*dpr);
    const tile = (x,y)=>{ const dx=edge(x), dy=edge(y); const dw=edge(x+1)-dx; return {dx, dy, dw, s:dw/ART_SIZE}; };
    const {s, setting, lit, full, disc} = scene;
    const isDisc = k => !disc || disc.has(k);
    const isLit = k => !lit || lit.has(k);
    const isFull = k => !full || full.has(k);
    let busy = false;                       // one-shot animations or effects still running

    // pass 1: floor, terrain, objective
    for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){
      const key = x+','+y;
      if(!isDisc(key)) continue;
      const {dx, dy, dw, s:sc} = tile(x,y);
      const fl = sprite('floor_'+setting+'_'+ABC[floorVariant(x,y)]);
      if(fl) blit(frameCanvas(fl,0), dx, dy, sc); else drawGlyph('.', FALLBACK_COLORS.floor, dx, dy, dw, true);
      if(s.obstacles.has(key)){
        const g = (s.obstacleGlyphs && s.obstacleGlyphs.get(key)) || '▓';
        const t = sprite(obstacleKey(setting, g, x, y));
        if(t) blit(frameCanvas(t,0), dx, dy, sc); else drawGlyph(g, FALLBACK_COLORS.obstacle, dx, dy, dw, true);
      } else if(s.highGround && s.highGround.has(key)){
        const t = sprite(TILE_SPRITE_KEYS.highGround+'_'+setting) || sprite(TILE_SPRITE_KEYS.highGround);
        if(t) blit(frameCanvas(t,0), dx, dy, sc); else drawGlyph('^', FALLBACK_COLORS.highground, dx, dy, dw, true);
      } else if(s.difficultTerrain && s.difficultTerrain.has(key)){
        const t = sprite(TILE_SPRITE_KEYS.difficult+'_'+setting);
        if(t) blit(frameCanvas(t,0), dx, dy, sc); else drawGlyph('~', FALLBACK_COLORS.difficult, dx, dy, dw, true);
      }
      if(scene.objectives.some(o=>o.x===x&&o.y===y) && (scene.scr==='battle' || isLit(key))){
        const t = sprite(TILE_SPRITE_KEYS.objective);
        const f = motion ? Math.floor(now/T.objectiveFrameMs) % (t ? frameCount(t) : 1) : 0;
        if(t) blit(frameCanvas(t,f), dx, dy, sc); else drawGlyph('✦', FALLBACK_COLORS.objective, dx, dy, dw, true);
      }
    }

    // pass 2: units (alive, plus fallen units still playing their fade)
    const players = scene.units.filter(u=>u.side==='player' && u.alive);
    const visibleEnemies = scene.units.filter(u=>u.side==='enemy' && u.alive && isLit(u.x+','+u.y));
    const glyphCount = {};
    const glyphOf = u => u.side==='player' ? (WEAPONS[u.weaponKey]||{}).glyph : u.glyph;
    players.concat(visibleEnemies).forEach(u=>{ const g=u.side+':'+glyphOf(u); glyphCount[g]=(glyphCount[g]||0)+1; });
    const labels = [], badges = [];
    const drawList = [];
    for(const u of scene.units){
      const v = vis.get(u.id) || {};
      let x = u.x, y = u.y, dying = false;
      if(!u.alive){
        if(!v.deathAt || now > v.deathAt + T.deathMs) continue;
        x = v.deathX; y = v.deathY; dying = true;
      }
      const k = x+','+y;
      if(u.side==='enemy' && !isLit(k)) continue;
      if(u.side==='player' && !isDisc(k)) continue;
      drawList.push({u, v, x, y, dying});
    }
    drawList.sort((a,b)=>a.y-b.y);
    for(const it of drawList){
      const {u, v, x, y, dying} = it;
      const {dx, dy, dw, s:sc} = tile(x,y);
      const isPlayer = u.side==='player';
      const key = unitKey(u);
      const rec = sprite(key);
      if(!rec){
        drawGlyph(isPlayer ? (WEAPONS[u.weaponKey]||{}).glyph : u.glyph, FALLBACK_COLORS[u.side], dx, dy, dw, true);
        if(glyphCount[u.side+':'+glyphOf(u)]>1 && u.label) labels.push([u.label, u.side, dx, dy, dw]);
        continue;
      }
      // --- which frame
      let frame = 0, mirror, offX = 0, offY = 0, alpha = 1, acting = false;
      const anim = v.anim;
      if(anim){
        const i = Math.floor((now - anim.start)/anim.ms);
        if(i < anim.seq.length){
          acting = true; busy = true;
          frame = anim.seq[i];
          mirror = anim.mirror;
          if(i < anim.seq.length-1 && i>0){ offX = anim.nudge.x*2; offY = anim.nudge.y*2; }
        } else { v.anim = null; }
      }
      if(!acting){
        const id = idleSeq(key);
        if(motion && !dying){
          const per = id.loop / id.frames.length;
          const phase = (u.id*397) % id.loop;
          frame = id.frames[Math.floor((now + phase)/per) % id.frames.length];
        } else frame = id.frames[0];
        const front = !isPlayer && facesFront(key);
        mirror = front ? false : (dying ? (v.mirror||false) : faceFor(u, isPlayer ? visibleEnemies : players) === -1);
      }
      v.mirror = mirror;
      if(!isPlayer && facesFront(key)) mirror = false;
      // --- motion modifiers
      if(v.shakeAt && now >= v.shakeAt && now < v.shakeAt + T.shakeMs){
        offX += (Math.floor((now - v.shakeAt)/40) % 2 ? 1 : -1); busy = true;
      }
      const look = isPlayer ? null : enemyLook(u);
      if(look && look.specials.includes('frog') && motion && !acting && !dying){
        const hop = [1,-2,-4,-2];
        offY += hop[Math.floor((now + u.id*211)/ (T.frogHopMs/4)) % 4];
      }
      if(dying){ const p = Math.min(1, (now - v.deathAt)/T.deathMs); alpha = 1-p; offY += 3*p; busy = true; }
      if(v.fadeInAt){
        if(now < v.fadeInAt){ busy = true; continue; }
        const p = (now - v.fadeInAt)/T.fadeInMs;
        if(p < 1){ alpha *= p; busy = true; } else v.fadeInAt = 0;
      }
      const ox = dx + offX*sc, oy = dy + offY*sc;
      const fr = frameCanvas(rec, frame);
      const sxo = (n)=> mirror ? -n : n;        // offsets in the sprite's own facing
      const padX = ox - PAD*sc, padY = oy - PAD*sc;

      // --- under the sprite: foot glow, boss aura, awakening glow
      radial(dx+dw/2, dy+dw*0.86, dw*0.42, dw*0.16, GLOW[u.side], alpha);
      if(look && u.isBoss){
        const p = motion ? 0.5+0.5*Math.sin(now/T.elderPulseMs*Math.PI*2) : 0.5;
        radial(dx+dw/2, dy+dw*0.62, dw*(0.95+0.12*p), dw*(0.8+0.1*p), 'rgba(200,72,60,0.8)', alpha*(0.6+0.4*p));   // boss aura
        if(look.glow==='awake') radial(dx+dw/2, dy+dw*0.45, dw*0.7, dw*0.7, 'rgba(245,207,122,0.45)', alpha*(0.5+0.4*p));
      }
      if(anim && acting && anim.sig && key.indexOf('guardian')>=0){
        radial(dx+dw/2, dy+dw/2, dw*0.75, dw*0.75, 'rgba(226,163,61,0.5)', alpha);   // Heal flare glow
      }
      // --- behind the sprite: Two-headed after-image, Bloated rim, glow haze/rim
      if(look){
        if(look.specials.includes('twohead')){
          const strong = acting && anim && anim.second;
          blit(effectCanvas(rec, frame, strong ? 'ghostC' : 'ghost'), padX + sxo(strong?-4:-3)*sc, padY + (strong?-2:-1)*sc, sc, {flipX:mirror, alpha});
        }
        const bloat = look.specials.includes('bloat');
        if(bloat) blit(effectCanvas(rec, frame, 'bloat'), padX, padY, sc, {flipX:mirror, alpha});
        if(look.glow){
          const slow = look.glow!=='elite';
          const p = motion ? 0.5+0.5*Math.sin(now/(slow?T.elderPulseMs:T.elitePulseMs)*Math.PI*2) : 1;
          let a1='rimV', a2='rimC';
          if(look.bout2){ a1='rimR'; a2='rimr'; }
          else if(look.glow==='awake'){ a1='rimY'; a2='rimE'; }
          if(bloat){ a1='rim2V'; a2='rim2C'; }
          blit(effectCanvas(rec, frame, a2), padX, padY, sc, {flipX:mirror, alpha});
          blit(effectCanvas(rec, frame, a1), padX, padY, sc, {flipX:mirror, alpha: alpha*p});
          const hz = bloat ? 'hazeBloat' : (look.glow==='elite' ? 'haze' : 'hazeWide');
          blit(effectCanvas(rec, frame, hz), padX, padY, sc, {flipX:mirror, alpha: alpha*(0.6+0.4*p)});
        }
      }
      // --- the sprite
      blit(fr, ox, oy, sc, {flipX:mirror, alpha});
      // --- on top: Splitting crack, Endless Bout phase 2, hit flash
      if(look){
        if(look.specials.includes('split')){
          const wide = u.hp/u.maxhp < 0.55;
          const flick = motion && Math.floor(now/150)%2;
          blit(effectCanvas(rec, frame, (wide?'crackWide':'crack')+(flick?'B':'')), padX, padY, sc, {flipX:mirror, alpha});
        }
        if(look.bout2){
          blit(effectCanvas(rec, frame, 'tintR'), padX, padY, sc, {flipX:mirror, alpha: alpha*0.33});
          blit(effectCanvas(rec, frame, 'embers'), padX, padY, sc, {flipX:mirror, alpha});
        }
      }
      if(v.flashAt && now >= v.flashAt && now < v.flashAt + T.flashMs){
        blit(effectCanvas(rec, frame, 'flash'), padX, padY, sc, {flipX:mirror, alpha});
      }
      if(v.flashAt && now < v.flashAt + T.flashMs) busy = true;
      // --- interface items drawn after the light pass
      if(!acting && !dying && glyphCount[u.side+':'+glyphOf(u)]>1 && u.label) labels.push([u.label, u.side, dx, dy, dw]);
      if(isPlayer && !dying && getClassName(u)===null && (u.canHeal || u.canCast)){
        badges.push([u.canCast ? 'ui_badge_caster' : 'ui_badge_healer', dx, dy, sc, labels.length && labels[labels.length-1][2]===dx && labels[labels.length-1][3]===dy]);
      }
    }

    // pass 3: light and fog
    for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){
      const key = x+','+y;
      if(!isDisc(key)) continue;
      const {dx, dy, dw} = tile(x,y);
      if(!isLit(key)){ ctx.fillStyle = `rgba(0,0,0,${LIGHT.unlitDark})`; ctx.fillRect(dx,dy,dw,dw); }
      else if(!isFull(key)){
        ctx.fillStyle = `rgba(0,0,0,${LIGHT.dimRingDark})`; ctx.fillRect(dx,dy,dw,dw);
        ctx.fillStyle = LIGHT.ringWash; ctx.fillRect(dx,dy,dw,dw);
      } else { ctx.fillStyle = LIGHT.litWash; ctx.fillRect(dx,dy,dw,dw); }
    }

    // pass 4: effects (projectiles, sparks, motes), then labels and badges
    effects = effects.filter(e=>{
      if(e.type==='proj'){
        if(now < e.start) return true;
        const p = (now - e.start)/e.dur;
        if(p >= 1) return false;
        busy = true;
        const ix = e.fx + (e.tx-e.fx)*p, iy = e.fy + (e.ty-e.fy)*p;
        const t0 = tile(0,0), sc = t0.s, cell = cs*dpr;
        const px = ix*cell, py = iy*cell;
        const ddx = e.tx-e.fx, ddy = e.ty-e.fy;
        let rec, o = {};
        if(e.kind==='bolt'){
          rec = sprite('fx_bolt');
          o.flipX = ddx > 0;
          if(!rec) return true;
          const f = Math.floor(now/80) % frameCount(rec);
          blit(frameCanvas(rec, f), px, py, sc, o);
        } else {
          const ang = Math.atan2(ddy, ddx), oct = ((Math.round(ang/(Math.PI/4)) % 8) + 8) % 8;
          // 0:right 1:down-right 2:down 3:down-left 4:left 5:up-left 6:up 7:up-right
          if(oct % 2 === 0){
            rec = sprite('fx_arrow_level');            // art points left
            o = {0:{flipX:true}, 2:{rot:-1}, 4:{}, 6:{rot:1}}[oct];
          } else {
            rec = sprite('fx_arrow_diag');             // art points down-left
            o = {1:{flipX:true}, 3:{}, 5:{flipY:true}, 7:{flipX:true, flipY:true}}[oct];
          }
          if(!rec) return true;
          blit(frameCanvas(rec, 0), px, py, sc, o);
        }
        return true;
      }
      if(e.type==='anim'){
        if(now < e.start) return true;
        let t = now - e.start, i = 0;
        while(i < e.frames.length && t >= e.frames[i]){ t -= e.frames[i]; i++; }
        if(i >= e.frames.length) return false;
        busy = true;
        const rec = sprite(e.key);
        if(!rec) return false;
        const k = e.x+','+e.y;
        if(!isLit(k)) return true;
        const {dx, dy, s:sc} = tile(e.x, e.y);
        blit(frameCanvas(rec, i), dx, dy, sc);
        return true;
      }
      return false;
    });
    labels.forEach(l=>drawLabel(l[0], l[1], l[2], l[3], l[4], dpr));
    badges.forEach(([bk, dx, dy, sc, underLabel])=>{
      const rec = sprite(bk);
      if(!rec) return;
      // cell pixels x 16–22, y 7–13 (below the label); alone near the top-right without one
      blit(frameCanvas(rec,0), dx + 16*sc, dy + (underLabel ? 7 : 2)*sc, sc);
    });
    sceneReady = true;
    return busy;
  }

  // ---------------------------------------------------------------- icons, portraits, Battle Key tiles (Phase 3)
  // Called by the game's ic() / portraitBox() / tic() while it builds HTML. Each
  // returns null when it has no art, and the game then keeps its old text.
  function imgTag(src, px, cls, alt){
    return `<img class="${cls}" src="${src}" width="${px}" height="${px}" alt="${alt||''}" draggable="false">`;
  }
  window.LL_ICON_HTML = function(key, size){
    const meta = ART.sprites['icon_'+key];
    if(!meta || (images['icon_'+key] && images['icon_'+key].state==='missing')) return null;
    sprite('icon_'+key);
    return imgTag(meta.src, size||12, 'llicon');
  };
  window.LL_PORTRAIT_HTML = function(key, sizeClass){
    if(!key) return null;
    const px = sizeClass==='portrait-lg' ? 48 : 24;
    let k = null, cls = 'llportrait';
    if(key==='capstone'){ k = G && G.patron ? 'enemy_capstone_'+G.patron.key+'_f0' : null; cls += ' boss'; }
    else if(key.indexOf('boss:')===0){ const sk = ENEMY_KEY_BY_NAME[key.slice(5)]; k = sk ? sk+'_f0' : 'icon_tag_boss'; cls += ' boss'; }
    else if(ENEMY_KEY_BY_NAME[key]) k = ENEMY_KEY_BY_NAME[key]+'_f0';
    else if(ART.sprites['icon_capstone_'+key]) k = 'icon_capstone_'+key;   // patron slot: capstone emblem until portraits exist
    const meta = k && ART.sprites[k];
    if(!meta) return null;
    return imgTag(meta.src, px, cls);
  };
  const tileCache = new Map();
  function tileURL(id, build){
    if(tileCache.has(id)) return tileCache.get(id);
    const c = document.createElement('canvas'); c.width = c.height = ART_SIZE;
    const x = c.getContext('2d');
    if(!build(x)) return null;                       // art not loaded yet: keep the text this time
    const url = c.toDataURL('image/png');
    tileCache.set(id, url);
    return url;
  }
  function layer(x, key, frame){ const rec = sprite(key); if(!rec) return false; x.drawImage(frameCanvas(rec, frame||0), 0, 0); return true; }
  window.LL_TILE_HTML = function(kind, setting){
    const floor = 'floor_'+setting+'_a';
    const one = (id, build)=>{ const u = tileURL(setting+'|'+id, build); return u ? imgTag(u, 24, 'lltile') : null; };
    if(kind==='difficult') return one(kind, x=>layer(x,floor) && layer(x,TILE_SPRITE_KEYS.difficult+'_'+setting));
    if(kind==='highground') return one(kind, x=>layer(x,floor) && layer(x,TILE_SPRITE_KEYS.highGround+'_'+setting));
    if(kind==='objective') return one(kind, x=>layer(x,floor) && layer(x,TILE_SPRITE_KEYS.objective));
    if(kind==='lit') return one(kind, x=>{ if(!layer(x,floor)) return false; x.fillStyle = LIGHT.litWash; x.fillRect(0,0,24,24); return true; });
    if(kind==='dim') return one(kind, x=>{ if(!layer(x,floor)) return false; x.fillStyle = `rgba(0,0,0,${LIGHT.dimRingDark})`; x.fillRect(0,0,24,24); x.fillStyle = LIGHT.ringWash; x.fillRect(0,0,24,24); return true; });
    if(kind==='fog') return one(kind, x=>{ x.fillStyle = '#000'; x.fillRect(0,0,24,24); return true; });
    if(kind==='obstacles'){
      const cfg = MISSION_SETTINGS[setting];
      if(!cfg) return null;
      const parts = cfg.obstacleTypes.map(t=>{
        const key = (t.spriteKey==='terrain_wall' && setting==='ruins') ? 'terrain_wall_ruins_a' : t.spriteKey;
        return one('obs:'+key, x=>layer(x,floor) && layer(x,key));
      });
      return parts.every(Boolean) ? parts.join('') : null;
    }
    return null;
  };

  // ---------------------------------------------------------------- canvas + layout
  let lastGrid = null, lastSig = '', lastDraw = 0, errorCount = 0, busy = false;
  function ensureCanvas(grid){
    if(!canvas){
      canvas = document.createElement('canvas');
      canvas.className = 'll-art-canvas';
      canvas.setAttribute('aria-hidden','true');
      ctx = canvas.getContext('2d');
    }
    if(canvas.parentNode !== grid) grid.insertBefore(canvas, grid.firstChild);
  }
  function phoneCellSize(){
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    if(vw > PHONE_MAX_W) return null;          // desktop keeps its 48/72px breakpoints
    const dpr = window.devicePixelRatio || 1;
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
  // Small switch so the A/B/C choice can still be compared on a real phone. It
  // lives in the persistent header (render() never rebuilds that element), and
  // CSS shows it only on the battle/deploy compact header at phone widths.
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
    const animated = !reduceMotion.matches;
    const interval = busy ? 0 : (animated ? 1000/T.idleFps : 400);
    if(!force && grid===lastGrid && sig===lastSig && now-lastDraw < interval) return;
    try{
      busy = draw(grid, now);
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
    if(frozen || !currentGrid()) return;
    applyCellSize();
    ensureModeSwitch();
    update(now, false);
  }

  document.body.classList.add('ll-art');
  applyCellSize();
  // render() replaces the grid's HTML synchronously; redraw in the same task
  // (a MutationObserver callback runs before the browser paints), so a new grid
  // never shows a frame without its art underneath.
  const mo = new MutationObserver(()=>{ if(frozen) return; applyCellSize(); update(nowMs(), true); });
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
    missing(){ return Object.entries(images).filter(([k,r])=>r.state==='missing').map(([k])=>k); },
    _vis(){ return vis; },
    // Deterministic captures for testing: freeze the loop, set the clock, draw at a time.
    _freeze(on, t){ frozen = !!on; clock = on ? ()=>t : ()=>performance.now(); },
    _setClock(t){ clock = ()=>t; },
    _drawAt(t){ clock = ()=>t; const g = currentGrid(); if(g){ ensureCanvas(g); draw(g, t); } }
  };
})();
