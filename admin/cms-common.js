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
    var formData = new FormData();
    formData.append('password', password);
    formData.append('kind', opts.kind || '');
    formData.append('jsonPath', opts.jsonPath);
    formData.append('payload', JSON.stringify(opts.payload));
    if (opts.destDir) formData.append('destDir', opts.destDir);
    (opts.files || []).forEach(function(f) {
        formData.append('files[]', f.file, f.fileName);
    });
    cmsSetStatus('サーバーに保存しています…');
    try {
        var res = await fetch('save.php', { method: 'POST', body: formData, cache: 'no-store' });
        var text = await res.text();
        var data;
        try { data = JSON.parse(text); } catch (e) {
            cmsSetStatus('PHP が動いていません。本番サーバーか npm run start:php を使ってください。');
            return false;
        }
        if (!data.ok) {
            cmsSetStatus(data.error || '保存に失敗しました。');
            return false;
        }
        var n = (data.files && data.files.length) ? data.files.length : 0;
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
    var formData = new FormData();
    formData.append('password', currentPassword);
    formData.append('kind', 'changePassword');
    formData.append('newPassword', newPassword);
    cmsSetStatus('パスワードを変更しています…');
    try {
        var res = await fetch('save.php', { method: 'POST', body: formData, cache: 'no-store' });
        var text = await res.text();
        var data;
        try { data = JSON.parse(text); } catch (e) {
            cmsSetStatus('PHP が動いていません。本番サーバーか npm run start:php を使ってください。');
            return false;
        }
        if (!data.ok) {
            cmsSetStatus(data.error || 'パスワードの変更に失敗しました。');
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
