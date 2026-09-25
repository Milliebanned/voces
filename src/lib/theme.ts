// The learner's explicit choice, if they have made one. Without it the theme
// follows the system and keeps following it.
export const THEME_KEY = "voces:theme";

/**
 * Runs in <head> during parsing, before first paint, so a dark-mode visitor
 * never sees a flash of the light page. Kept as a string: it has to be inlined.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
