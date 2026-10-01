/** New visitors only. Add ?splash=1 to the URL to force it while testing. */
export const shouldSplash = (): boolean => {
  if (/[?&]splash=1/.test(window.location.search)) return true;
  try {
    return !localStorage.getItem('glivva_splash_v1');
  } catch {
    return true;
  }
};
