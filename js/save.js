(function (root) {
  const LM = (root.LM = root.LM || {});
  const KEY_GALLERY = 'lm_gallery_v2';
  const KEY_RUN = 'lm_run_v2';
  const KEY_MUTE = 'lm_mute_v2';

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 容器受限则静默 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* noop */ } }
  };

  LM.save = {
    gallery() { return store.get(KEY_GALLERY) || {}; },
    unlock(id) {
      const g = store.get(KEY_GALLERY) || {};
      g[id] = (g[id] || 0) + 1;
      store.set(KEY_GALLERY, g);
      return g;
    },
    saveRun(s) {
      if (!s || s.phase !== 'play') { store.del(KEY_RUN); return; }
      const plain = Object.assign({}, s);
      delete plain.team; delete plain.formation;
      store.set(KEY_RUN, plain);
    },
    loadRun() {
      const p = store.get(KEY_RUN);
      if (!p) return null;
      p.team = LM.TEAMS.find(t => t.id === p.teamId);
      p.formation = LM.FORMATIONS.find(f => f.id === p.formationId);
      return p.team ? p : null;
    },
    clearRun() { store.del(KEY_RUN); },
    mute() { return store.get(KEY_MUTE) === true; },
    setMute(v) { store.set(KEY_MUTE, v); }
  };

  if (typeof module !== 'undefined') module.exports = LM;
})(typeof window !== 'undefined' ? window : globalThis);