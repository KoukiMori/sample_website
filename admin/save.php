<?php
/**
 * 管理画面から JSON とファイルをサーバーへ書き込む
 * 初期パスワードは ADMIN_PASSWORD。画面から変更すると password.php が優先される
 */
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');

// ▼ 初期パスワード（管理画面から一度も変更していないときだけ使う）
// 画面の「パスワードを変更」後は admin/password.php の値が使われる
define('ADMIN_PASSWORD', 'pass');

function json_exit($code, $payload) {
    http_response_code($code);
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
        // 才庭寮・ともやま苑・花園寮の重要事項説明書
        '#^assets/otherimage/(hanazono|sainiwa|tomoyama)/importantNotes\.json$#',
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_exit(405, array('ok' => false, 'error' => 'POSTのみです'));
}

// 送信サイズが post_max_size を超えると $_POST が空になる。パスワード誤りと誤解しない
$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength > 0 && empty($_POST) && empty($_FILES)) {
    json_exit(413, array(
        'ok' => false,
        'error' => 'ファイルが大きすぎます（上限 ' . ini_get('post_max_size') . '）。写真を小さくしてから保存してください。',
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

$jsonPathRel = isset($_POST['jsonPath']) ? $_POST['jsonPath'] : '';
if ($jsonPathRel === '' && $kind === 'topics') {
    $jsonPathRel = 'data/topics.json';
}
if (!is_allowed_json_path($jsonPathRel)) {
    json_exit(400, array('ok' => false, 'error' => '保存先 JSON が不正です'));
}

$payloadRaw = isset($_POST['payload']) ? $_POST['payload'] : (isset($_POST['topics']) ? $_POST['topics'] : '');
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

$json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false || file_put_contents($jsonPath, $json . "\n") === false) {
    json_exit(500, array('ok' => false, 'error' => 'JSON を書き込めませんでした'));
}

$saved = array();
$destRel = isset($_POST['destDir']) ? rtrim(str_replace('\\', '/', $_POST['destDir']), '/') : '';
if ($destRel !== '' && isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
    if (!is_allowed_dir($destRel)) {
        json_exit(400, array('ok' => false, 'error' => '保存先フォルダが不正です'));
    }
    $destDir = $root . '/' . $destRel;
    if (!is_dir($destDir) && !mkdir($destDir, 0755, true)) {
        json_exit(500, array('ok' => false, 'error' => 'ファイルフォルダを作成できませんでした'));
    }
    $realDir = realpath($destDir);
    $allowedExt = array(
        'jpg' => true, 'jpeg' => true, 'png' => true, 'gif' => true, 'webp' => true,
        'pdf' => true, 'xls' => true, 'xlsx' => true,
    );
    $count = count($_FILES['files']['name']);
    for ($i = 0; $i < $count; $i++) {
        if ($_FILES['files']['error'][$i] !== UPLOAD_ERR_OK) continue;
        $base = basename($_FILES['files']['name'][$i]);
        if ($base === '' || strpos($base, '..') !== false) continue;
        // Mac の分解文字（NFD）を本番 Linux 向けに合成（NFC）し、拡張子を小文字に揃える
        if (class_exists('Normalizer')) {
            $nfc = Normalizer::normalize($base, Normalizer::FORM_C);
            if ($nfc !== false) $base = $nfc;
        }
        $ext = strtolower(pathinfo($base, PATHINFO_EXTENSION));
        $stem = pathinfo($base, PATHINFO_FILENAME);
        $stem = preg_replace('/[\\\\\/:*?"<>|#?&%]/u', '_', $stem);
        if ($stem === '') $stem = 'image';
        if ($ext === 'jpeg') $ext = 'jpg';
        if (!isset($allowedExt[$ext])) continue;
        $base = $stem . '.' . $ext;
        $dest = $destDir . DIRECTORY_SEPARATOR . $base;
        if (!move_uploaded_file($_FILES['files']['tmp_name'][$i], $dest)) {
            json_exit(500, array('ok' => false, 'error' => 'ファイルの保存に失敗しました: ' . $base));
        }
        $realDest = realpath($dest);
        if ($realDest === false || strpos($realDest, $realDir . DIRECTORY_SEPARATOR) !== 0) {
            unlink($dest);
            json_exit(500, array('ok' => false, 'error' => '保存先が不正です'));
        }
        $saved[] = $base;
    }
}

/* 求人・例規集の旧ファイル：許可フォルダ内の実ファイルだけ削除 */
$deleted = array();
$deleteRaw = isset($_POST['deletePaths']) ? $_POST['deletePaths'] : '';
if ($deleteRaw !== '') {
    $deletePaths = json_decode($deleteRaw, true);
    if (is_array($deletePaths)) {
        foreach ($deletePaths as $rel) {
            if (!is_string($rel)) continue;
            $rel = str_replace('\\', '/', $rel);
            if (strpos($rel, '..') !== false) continue;
            if (!preg_match('#^assets/(recruitment|reiki)/[^/]+$#', $rel)) continue;
            $full = $root . '/' . $rel;
            if (!is_file($full)) continue;
            $realFile = realpath($full);
            $folder = preg_match('#^assets/reiki/#', $rel) ? 'reiki' : 'recruitment';
            $realBase = realpath($root . '/assets/' . $folder);
            if ($realFile === false || $realBase === false) continue;
            if (strpos($realFile, $realBase . DIRECTORY_SEPARATOR) !== 0) continue;
            if (@unlink($realFile)) $deleted[] = $rel;
        }
    }
}

json_exit(200, array('ok' => true, 'files' => $saved, 'deleted' => $deleted));
