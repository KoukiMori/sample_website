/**
 * サイト表示の切替（デプロイ時はここを false に変更）
 * SHOW_SEASON_SWITCH … index の季節確認用セレクト
 * USE_SEASON_GRADIENT … 季節別背景グラデーション
 */
const SHOW_SEASON_SWITCH = false;
const USE_SEASON_GRADIENT = true;

/** 確認用スイッチで選んだ季節（sessionStorage）を使うか */
function useDevSeasonOverride() {
    return SHOW_SEASON_SWITCH === true;
}