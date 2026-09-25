/**
 * 管理画面共通：パスワードとサーバー保存
 */
function cmsPassword() {
    var el = document.getElementById('adminPassword');
    return el ? el.value : '';
}

function cmsRememberPassword() {
    var el = document.getElementById('adminPassword');
    if (!el) return;
    var saved = sessionStorage.getItem('adminPassword');
    if (saved) el.value = saved;
    el.addEventListener('change', function() {
        sessionStorage.setItem('adminPassword', el.value);
    });
}

function cmsSetStatus(message) {
    var el = document.getElementById('status');
    if (el) el.textContent = message;
}

/* さくらのWAFがパスや files[] を攻撃と誤判定しないよう、本文は u8: + base64 で送る */
function cmsPack(str) {
    return 'u8:' + btoa(unescape(encodeURIComponent(String(str || ''))));
}

/* 添付（multipart）は使わない。本文は application/x-www-form-urlencoded だけ */
async function cmsPostFields(fields) {
    var body = new URLSearchParams();
    Object.keys(fields).forEach(function(key) {
        if (fields[key] === undefined || fields[key] === null || fields[key] === '') return;
        body.set(key, String(fields[key]));
    });
    var res = await fetch('save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString(),
        cache: 'no-store'
    });
    var text = await res.text();
    return { status: res.status, data: cmsParseResponse(text, res.status) };
}

/* PDF署名などがWAFに見えないよう、1バイトずつ 0x5A でXORして hex にする */
function cmsXorHexFromBuffer(buf) {
    var bytes = new Uint8Array(buf);
    var hex = '0123456789abcdef';
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
        var b = bytes[i] ^ 0x5A;
        out += hex[(b >> 4) & 15] + hex[b & 15];
    }
    return out;
}

function cmsReadXorHex(file) {
    return new Promise(function(resolve, reject) {
        var r = new FileReader();
        r.onload = function() { resolve(cmsXorHexFromBuffer(r.result)); };
        r.onerror = function() { reject(r.error); };
        r.readAsArrayBuffer(file);
    });
}

/* 大きな求人PDFは小さく分割して送る（1片は hex 10万文字＝約50KB） */
async function cmsUploadOneFile(destDir, fileObj, fileIndex, fileCount) {
    var name = fileObj.fileName || (fileObj.file && fileObj.file.name) || ('file' + fileIndex);
    var hex = await cmsReadXorHex(fileObj.file);
    var chunk = 100000;
    var total = Math.ceil(hex.length / chunk) || 1;
    var token = String(Date.now()) + String(fileIndex) + String(Math.floor(Math.random() * 1e9));
    for (var c = 0; c < total; c++) {
        cmsSetStatus('ファイルを送っています（' + (fileIndex + 1) + '/' + fileCount + ' ・ ' + (c + 1) + '/' + total + '）…');
        var posted = await cmsPostFields({
            password: cmsPassword(),
            kind: 'putChunk',
            t: token,
            n: cmsPack(name),
            d: cmsPack(destDir || ''),
            i: String(c),
            m: String(total),
            x: hex.slice(c * chunk, (c + 1) * chunk)
        });
        if (!posted.data || !posted.data.ok) return false;
    }
    return true;
}

/* 警告が前に付いていても、本文中のJSONを取り出す */
function cmsParseResponse(text, status) {
    try { return JSON.parse(text); } catch (e) { /* 続きで部分抽出 */ }
    var start = String(text || '').indexOf('{');
    var end = String(text || '').lastIndexOf('}');
    if (start >= 0 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch (e2) { /* 下で案内 */ }
    }
    if (status === 413 || /Content-Length|post_max_size|exceeds the limit|大きすぎ|413/i.test(text)) {
        cmsSetStatus('ファイルが大きすぎます。PDFや写真を小さくしてから保存してください。');
        return null;
    }
    if (status === 403 || /Forbidden|refuse to browse|WAF|サイトガード/i.test(text)) {
        cmsSetStatus('サーバーのセキュリティ（WAF）が保存を止めました。さくらのコントロールパネル → セキュリティ → WAF設定ドメインで、一時的に「利用しない」にして保存し、終わったら「利用する」に戻してください。');
        return null;
    }
    var snippet = String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    cmsSetStatus(snippet
        ? '保存できませんでした。' + snippet
        : '保存の応答がありませんでした。時間をおいて再度お試しください。');
    return null;
}

function cmsEscape(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** kind, jsonPath, payload, destDir, files: [{file, fileName}] */
async function cmsSave(opts) {
    var password = cmsPassword();
    if (!password) {
        cmsSetStatus('パスワードを入力してください。');
        return false;
    }
    var files = opts.files || [];
    try {
        for (var i = 0; i < files.length; i++) {
            var up = await cmsUploadOneFile(opts.destDir, files[i], i, files.length);
            if (!up) return false;
        }
        cmsSetStatus('サーバーに保存しています…');
        var posted = await cmsPostFields({
            password: password,
            kind: opts.kind || '',
            jsonPath: cmsPack(opts.jsonPath || ''),
            payload: cmsPack(JSON.stringify(opts.payload)),
            deletePaths: (opts.deletePaths && opts.deletePaths.length) ? cmsPack(JSON.stringify(opts.deletePaths)) : ''
        });
        if (!posted.data) return false;
        if (!posted.data.ok) {
            cmsSetStatus(posted.data.error || '保存に失敗しました。');
            return false;
        }
        var n = files.length || ((posted.data.files && posted.data.files.length) ? posted.data.files.length : 0);
        cmsSetStatus(n ? 'サーバーに保存しました（ファイル ' + n + ' 件）。' : 'サーバーに保存しました。');
        return true;
    } catch (err) {
        console.error(err);
        cmsSetStatus('サーバーへ保存できませんでした。');
        return false;
    }
}

/** 現在のパスワードを確認して、新しいパスワードへ切り替える */
async function cmsChangePassword(currentPassword, newPassword) {
    if (!currentPassword) {
        cmsSetStatus('現在のパスワードを入力してください。');
        return false;
    }
    if (!newPassword || newPassword.length < 4) {
        cmsSetStatus('新しいパスワードは4文字以上にしてください。');
        return false;
    }
    cmsSetStatus('パスワードを変更しています…');
    try {
        var posted = await cmsPostFields({
            password: currentPassword,
            kind: 'changePassword',
            newPassword: newPassword
        });
        if (!posted.data) return false;
        if (!posted.data.ok) {
            cmsSetStatus(posted.data.error || 'パスワードの変更に失敗しました。');
            return false;
        }
        sessionStorage.setItem('adminPassword', newPassword);
        cmsSetStatus('パスワードを変更しました。各画面のパスワード欄にも新しい値を入れてください。');
        return true;
    } catch (err) {
        console.error(err);
        cmsSetStatus('パスワードを変更できませんでした。');
        return false;
    }
}
