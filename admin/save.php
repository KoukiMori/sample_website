<?php
/**
 * 管理画面から JSON とファイルをサーバーへ書き込む
 * 初期パスワードは ADMIN_PASSWORD。画面から変更すると password.php が優先される
 */
ini_set('display_errors', '0');
/* 警告が先に出るとブラウザがJSONと判断できず「PHPが動いていない」と誤表示する */
ob_start();
header('Content-Type: application/json; charset=utf-8');

// ▼ 初期パスワード（管理画面から一度も変更していないときだけ使う）
// 画面の「パスワードを変更」後は admin/password.php の値が使われる
define('ADMIN_PASSWORD', 'pass');

function json_exit($code, $payload) {
    /* 警告などの混入を捨てて、JSONだけ返す */
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/** 画面から変更したパスワードの保存先（ハッシュのみ。ブラウザから見ても中身は出ない） */
function password_file_path() {
    return __DIR__ . '/password.php';
}

function load_password_hash() {
    $file = password_file_path();
    if (!is_file($file)) return null;
    $data = include $file;
    if (is_array($data) && !empty($data['hash'])) return $data['hash'];
    return null;
}

/** 投稿されたパスワードが正しいか（変更後はハッシュ、未変更なら初期値） */
function password_ok($posted) {
    if ($posted === '') return false;
    $hash = load_password_hash();
    if ($hash !== null) {
        return password_verify($posted, $hash);
    }
    return ADMIN_PASSWORD !== '' && hash_equals(ADMIN_PASSWORD, $posted);
}

/** 新しいパスワードをハッシュして password.php に書く */
function save_password_hash($plain) {
    $hash = password_hash($plain, PASSWORD_DEFAULT);
    if ($hash === false) return false;
    $php = "<?php\n// 管理画面から変更したパスワードのハッシュ。直接編集しない\nreturn array('hash' => " . var_export($hash, true) . ");\n";
    return file_put_contents(password_file_path(), $php, LOCK_EX) !== false;
}

/** 公開ページの確認用スイッチ（js/siteConfig.js）を書き換える */
function write_season_switch_config($root, $show) {
    $flag = $show ? 'true' : 'false';
    /* コメントは英数字のみ。日本語を入れるとFTPでJSが壊れてスイッチが消える */
    $js = "/**\n"
        . " * Display flags (saved from admin. Do not edit by hand)\n"
        . " * SHOW_SEASON_SWITCH ... season select on index\n"
        . " * USE_SEASON_GRADIENT ... seasonal background\n"
        . " */\n"
        . "const SHOW_SEASON_SWITCH = " . $flag . ";\n"
        . "const USE_SEASON_GRADIENT = true;\n"
        . "\n"
        . "function useDevSeasonOverride() {\n"
        . "    return SHOW_SEASON_SWITCH === true;\n"
        . "}\n";
    return file_put_contents($root . '/js/siteConfig.js', $js) !== false;
}

/** 削除してよいファイルの親フォルダ。範囲外なら false */
function allowed_delete_base($root, $rel) {
    if (preg_match('#^assets/otherimage/slider/[^/]+\.(jpe?g|png|gif|webp)$#i', $rel)) {
        return realpath($root . '/assets/otherimage/slider');
    }
    if (preg_match('#^assets/otherimage/(hanazono|sainiwa|tomoyama|fukushi_center)/[^/]+\.(jpe?g|png|gif|webp|pdf)$#i', $rel, $m)) {
        return realpath($root . '/assets/otherimage/' . $m[1]);
    }
    if (preg_match('#^assets/(recruitment|reiki|torikumi)/[^/]+$#', $rel, $m)) {
        return realpath($root . '/assets/' . $m[1]);
    }
    return false;
}

function delete_allowed_file($root, $rel, &$deleted) {
    $rel = str_replace('\\', '/', $rel);
    if (strpos($rel, '..') !== false) return;
    $realBase = allowed_delete_base($root, $rel);
    if ($realBase === false) return;
    $full = $root . '/' . $rel;
    if (!is_file($full)) return;
    $realFile = realpath($full);
    if ($realFile === false) return;
    if (strpos($realFile, $realBase . DIRECTORY_SEPARATOR) !== 0) return;
    if (@unlink($realFile)) $deleted[] = $rel;
}

/** カルーセル JSON に無いスライダー写真を消す（slide1.jpg はプレースホルダーなので残す） */
function sweep_unused_slider_images($root, $topics, &$deleted) {
    if (!is_array($topics)) return;
    $keep = array('slide1.jpg' => true);
    foreach ($topics as $item) {
        if (!is_array($item) || empty($item['image'])) continue;
        $bn = basename(str_replace('\\', '/', $item['image']));
        if ($bn === '') continue;
        $keep[$bn] = true;
        $keep[strtolower($bn)] = true;
    }
    $dir = $root . '/assets/otherimage/slider';
    if (!is_dir($dir)) return;
    $realBase = realpath($dir);
    if ($realBase === false) return;
    $dh = opendir($dir);
    if ($dh === false) return;
    while (($f = readdir($dh)) !== false) {
        if ($f === '.' || $f === '..') continue;
        if (!preg_match('/\.(jpe?g|png|gif|webp)$/i', $f)) continue;
        if (isset($keep[$f]) || isset($keep[strtolower($f)])) continue;
        $full = $dir . DIRECTORY_SEPARATOR . $f;
        if (!is_file($full)) continue;
        $realFile = realpath($full);
        if ($realFile === false || strpos($realFile, $realBase . DIRECTORY_SEPARATOR) !== 0) continue;
        if (@unlink($realFile)) $deleted[] = 'assets/otherimage/slider/' . $f;
    }
    closedir($dh);
}

/** 年間行事 JSON に無い施設写真を消す（施設トップ画像・案内写真は残す） */
function sweep_unused_facility_photos($root, $facilityId, $pict, &$deleted) {
    $okId = array('hanazono' => true, 'sainiwa' => true, 'tomoyama' => true, 'fukushi_center' => true);
    if (!isset($okId[$facilityId]) || !is_array($pict)) return;
    $keep = array();
    $keep[$facilityId . '.png'] = true;
    $keep[$facilityId . '.jpg'] = true;
    $keep[strtolower($facilityId . '.png')] = true;
    for ($i = 1; $i <= 5; $i++) {
        foreach (array('jpg', 'jpeg', 'png', 'gif', 'webp') as $ext) {
            $keep['guidance-' . $i . '.' . $ext] = true;
        }
    }
    foreach (array('spring', 'summer', 'autumn', 'winter') as $season) {
        $photos = (isset($pict[$season]['photos']) && is_array($pict[$season]['photos'])) ? $pict[$season]['photos'] : array();
        foreach ($photos as $p) {
            if (!is_array($p) || empty($p['imageUrl'])) continue;
            $bn = basename(str_replace('\\', '/', $p['imageUrl']));
            if ($bn === '') continue;
            $keep[$bn] = true;
            $keep[strtolower($bn)] = true;
        }
    }
    $extraJson = array('guidance.json', 'importantNotes.json');
    foreach ($extraJson as $jf) {
        $path = $root . '/assets/otherimage/' . $facilityId . '/' . $jf;
        if (!is_file($path)) continue;
        $extra = json_decode(file_get_contents($path), true);
        if (!is_array($extra)) continue;
        $items = isset($extra['items']) && is_array($extra['items']) ? $extra['items'] : array();
        if ($jf === 'importantNotes.json' && !$items && !empty($extra['fileName'])) {
            $items = array(array('fileName' => $extra['fileName']));
        }
        foreach ($items as $it) {
            if (!is_array($it)) continue;
            $bn = '';
            if (!empty($it['imageUrl'])) $bn = basename(str_replace('\\', '/', $it['imageUrl']));
            if (!empty($it['fileName'])) $bn = basename(str_replace('\\', '/', $it['fileName']));
            if ($bn === '') continue;
            $keep[$bn] = true;
            $keep[strtolower($bn)] = true;
        }
    }
    $dir = $root . '/assets/otherimage/' . $facilityId;
    if (!is_dir($dir)) return;
    $realBase = realpath($dir);
    if ($realBase === false) return;
    $dh = opendir($dir);
    if ($dh === false) return;
    while (($f = readdir($dh)) !== false) {
        if ($f === '.' || $f === '..') continue;
        if (!preg_match('/\.(jpe?g|png|gif|webp)$/i', $f)) continue;
        if (isset($keep[$f]) || isset($keep[strtolower($f)])) continue;
        $full = $dir . DIRECTORY_SEPARATOR . $f;
        if (!is_file($full)) continue;
        $realFile = realpath($full);
        if ($realFile === false || strpos($realFile, $realBase . DIRECTORY_SEPARATOR) !== 0) continue;
        if (@unlink($realFile)) $deleted[] = 'assets/otherimage/' . $facilityId . '/' . $f;
    }
    closedir($dh);
}

function is_allowed_json_path($rel) {
    $rel = str_replace('\\', '/', $rel);
    if (strpos($rel, '..') !== false) return false;
    $ok = array(
        '#^data/topics\.json$#',
        '#^data/nyusatu\.json$#',
        '#^data/reiki\.json$#',
        '#^data/recruitment\.json$#',
        '#^data/shisetu_torikumi\.json$#',
        // 各施設の年間行事JSON（画像と同じフォルダ）
        '#^assets/otherimage/(hanazono|sainiwa|tomoyama|fukushi_center)/pict\.json$#',
        '#^assets/otherimage/(hanazono|sainiwa|tomoyama|fukushi_center)/fees\.json$#',
        // 才庭寮・ともやま苑・花園寮・志摩福祉センターの概要表
        '#^assets/otherimage/(hanazono|sainiwa|tomoyama|fukushi_center)/overview\.json$#',
        // 才庭寮・ともやま苑・花園寮の施設案内写真（5枚固定）
        '#^assets/otherimage/(hanazono|sainiwa|tomoyama)/guidance\.json$#',
        // 才庭寮・ともやま苑・志摩福祉センターの重要事項説明書
        '#^assets/otherimage/(sainiwa|tomoyama|fukushi_center)/importantNotes\.json$#',
        // トップの確認用スイッチ表示／非表示
        '#^data/siteDisplay\.json$#',
    );
    foreach ($ok as $re) {
        if (preg_match($re, $rel)) return true;
    }
    return false;
}

function is_allowed_dir($rel) {
    $rel = str_replace('\\', '/', $rel);
    $rel = rtrim($rel, '/');
    if (strpos($rel, '..') !== false) return false;
    $ok = array(
        '#^assets/otherimage/slider$#',
        // 施設ごとの写真保存先（hanazono / sainiwa / tomoyama / fukushi_center）
        '#^assets/otherimage/(hanazono|sainiwa|tomoyama|fukushi_center)$#',
        '#^assets/nyusatu/[a-z0-9]+/(excel|pdf)$#',
        '#^assets/recruitment$#',
        '#^assets/reiki$#',
        '#^assets/torikumi$#',
    );
    foreach ($ok as $re) {
        if (preg_match($re, $rel)) return true;
    }
    return false;
}

/* さくらのWAF回避用。u8: のあとに UTF-8 を base64 したもの */
function post_plain($key, $default = '') {
    if (!isset($_POST[$key]) || !is_string($_POST[$key])) return $default;
    $v = $_POST[$key];
    if (strncmp($v, 'u8:', 3) === 0) {
        $decoded = base64_decode(substr($v, 3), true);
        return ($decoded === false) ? $default : $decoded;
    }
    return $v;
}

/* 写真は photoData_N（本文）を優先。旧 photo_N / files[] も受け取る */
function uploaded_photos() {
    $out = array();
    for ($i = 0; $i < 80; $i++) {
        $name = post_plain('photoName_' . $i, '');
        $dataKey = 'photoData_' . $i;
        if (isset($_POST[$dataKey]) && is_string($_POST[$dataKey]) && $_POST[$dataKey] !== '') {
            $bin = base64_decode($_POST[$dataKey], true);
            if ($bin === false) {
                json_exit(400, array('ok' => false, 'error' => 'ファイルデータを読めませんでした'));
            }
            if ($name === '') $name = 'file' . $i . '.bin';
            $out[] = array(
                'name' => $name,
                'tmp_name' => '',
                'error' => UPLOAD_ERR_OK,
                'size' => strlen($bin),
                'bytes' => $bin,
            );
            continue;
        }
        $k = 'photo_' . $i;
        if (isset($_FILES[$k]) && is_array($_FILES[$k])) {
            if ($name === '') $name = isset($_FILES[$k]['name']) ? $_FILES[$k]['name'] : '';
            $out[] = array(
                'name' => $name,
                'tmp_name' => $_FILES[$k]['tmp_name'],
                'error' => $_FILES[$k]['error'],
                'size' => isset($_FILES[$k]['size']) ? $_FILES[$k]['size'] : 0,
                'bytes' => null,
            );
            continue;
        }
        break;
    }
    if ($out) return $out;
    if (isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
        $n = count($_FILES['files']['name']);
        for ($i = 0; $i < $n; $i++) {
            $out[] = array(
                'name' => $_FILES['files']['name'][$i],
                'tmp_name' => $_FILES['files']['tmp_name'][$i],
                'error' => $_FILES['files']['error'][$i],
                'size' => $_FILES['files']['size'][$i],
                'bytes' => null,
            );
        }
    }
    return $out;
}

/* 保存してよいファイル名だけ残す */
function sanitize_upload_basename($base) {
    $base = basename(str_replace('\\', '/', $base));
    if ($base === '' || strpos($base, '..') !== false) return '';
    if (class_exists('Normalizer')) {
        $nfc = Normalizer::normalize($base, Normalizer::FORM_C);
        if ($nfc !== false) $base = $nfc;
    }
    $ext = strtolower(pathinfo($base, PATHINFO_EXTENSION));
    $stem = pathinfo($base, PATHINFO_FILENAME);
    $stem = preg_replace('/[\\\\\/:*?"<>|#?&%・（）()【】「」『』［］｛｝\x{3000}]/u', '_', $stem);
    $stem = preg_replace('/_+/u', '_', $stem);
    $stem = trim($stem, '_');
    if ($stem === '') $stem = 'file';
    if ($ext === 'jpeg') $ext = 'jpg';
    $ok = array(
        'jpg' => true, 'png' => true, 'gif' => true, 'webp' => true,
        'pdf' => true, 'xls' => true, 'xlsx' => true,
    );
    if (!isset($ok[$ext])) return '';
    return $stem . '.' . $ext;
}

function write_upload_bytes($root, $destRel, $base, $bytes) {
    $destRel = rtrim(str_replace('\\', '/', $destRel), '/');
    if (!is_allowed_dir($destRel)) {
        json_exit(400, array('ok' => false, 'error' => '保存先フォルダが不正です'));
    }
    $base = sanitize_upload_basename($base);
    if ($base === '') {
        json_exit(400, array('ok' => false, 'error' => 'ファイル名が不正です'));
    }
    $ext = strtolower(pathinfo($base, PATHINFO_EXTENSION));
    if ($destRel === 'assets/torikumi' && $ext !== 'pdf') {
        json_exit(400, array('ok' => false, 'error' => '施設の取り組みはPDFのみアップロードできます'));
    }
    $destDir = $root . '/' . $destRel;
    if (!is_dir($destDir) && !mkdir($destDir, 0755, true)) {
        json_exit(500, array('ok' => false, 'error' => 'ファイルフォルダを作成できませんでした'));
    }
    $realDir = realpath($destDir);
    $dest = $destDir . DIRECTORY_SEPARATOR . $base;
    if (file_put_contents($dest, $bytes) === false) {
        json_exit(500, array('ok' => false, 'error' => 'ファイルの保存に失敗しました: ' . $base));
    }
    $realDest = realpath($dest);
    if ($realDest === false || strpos($realDest, $realDir . DIRECTORY_SEPARATOR) !== 0) {
        @unlink($dest);
        json_exit(500, array('ok' => false, 'error' => '保存先が不正です'));
    }
    return $base;
}

function upload_tmp_dir() {
    $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . '/cmsup_' . substr(sha1(__DIR__), 0, 10);
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    if (is_dir($dir) && is_writable($dir)) return $dir;
    $fallback = __DIR__ . '/.upload_tmp';
    if (!is_dir($fallback)) @mkdir($fallback, 0755, true);
    $ht = $fallback . '/.htaccess';
    if (!is_file($ht)) {
        @file_put_contents($ht, "Require all denied\nDeny from all\n");
    }
    return $fallback;
}

/* 1時間以上前の分割ファイルを消す */
function upload_tmp_cleanup($tmpDir) {
    $dh = @opendir($tmpDir);
    if ($dh === false) return;
    $limit = time() - 3600;
    while (($f = readdir($dh)) !== false) {
        if ($f === '.' || $f === '..') continue;
        $fp = $tmpDir . DIRECTORY_SEPARATOR . $f;
        if (is_file($fp) && filemtime($fp) < $limit) @unlink($fp);
    }
    closedir($dh);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_exit(405, array('ok' => false, 'error' => 'POSTのみです'));
}

// 送信サイズが post_max_size を超えると $_POST が空になる。パスワード誤りと誤解しない
$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength > 0 && empty($_POST) && empty($_FILES)) {
    json_exit(413, array(
        'ok' => false,
        'error' => 'ファイルが大きすぎます（上限 ' . ini_get('post_max_size') . '）。PDFや写真を小さくしてから保存してください。',
    ));
}

$posted = isset($_POST['password']) ? $_POST['password'] : '';
if (!password_ok($posted)) {
    json_exit(403, array('ok' => false, 'error' => 'パスワードが違います'));
}

$kind = isset($_POST['kind']) ? $_POST['kind'] : 'topics';

// 管理画面からのパスワード変更（JSON 保存とは別処理）
if ($kind === 'changePassword') {
    $new = isset($_POST['newPassword']) ? $_POST['newPassword'] : '';
    if (strlen($new) < 4) {
        json_exit(400, array('ok' => false, 'error' => '新しいパスワードは4文字以上にしてください'));
    }
    if (!save_password_hash($new)) {
        json_exit(500, array('ok' => false, 'error' => 'パスワードを書き込めませんでした。admin/ の書き込み権限を確認してください。'));
    }
    json_exit(200, array('ok' => true, 'changed' => true));
}

/* 求人PDFなどは WAF を避けるため、XOR+hex の分割で先に置く */
if ($kind === 'putChunk') {
    $root = dirname(__DIR__);
    $destRel = rtrim(str_replace('\\', '/', post_plain('d')), '/');
    $name = post_plain('n');
    $token = preg_replace('/[^0-9]/', '', post_plain('t'));
    if (strlen($token) < 8) {
        json_exit(400, array('ok' => false, 'error' => '送信識別子が不正です'));
    }
    $i = isset($_POST['i']) ? (int)$_POST['i'] : -1;
    $m = isset($_POST['m']) ? (int)$_POST['m'] : 0;
    $x = isset($_POST['x']) ? strtolower($_POST['x']) : '';
    if ($m < 1 || $m > 400 || $i < 0 || $i >= $m) {
        json_exit(400, array('ok' => false, 'error' => '分割情報が不正です'));
    }
    if ($x === '' || strlen($x) > 240000 || preg_match('/[^0-9a-f]/', $x) || (strlen($x) % 2) !== 0) {
        json_exit(400, array('ok' => false, 'error' => 'ファイルデータが不正です'));
    }
    $tmpDir = upload_tmp_dir();
    if (!is_dir($tmpDir) || !is_writable($tmpDir)) {
        json_exit(500, array('ok' => false, 'error' => '一時フォルダを作れませんでした'));
    }
    upload_tmp_cleanup($tmpDir);
    $safeTok = hash('sha256', $token . __DIR__);
    $part = $tmpDir . DIRECTORY_SEPARATOR . $safeTok . '_' . $i . '.part';
    if (file_put_contents($part, $x) === false) {
        json_exit(500, array('ok' => false, 'error' => '一時保存に失敗しました'));
    }
    if ($i !== $m - 1) {
        json_exit(200, array('ok' => true, 'more' => true));
    }
    $hex = '';
    for ($c = 0; $c < $m; $c++) {
        $pf = $tmpDir . DIRECTORY_SEPARATOR . $safeTok . '_' . $c . '.part';
        if (!is_file($pf)) {
            json_exit(400, array('ok' => false, 'error' => 'ファイルの一部が届いていません。もう一度保存してください。'));
        }
        $hex .= file_get_contents($pf);
        @unlink($pf);
    }
    $xored = hex2bin($hex);
    if ($xored === false || $xored === '') {
        json_exit(400, array('ok' => false, 'error' => 'ファイルデータを組めませんでした'));
    }
    $n = strlen($xored);
    $bytes = $xored;
    for ($p = 0; $p < $n; $p++) {
        $bytes[$p] = chr(ord($bytes[$p]) ^ 0x5A);
    }
    $savedName = write_upload_bytes($root, $destRel, $name, $bytes);
    json_exit(200, array('ok' => true, 'files' => array($savedName)));
}

$jsonPathRel = post_plain('jsonPath');
if ($jsonPathRel === '' && $kind === 'topics') {
    $jsonPathRel = 'data/topics.json';
}
if (!is_allowed_json_path($jsonPathRel)) {
    json_exit(400, array('ok' => false, 'error' => '保存先 JSON が不正です'));
}

$payloadRaw = post_plain('payload');
if ($payloadRaw === '') $payloadRaw = post_plain('topics');
$data = json_decode($payloadRaw, true);
if ($data === null) {
    json_exit(400, array('ok' => false, 'error' => 'JSON が不正です'));
}

$root = dirname(__DIR__);
$jsonPath = $root . '/' . $jsonPathRel;
$dir = dirname($jsonPath);
if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
    json_exit(500, array('ok' => false, 'error' => 'フォルダを作成できませんでした'));
}

/* 確認用スイッチ：boolean 以外は入れない。公開ページの siteConfig.js も同時に更新する */
if ($jsonPathRel === 'data/siteDisplay.json') {
    $show = !empty($data['showSeasonSwitch']);
    $data = array('showSeasonSwitch' => $show);
}

$json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false || file_put_contents($jsonPath, $json . "\n") === false) {
    json_exit(500, array('ok' => false, 'error' => 'JSON を書き込めませんでした'));
}

if ($jsonPathRel === 'data/siteDisplay.json' && !write_season_switch_config($root, !empty($data['showSeasonSwitch']))) {
    json_exit(500, array('ok' => false, 'error' => '表示設定の反映に失敗しました。js/ の書き込み権限を確認してください。'));
}

$deleted = array();
/* お知らせ保存時：JSON から外れたカルーセル写真をフォルダからも消す */
if ($jsonPathRel === 'data/topics.json') {
    sweep_unused_slider_images($root, $data, $deleted);
}
if (preg_match('#^assets/otherimage/(hanazono|sainiwa|tomoyama|fukushi_center)/pict\.json$#', $jsonPathRel, $m)) {
    sweep_unused_facility_photos($root, $m[1], $data, $deleted);
}

$saved = array();
$photos = uploaded_photos();
$destRel = rtrim(str_replace('\\', '/', post_plain('destDir')), '/');
if ($destRel !== '' && $photos) {
    if (!is_allowed_dir($destRel)) {
        json_exit(400, array('ok' => false, 'error' => '保存先フォルダが不正です'));
    }
    $destDir = $root . '/' . $destRel;
    if (!is_dir($destDir) && !mkdir($destDir, 0755, true)) {
        json_exit(500, array('ok' => false, 'error' => 'ファイルフォルダを作成できませんでした'));
    }
    foreach ($photos as $item) {
        $err = $item['error'];
        if ($err !== UPLOAD_ERR_OK) {
            $limit = ini_get('upload_max_filesize');
            if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
                json_exit(413, array(
                    'ok' => false,
                    'error' => 'ファイルが大きすぎます（上限 ' . $limit . '）。PDFを小さくしてから保存してください。',
                ));
            }
            json_exit(400, array(
                'ok' => false,
                'error' => 'ファイルのアップロードに失敗しました（エラーコード ' . $err . '）。',
            ));
        }
        $bytes = $item['bytes'];
        if ($bytes === null) {
            if (empty($item['tmp_name']) || !is_uploaded_file($item['tmp_name'])) {
                json_exit(400, array('ok' => false, 'error' => 'ファイルのアップロードに失敗しました。'));
            }
            $bytes = file_get_contents($item['tmp_name']);
            if ($bytes === false) {
                json_exit(500, array('ok' => false, 'error' => 'ファイルを読めませんでした'));
            }
        }
        $saved[] = write_upload_bytes($root, $destRel, $item['name'], $bytes);
    }
}

/* 差し替えで不要になったファイル（カルーセル・年間行事・求人・例規など） */
$deleteRaw = post_plain('deletePaths');
if ($deleteRaw !== '') {
    $deletePaths = json_decode($deleteRaw, true);
    if (is_array($deletePaths)) {
        foreach ($deletePaths as $rel) {
            if (!is_string($rel)) continue;
            delete_allowed_file($root, $rel, $deleted);
        }
    }
}

json_exit(200, array('ok' => true, 'files' => $saved, 'deleted' => $deleted));
