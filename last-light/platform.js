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

   Later phases add goBack() (Phase 4) and unlockAudio() (Phase 5) here.
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
  window.LL_PLATFORM = { native: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) };
})();
