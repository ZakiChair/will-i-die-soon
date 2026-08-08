export const HERO_MOTION_BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement;
  let media;
  let timer;
  let mediaInstalled = false;
  let scrollInstalled = false;
  const onPreferenceChange = () => {
    if (media && media.matches) settle();
  };
  const cleanup = () => {
    if (scrollInstalled) {
      scrollInstalled = false;
      try { window.removeEventListener("scroll", settle); }
      catch { /* Best-effort cleanup after partial bootstrap setup. */ }
    }
    if (mediaInstalled && media) {
      mediaInstalled = false;
      try { media.removeEventListener("change", onPreferenceChange); }
      catch { /* Best-effort cleanup after partial bootstrap setup. */ }
    }
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };
  const settle = () => {
    if (root.dataset.motionBootstrap === "pending") {
      root.dataset.motionBootstrap = "static";
    }
    cleanup();
  };
  try {
    if (typeof window.matchMedia !== "function") return;
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    root.dataset.motionBootstrap = "pending";
    scrollInstalled = true;
    window.addEventListener("scroll", settle, { once: true, passive: true });
    mediaInstalled = true;
    media.addEventListener("change", onPreferenceChange);
    timer = window.setTimeout(settle, 1500);
  } catch {
    settle();
  }
})();`;
