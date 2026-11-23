/* ============================================================================
   LAST LIGHT — sound player (v2.4.3)
   ============================================================================
   Plays every sound in the game. The game itself only names moments: it calls
   sfx('cue_id', data) (a no-op in the game core, so the testing harness never
   hears anything) and fx() for battle actions, which the art renderer already
   uses. This file installs the real handlers.

   Rules this file keeps:
   - It only READS game state (G, getSetting). It never writes to G and the game
     never waits on it.
   - Audio starts only after the player's first touch (platform.js unlockAudio()
     makes the one shared AudioContext; iOS needs that).
   - Every cue has a PLACEHOLDER: a few synthesised tones or noise bursts, so
     timing and feel can be judged now. When a real recording exists, list it in
     FILES below (path without extension); the player loads .ogg or .m4a,
     whichever the browser plays, and uses it instead. A file that fails to load
     falls back to the placeholder.
   - Three volume buses under a master: music, effects, interface. Levels come
     from Settings (volMaster, volMusic, volSfx, volUi, mute).
   - Music follows the screen: title, camp, battle, region boss / Final Trial,
     victory and defeat, crossfading over about a second.
   The cue ids match the cue sheet ("Last Light — Audio Cue Sheet").
   ============================================================================ */
(function(){
  'use strict';
  if(typeof window === 'undefined') return;

  // ---------------------------------------------------------------- real files (fill in as recordings arrive)
  // cue id -> path without extension, e.g.  ui_tap: 'audio/sfx/ui_tap'
  const FILES = {};
  const MUSIC_FILES = {};   // track id -> path without extension (looping)

  // ---------------------------------------------------------------- context and buses
  let ctx = null, master = null, bus = {}, ready = false, meter = null;
  function getCtx(){
    if(ctx) return ctx;
    const c = (typeof window.LL_AUDIO === 'function') ? window.LL_AUDIO() : null;
    if(!c) return null;
    ctx = c;
    master = ctx.createGain(); master.connect(ctx.destination);
    ['music','sfx','ui'].forEach(k=>{ bus[k] = ctx.createGain(); bus[k].connect(master); });
    // a gentle limiter so stacked hits never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
    master.disconnect(); master.connect(comp); comp.connect(ctx.destination);
    meter = ctx.createAnalyser(); meter.fftSize = 2048; comp.connect(meter); // for LL_SOUND._level() (tests)
    applyVolumes();
    ready = true;
    loadFiles();
    return ctx;
  }
  function setting(k, d){ try{ const v = (typeof getSetting==='function') ? getSetting(k) : undefined; return v===undefined ? d : v; }catch(e){ return d; } }
  function lvl(v){ v = Math.max(0, Math.min(100, Number(v))); return Math.pow(v/100, 2); } // slider feels even to the ear
  function applyVolumes(){
    if(!ctx) return;
    const t = ctx.currentTime;
    const muted = !!setting('mute', false);
    master.gain.setTargetAtTime(muted ? 0 : lvl(setting('volMaster', 80)), t, 0.03);
    bus.music.gain.setTargetAtTime(lvl(setting('volMusic', 60)), t, 0.03);
    bus.sfx.gain.setTargetAtTime(lvl(setting('volSfx', 80)), t, 0.03);
    bus.ui.gain.setTargetAtTime(lvl(setting('volUi', 60)), t, 0.03);
  }

  // ---------------------------------------------------------------- recorded files
  const buffers = {}, musicBuffers = {};
  function ext(){
    const a = document.createElement('audio');
    return a.canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.m4a';
  }
  function loadFiles(){
    const e = ext();
    const load = (map, into)=> Object.entries(map).forEach(([id, path])=>{
      fetch(path + e).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b=>ctx.decodeAudioData(b)).then(buf=>{ into[id] = buf; })
        .catch(()=>{ into[id] = null; }); // placeholder stays
    });
    load(FILES, buffers); load(MUSIC_FILES, musicBuffers);
  }

  // ---------------------------------------------------------------- placeholder synthesis
  // A recipe is a list of layers: tone {w:wave, f:freq, f2:end freq, d:dur, v:vol, a:attack, at:start}
  // or noise {n:1, d, v, lp:lowpass Hz, hp:highpass Hz, at}.
  let noiseBuf = null;
  function noise(){
    if(noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    return noiseBuf;
  }
  function layer(L, out, t0, pitch){
    const t = t0 + (L.at||0), d = L.d||0.15, v = L.v===undefined ? 0.5 : L.v, a = L.a||0.005;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    let src;
    if(L.n){
      src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      let node = src;
      if(L.hp){ const f = ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value = L.hp; node.connect(f); node = f; }
      if(L.lp){ const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(L.lp, t); if(L.lp2) f.frequency.exponentialRampToValueAtTime(L.lp2, t+d); node.connect(f); node = f; }
      node.connect(g);
    } else {
      src = ctx.createOscillator(); src.type = L.w || 'sine';
      src.frequency.setValueAtTime(L.f*pitch, t);
      if(L.f2) src.frequency.exponentialRampToValueAtTime(L.f2*pitch, t + d);
      src.connect(g);
    }
    g.connect(out);
    src.start(t); src.stop(t + d + 0.05);
  }
  const N = (lp, d, v, extra)=>Object.assign({n:1, lp, d, v}, extra||{});
  const T = (w, f, d, v, extra)=>Object.assign({w, f, d, v}, extra||{});
  // bus per cue: 'ui' | 'sfx'. vary: random pitch spread (+/-), so repeats don't drone.
  const CUES = {
    // --- interface
    ui_tap:        {bus:'ui', vary:0.03, L:[T('triangle', 880, 0.05, 0.18)]},
    ui_confirm:    {bus:'ui', L:[T('triangle', 660, 0.08, 0.22), T('triangle', 990, 0.12, 0.2, {at:0.06})]},
    ui_back:       {bus:'ui', L:[T('triangle', 660, 0.06, 0.18), T('triangle', 495, 0.1, 0.16, {at:0.05})]},
    ui_denied:     {bus:'ui', L:[T('square', 150, 0.12, 0.12), T('square', 140, 0.12, 0.1, {at:0.1})]},
    embark:        {bus:'ui', L:[N(1200, 0.35, 0.12, {lp2:300}), T('sawtooth', 110, 0.4, 0.12, {f2:82})]},
    hire:          {bus:'ui', L:[T('triangle', 523, 0.1, 0.2), T('triangle', 784, 0.18, 0.2, {at:0.08})]},
    wait_day:      {bus:'ui', L:[T('sine', 392, 0.5, 0.18, {a:0.08}), T('sine', 523, 0.6, 0.12, {a:0.1, at:0.15})]},
    gold:          {bus:'ui', vary:0.02, L:[T('square', 1568, 0.06, 0.08), T('square', 2093, 0.12, 0.08, {at:0.05}), T('triangle', 3136, 0.18, 0.05, {at:0.1})]},
    tithe_paid:    {bus:'ui', L:[T('sine', 523, 0.5, 0.2, {a:0.02}), T('sine', 784, 0.7, 0.16, {a:0.02, at:0.12}), T('sine', 1046, 0.9, 0.1, {at:0.24})]},
    tithe_missed:  {bus:'ui', L:[T('sawtooth', 220, 0.5, 0.14, {f2:110}), N(500, 0.6, 0.08)]},
    // --- progression
    level_up:      {bus:'sfx', L:[T('triangle', 523, 0.15, 0.22), T('triangle', 659, 0.15, 0.22, {at:0.1}), T('triangle', 784, 0.15, 0.22, {at:0.2}), T('triangle', 1046, 0.45, 0.22, {at:0.3})]},
    nickname:      {bus:'sfx', L:[T('sine', 784, 0.6, 0.2, {a:0.02}), T('sine', 988, 0.6, 0.18, {at:0.05}), T('sine', 1175, 0.8, 0.16, {at:0.1})]},
    bond:          {bus:'sfx', L:[T('sine', 440, 0.5, 0.18), T('sine', 554, 0.6, 0.16, {at:0.08})]},
    item_found:    {bus:'sfx', L:[T('square', 1318, 0.08, 0.1), T('square', 1760, 0.2, 0.1, {at:0.07})]},
    recruit_fell:  {bus:'sfx', L:[T('sine', 220, 1.2, 0.25, {f2:196, a:0.05}), T('sine', 262, 1.2, 0.18, {f2:233, a:0.05, at:0.1})]},
    injured:       {bus:'sfx', L:[T('triangle', 330, 0.3, 0.16, {f2:262})]},
    // --- battle actions (fx)
    atk_spear:     {bus:'sfx', vary:0.05, L:[N(2600, 0.12, 0.25, {hp:400}), T('triangle', 180, 0.08, 0.15, {f2:120})]},
    atk_longsword: {bus:'sfx', vary:0.05, L:[N(5000, 0.18, 0.3, {hp:1500, lp2:1800}), T('triangle', 220, 0.06, 0.12)]},
    atk_longbow:   {bus:'sfx', vary:0.05, L:[T('triangle', 220, 0.12, 0.2, {f2:110}), N(3500, 0.22, 0.12, {hp:2000, at:0.05})]},
    atk_quarterstaff:{bus:'sfx', vary:0.05, L:[N(900, 0.1, 0.3), T('sine', 140, 0.12, 0.25, {f2:90})]},
    atk_dagger:    {bus:'sfx', vary:0.06, L:[N(6000, 0.08, 0.22, {hp:3000}), N(4000, 0.08, 0.15, {hp:2500, at:0.07})]},
    atk_enemy:     {bus:'sfx', vary:0.08, L:[N(700, 0.18, 0.3), T('sawtooth', 90, 0.16, 0.12, {f2:60})]},
    hit:           {bus:'sfx', vary:0.06, L:[N(1800, 0.09, 0.35, {lp2:400}), T('sine', 120, 0.1, 0.3, {f2:60})]},
    hit_player:    {bus:'sfx', vary:0.06, L:[N(1400, 0.1, 0.35, {lp2:300}), T('sine', 100, 0.14, 0.3, {f2:55})]},
    dodge:         {bus:'sfx', vary:0.05, L:[N(3000, 0.16, 0.15, {hp:1200, lp2:6000})]},
    block:         {bus:'sfx', vary:0.05, L:[T('square', 1200, 0.05, 0.12), T('triangle', 2400, 0.15, 0.08), N(5000, 0.05, 0.1, {hp:3000})]},
    death_enemy:   {bus:'sfx', vary:0.05, L:[T('sawtooth', 160, 0.45, 0.16, {f2:50}), N(600, 0.4, 0.12, {lp2:150})]},
    death_player:  {bus:'sfx', L:[T('sine', 196, 0.9, 0.25, {f2:98}), N(400, 0.6, 0.1)]},
    heal:          {bus:'sfx', L:[T('sine', 659, 0.35, 0.16, {a:0.05}), T('sine', 880, 0.45, 0.14, {a:0.05, at:0.08}), T('sine', 1318, 0.5, 0.08, {at:0.16})]},
    cast:          {bus:'sfx', L:[T('sawtooth', 300, 0.35, 0.12, {f2:900}), N(2500, 0.3, 0.1, {hp:1200})]},
    ability:       {bus:'sfx', L:[T('triangle', 392, 0.3, 0.18, {f2:784}), T('sine', 784, 0.3, 0.1, {at:0.1})]},
    skill:         {bus:'sfx', L:[T('sawtooth', 196, 0.25, 0.16, {f2:588}), N(3000, 0.3, 0.12, {hp:800}), T('triangle', 1175, 0.3, 0.1, {at:0.15})]},
    // --- battle flow
    battle_start:  {bus:'sfx', L:[T('sine', 98, 0.9, 0.3, {a:0.05}), N(300, 0.9, 0.15, {a:0.2})]},
    turn_player:   {bus:'ui', L:[T('sine', 880, 0.08, 0.1)]},
    wave:          {bus:'sfx', L:[T('sawtooth', 73, 0.8, 0.14, {a:0.1}), N(500, 0.8, 0.12, {a:0.2, lp2:1500})]},
    objective:     {bus:'sfx', L:[T('sine', 523, 0.4, 0.2), T('sine', 784, 0.6, 0.18, {at:0.12})]},
    ignite:        {bus:'sfx', L:[N(4000, 1.0, 0.2, {a:0.3, lp2:800}), T('sawtooth', 110, 1.0, 0.1, {a:0.3})]},
    boss_appears:  {bus:'sfx', L:[T('sawtooth', 55, 1.4, 0.2, {a:0.2}), T('sawtooth', 58, 1.4, 0.16, {a:0.2}), N(200, 1.2, 0.15, {a:0.4})]},
    mission_won:   {bus:'sfx', L:[T('triangle', 392, 0.2, 0.2), T('triangle', 523, 0.2, 0.2, {at:0.15}), T('triangle', 659, 0.2, 0.2, {at:0.3}), T('triangle', 784, 0.8, 0.22, {at:0.45})]},
    mission_lost:  {bus:'sfx', L:[T('triangle', 392, 0.3, 0.2), T('triangle', 349, 0.3, 0.2, {at:0.25}), T('triangle', 311, 1.0, 0.22, {at:0.5})]},
    darkened:      {bus:'ui', L:[T('sine', 233, 0.7, 0.14, {a:0.1}), T('sine', 220, 0.7, 0.12, {a:0.1, at:0.05})]}
  };
  const WEAPON_CUE = {spear:'atk_spear', longsword:'atk_longsword', longbow:'atk_longbow', quarterstaff:'atk_quarterstaff', dagger:'atk_dagger'};

  // ---------------------------------------------------------------- play
  let lastCueAt = 0;
  const recent = {};
  function play(id, opts){
    opts = opts || {};
    if(!getCtx() || ctx.state!=='running') return;
    const cue = CUES[id] || {bus:'sfx', L:[]};
    const now = ctx.currentTime;
    if(recent[id] && now - recent[id] < 0.03) return;        // the same cue twice in one beat
    recent[id] = now; lastCueAt = performance.now();
    const out = bus[cue.bus] || bus.sfx;
    const t0 = now + (opts.delay||0);
    const pitch = 1 + (cue.vary ? (Math.random()*2-1)*cue.vary : 0);
    const buf = buffers[id];
    try{
      if(buf){
        const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = pitch;
        s.connect(out); s.start(t0);
      } else {
        cue.L.forEach(L=>layer(L, out, t0, pitch));
      }
    }catch(e){ console.error('[Last Light sound]', id, e); }
  }

  // ---------------------------------------------------------------- music (placeholder: generated ambience)
  // Each mood: a drone chord, a filter swell, and sparse notes on a beat.
  const MOODS = {
    title:   {root:110, chord:[1, 1.5, 2.0], wave:'triangle', lp:900,  beat:2.4, notes:[2, 2.4, 3, 2.67], vol:0.16},
    camp:    {root:130.8, chord:[1, 1.25, 1.5], wave:'triangle', lp:1100, beat:3.0, notes:[2, 2.5, 3, 4], vol:0.14},
    battle:  {root:73.4, chord:[1, 1.5, 2.0], wave:'sawtooth', lp:600,  beat:0.8, notes:[2, 2.4, 2.67, 2.4], vol:0.12, pulse:true},
    boss:    {root:65.4, chord:[1, 1.06, 1.5], wave:'sawtooth', lp:520, beat:0.6, notes:[2, 2.12, 2.4, 2.12], vol:0.13, pulse:true},
    victory: {root:130.8, chord:[1, 1.25, 1.5, 2], wave:'triangle', lp:1400, beat:1.2, notes:[2, 2.5, 3, 4], vol:0.15},
    defeat:  {root:98, chord:[1, 1.19, 1.5], wave:'triangle', lp:700, beat:3.2, notes:[2, 1.78, 1.5], vol:0.13}
  };
  let track = null, trackId = null, schedTimer = null;
  function startTrack(id){
    if(!getCtx()) return;
    if(id===trackId) return;
    const old = track; trackId = id; track = null;
    const t = ctx.currentTime;
    if(old){ old.gain.gain.setTargetAtTime(0.0001, t, 0.35); setTimeout(()=>old.stop(), 2000); }
    if(!id) return;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.connect(bus.music);
    const nodes = [];
    const stop = ()=>{ nodes.forEach(n=>{ try{ n.stop(); }catch(e){} }); try{ g.disconnect(); }catch(e){} if(track && track.gain===g) track = null; };
    const recorded = musicBuffers[id];
    if(recorded){
      const s = ctx.createBufferSource(); s.buffer = recorded; s.loop = true; s.connect(g); s.start(t); nodes.push(s);
      g.gain.setTargetAtTime(1, t, 0.35);
      track = {gain:g, stop}; return;
    }
    const M = MOODS[id] || MOODS.camp;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = M.lp; lp.Q.value = 0.7; lp.connect(g);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = M.lp*0.35;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(t); nodes.push(lfo);
    M.chord.forEach((r, i)=>{
      [-4, 4].forEach(det=>{
        const o = ctx.createOscillator(); o.type = M.wave; o.frequency.value = M.root*r; o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = M.vol/(M.chord.length*1.4);
        o.connect(og); og.connect(lp); o.start(t); nodes.push(o);
      });
    });
    g.gain.setTargetAtTime(1, t, 0.4);
    let step = 0, next = t + 0.5;
    const tick = ()=>{
      if(!track || track.gain!==g) return;
      while(next < ctx.currentTime + 1.2){
        const r = M.notes[step % M.notes.length];
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sine'; o.frequency.value = M.root*r*2;
        og.gain.setValueAtTime(0.0001, next);
        og.gain.exponentialRampToValueAtTime(M.vol*0.5, next + 0.02);
        og.gain.exponentialRampToValueAtTime(0.0001, next + Math.min(1.6, M.beat*1.6));
        o.connect(og); og.connect(g); o.start(next); o.stop(next + M.beat*1.7);
        if(M.pulse){
          const k = ctx.createOscillator(), kg = ctx.createGain();
          k.type = 'sine'; k.frequency.setValueAtTime(70, next); k.frequency.exponentialRampToValueAtTime(40, next+0.15);
          kg.gain.setValueAtTime(M.vol*0.9, next); kg.gain.exponentialRampToValueAtTime(0.0001, next+0.2);
          k.connect(kg); kg.connect(g); k.start(next); k.stop(next+0.25);
        }
        step++; next += M.beat;
      }
    };
    clearInterval(schedTimer); schedTimer = setInterval(tick, 250); tick();
    track = {gain:g, stop};
  }
  function moodFor(){
    let g; try{ g = G; }catch(e){ return null; }
    if(!g) return 'title';
    const s = g.screen;
    if(s==='landing' || s==='primer' || s==='archetype') return 'title';
    if(s==='victory') return 'victory';
    if(s==='gameover') return 'defeat';
    if(s==='battle' || s==='deploy'){
      const m = g.activeMission || {};
      const big = m.isCapstone || m.isTempleRite || m.isArenaBout;
      return s==='battle' ? (big ? 'boss' : 'battle') : 'camp';
    }
    if(s==='help' || s==='settings' || s==='hallOfFame') return trackId || 'camp';
    return 'camp';
  }

  // ---------------------------------------------------------------- game hooks
  // fx(): chain after the art renderer's handler (or the game's no-op).
  const prevFx = window.fx;
  window.fx = function(type, data){
    try{ if(typeof prevFx === 'function') prevFx(type, data); }catch(e){}
    try{
      data = data || {};
      if(type==='attack'){
        const a = data.attacker;
        play(a && a.side==='player' ? (WEAPON_CUE[a.weaponKey] || 'atk_longsword') : 'atk_enemy');
      } else if(type==='cast') play('cast');
      else if(type==='heal') play('heal');
      else if(type==='ability') play('ability');
      else if(type==='skill') play('skill');
    }catch(e){}
  };
  // sfx(): the game's named moments.
  function level(){ if(!meter) return 0; const a = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(a); let s=0; for(const x of a) s+=x*x; return Math.sqrt(s/a.length); }
  window.LL_SOUND = { play, applyVolumes, get ready(){ return ready; }, cues: Object.keys(CUES), _mood: ()=>trackId, _level: level };

  // Every button gets a soft tap, unless a named cue just played for the same press.
  document.addEventListener('click', ev=>{
    const b = ev.target && ev.target.closest && ev.target.closest('button');
    if(!b || b.disabled) return;
    setTimeout(()=>{ if(performance.now() - lastCueAt > 40) play('ui_tap'); }, 0);
  }, true);

  // Music follows the screen; also starts as soon as the first touch unlocks audio.
  setInterval(()=>{
    if(!getCtx() || ctx.state!=='running') return;
    const m = moodFor();
    if(m && m!==trackId) startTrack(m);
  }, 300);
  document.addEventListener('visibilitychange', ()=>{
    try{ if(!ctx) return; if(document.hidden) ctx.suspend(); else ctx.resume(); }catch(e){}
  });
})();
