// The learner's explicit choice, if they have made one. Without it the site
// opens in light mode, whatever the system prefers.
export const THEME_KEY = "voces:theme";

/**
 * Runs in <head> during parsing, before first paint, so a learner who chose
 * night never sees a flash of the light page. Kept as a string: it has to be
 * inlined.
 */
export const THEME_SCRIPT = `(function(){try{document.documentElement.classList.toggle("dark",localStorage.getItem("${THEME_KEY}")==="dark")}catch(e){}})()`;
