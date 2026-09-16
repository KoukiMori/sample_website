<?php
/**
 * php -S 用。拡張子なしの URL を実在する .html へ戻す
 * 例: /admin/topics → /admin/topics.html
 */
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
if ($path === false || $path === '') {
    $path = '/';
}

$root = __DIR__;
$file = $root . $path;

// 実在するファイル（html / php / 画像 / json など）はそのまま返す
if ($path !== '/' && is_file($file)) {
    return false;
}

$query = parse_url($uri, PHP_URL_QUERY);
$suffix = $query ? '?' . $query : '';

// /admin のようにディレクトリへ来たときは末尾 / を付け、相対リンクがずれないようにする
if ($path !== '/' && substr($path, -1) !== '/' && is_dir($file)) {
    header('Location: ' . $path . '/' . $suffix, true, 302);
    exit;
}

// 拡張子なしで foo.html があるときだけ .html へ送る
$ext = pathinfo($path, PATHINFO_EXTENSION);
if ($ext === '' && substr($path, -1) !== '/' && is_file($file . '.html')) {
    header('Location: ' . $path . '.html' . $suffix, true, 302);
    exit;
}

return false;
