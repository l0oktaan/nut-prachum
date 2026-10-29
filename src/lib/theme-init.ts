// Shared by the server layout (inline script) and the client toggle — keep it free of React imports.

export const THEME_KEY = "nut-prachum:theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Inline in <head>: sets data-theme before first paint, so a dark page never flashes white. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=p==="dark"||(p!=="light"&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;
