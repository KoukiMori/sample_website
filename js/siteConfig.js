/**
 * Display flags (saved from admin. Do not edit by hand)
 * SHOW_SEASON_SWITCH ... season select on index
 * USE_SEASON_GRADIENT ... seasonal background
 */
const SHOW_SEASON_SWITCH = true;
const USE_SEASON_GRADIENT = true;

/** Use season from the confirm switch (sessionStorage) */
function useDevSeasonOverride() {
    return SHOW_SEASON_SWITCH === true;
}
