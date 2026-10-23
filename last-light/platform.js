/* ============================================================================
   LAST LIGHT — platform hooks (Art wiring Phase 1, v2.2.0)
   ============================================================================
   Small seams that behave correctly in a browser today and switch to native
   behaviour once the game is packaged with Capacitor. Nothing else in the game
   needs to know which one it is running in.

   Phase 1 adds:
   - store.get(key, fallback) / store.set(key, value): the only storage access
     point. Browser today: localStorage (wrapped, since private windows and
     blocked storage can throw). After packaging: swap the inside of these two
     functions for Capacitor Preferences; callers don't change.
     Saved games are a separate proposal; this is only the hook.
   - Safe areas are CSS (viewport-fit=cover + env(safe-area-inset-*)) in
     index.html, not code.

   Phase 4 (v2.2.3) adds goBack(): one "back" for the Android back button and the
   browser's back gesture. It closes what's open first, then steps back a screen:
   an open info panel or action popup -> closed; Help / Hall of Fame -> the screen
   before; a camp page -> the town (a region page -> Reclaimed Territories). On the
   town, battle and deploy screens it does nothing (leaving a battle has a cost and
   stays a deliberate button); in a battle or deploy the browser back gesture and
   the Android back button are swallowed rather than leaving the page or app.
   Returns true when it handled the back.
   Phase 5 adds unlockAudio() here.
   ============================================================================ */
(function(){
  'use strict';
  const PREFIX = 'lastlight:';
  function get(key, fallback){
    try{
      const raw = window.localStorage.getItem(PREFIX+key);
      return raw===null ? fallback : JSON.parse(raw);
    }catch(e){ return fallback; }
  }
  function set(key, value){
    try{ window.localStorage.setItem(PREFIX+key, JSON.stringify(value)); return true; }
    catch(e){ return false; }
  }
  window.store = { get, set };

  function goBack(){
    try{
      if(typeof G==='undefined' || !G) return false;
      if(G.battle && G.battle.actionMenuFor){ G.battle.actionMenuFor = null; render(); return true; }
      if(G.expandedTags && G.expandedTags.size){ G.expandedTags.clear(); render(); return true; }
      if(G.screen==='help' && typeof closeHelp==='function'){ closeHelp(); return true; }
      if(G.screen==='hallOfFame' && typeof closeHallOfFame==='function'){ closeHallOfFame(); return true; }
      if(G.screen==='patron' && G.patronPage && G.patronPage!=='town'){
        gotoPatronPage((G.patronPage==='temple' || G.patronPage==='arena') ? 'territories' : 'town');
        return true;
      }
    }catch(e){ console.error('[Last Light] goBack', e); }
    return false;
  }
  window.goBack = goBack;
  // In a battle or deploy, a back gesture does nothing (no step back, and never leaves
  // the page): there are no saved games yet, so leaving would lose the campaign.
  function inFight(){ try{ return typeof G!=='undefined' && G && (G.screen==='battle' || G.screen==='deploy'); }catch(e){ return false; } }

  // Browser back gesture: keep one extra history entry so "back" comes to us first.
  // When there is nothing to step back to, let the browser leave the page.
  if(window.history && history.pushState){
    try{
      history.replaceState({ll:'base'}, '');
      history.pushState({ll:'guard'}, '');
      window.addEventListener('popstate', ()=>{
        if(goBack() || inFight()) history.pushState({ll:'guard'}, '');
        else history.back();
      });
    }catch(e){}
  }
  // Packaged app (Capacitor): the hardware back button calls the same goBack(); it only
  // exits the app when there's nothing left to step back from.
  try{
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if(App && App.addListener) App.addListener('backButton', ()=>{ if(!goBack() && !inFight() && App.exitApp) App.exitApp(); });
  }catch(e){}
  window.LL_PLATFORM = { native: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) };
})();
