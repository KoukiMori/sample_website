/**
 * 各施設の重要事項説明書を登録する（タイトル＋PDFを複数追加可）
 * 保存先: assets/otherimage/{施設ID}/importantNotes.json と PDF
 */
var NAMES = {
    sainiwa: '才庭寮',
    tomoyama: 'ともやま苑',
    fukushi_center: 'センター'
};
var DATA = { updated: '', items: [] };
var currentId = 'sainiwa';
/* 未保存PDFの配列（施設案内と同じく { index, file, fileName }） */
var pendingFiles = [];
/* 差し替え・削除時にサーバーから消すファイル */
var pendingDeletePaths = [];

function facilityDir() {
    return 'assets/otherimage/' + currentId;
}

// 西暦を令和表記（R8.9.17）にする
function toReiwaLabel(date) {
    var y = date.getFullYear() - 2018;
    return 'R' + y + '.' + (date.getMonth() + 1) + '.' + date.getDate();
}

/* save.php と同じく、落ちやすい文字を _ に置き換える */
function safeUploadFileName(fileName) {
    var base = String(fileName || 'file').split(/[/\\]/).pop();
    if (base.normalize) base = base.normalize('NFC');
    var match = base.match(/\.([^.]+)$/);
    var ext = match ? match[1].toLowerCase() : 'pdf';
    var stem = match ? base.slice(0, -match[0].length) : base;
    stem = stem.replace(/[\\\/:*?"<>|#?&%・（）()【】「」『』［］｛｝\u3000]/g, '_');
    stem = stem.replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (!stem) stem = 'file';
    if (ext === 'jpeg') ext = 'jpg';
    return stem + '.' + ext;
}

function uploadDisplayLabel(fileName) {
    var base = String(fileName || '').split(/[/\\]/).pop();
    return base.replace(/\.[^.]+$/, '') || base;
}

function emptyItem() {
    return { title: '', fileName: '' };
}

/* 旧形式 { fileName } を items 配列へ揃える */
function normalizeData(raw) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var items = [];
    if (Array.isArray(data.items) && data.items.length) {
        items = data.items.map(function(it) {
            return {
                title: (it && it.title) || '',
                fileName: (it && it.fileName) || ''
            };
        });
    } else if (data.fileName) {
        items = [{
            title: (NAMES[currentId] || '') + '重要事項説明書',
            fileName: data.fileName
        }];
    }
    return {
        updated: data.updated || '',
        items: items
    };
}

function queueDeleteFile(fileName) {
    if (!fileName) return;
    var rel = facilityDir() + '/' + String(fileName).replace(/^.*\//, '');
    if (pendingDeletePaths.indexOf(rel) === -1) pendingDeletePaths.push(rel);
}

function pendingForIndex(i) {
    for (var k = 0; k < pendingFiles.length; k++) {
        if (pendingFiles[k].index === i) return pendingFiles[k];
    }
    return null;
}

function setPending(i, file, fileName) {
    pendingFiles = pendingFiles.filter(function(p) { return p.index !== i; });
    pendingFiles.push({ index: i, file: file, fileName: fileName });
}

function render() {
    document.getElementById('updatedField').value = DATA.updated || '';
    var html = '';
    (DATA.items || []).forEach(function(it, i) {
        var pending = pendingForIndex(i);
        html += '<section class="howto photo-edit">';
        html += '<label>タイトル<input data-i="' + i + '" data-k="title" value="' + cmsEscape(it.title) + '" placeholder="例: 才庭寮重要事項説明書"></label>';
        html += '<label>PDFファイル<input type="file" data-upload="' + i + '" accept="application/pdf,.pdf"></label>';
        if (pending) {
            html += '<p class="image-path-note">選択中（未保存）: ' + cmsEscape(pending.file.name) + ' → ' + cmsEscape(pending.fileName) + '</p>';
        } else if (it.fileName) {
            html += '<p class="image-path-note">登録中のファイル: ' + cmsEscape(it.fileName) + '</p>';
        } else {
            html += '<p class="admin-header-note">まだPDFは選ばれていません。</p>';
        }
        html += '<button type="button" class="btn btn-danger" data-del="' + i + '">この説明書を削除</button>';
        html += '</section>';
    });
    if (!DATA.items.length) {
        html = '<p class="admin-header-note">説明書がありません。「説明書を追加」から登録してください。</p>';
    }
    document.getElementById('editor').innerHTML = html;
}

async function loadFacility() {
    currentId = document.getElementById('facilitySelect').value;
    pendingFiles = [];
    pendingDeletePaths = [];
    try {
        var res = await fetch('../' + facilityDir() + '/importantNotes.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        DATA = normalizeData(await res.json());
        // 1件も無いときは入力枠を1つ出しておく
        if (!DATA.items.length) DATA.items = [emptyItem()];
        render();
        cmsSetStatus(NAMES[currentId] + ' の重要事項説明書を読み込みました。');
    } catch (e) {
        DATA = { updated: '', items: [emptyItem()] };
        render();
        cmsSetStatus('データが無いため空の状態です。タイトルとPDFを入れて保存してください。');
    }
}

document.getElementById('facilitySelect').addEventListener('change', loadFacility);

document.getElementById('todayBtn').addEventListener('click', function() {
    document.getElementById('updatedField').value = toReiwaLabel(new Date());
});

document.getElementById('addItemBtn').addEventListener('click', function() {
    DATA.items = DATA.items || [];
    DATA.items.push(emptyItem());
    render();
});

document.getElementById('editor').addEventListener('input', function(e) {
    var t = e.target;
    if (!t.getAttribute) return;
    var i = t.getAttribute('data-i');
    var k = t.getAttribute('data-k');
    if (i === null || !k) return;
    DATA.items[Number(i)][k] = t.value;
});

document.getElementById('editor').addEventListener('change', function(e) {
    var input = e.target.closest('input[type="file"]');
    if (!input || !input.files || !input.files[0]) return;
    var i = Number(input.getAttribute('data-upload'));
    if (!DATA.items[i]) return;
    var file = input.files[0];
    var name = safeUploadFileName(file.name);
    if (!/\.pdf$/i.test(name)) {
        cmsSetStatus('PDFファイルを選んでください。');
        input.value = '';
        return;
    }
    var item = DATA.items[i];
    // 差し替え時は旧ファイルを削除予約
    if (item.fileName && item.fileName !== name) queueDeleteFile(item.fileName);
    item.fileName = name;
    if (!(item.title || '').trim()) item.title = uploadDisplayLabel(file.name);
    setPending(i, file, name);
    if (!document.getElementById('updatedField').value.trim()) {
        document.getElementById('updatedField').value = toReiwaLabel(new Date());
    }
    cmsSetStatus('PDFを選択しました。保存するとサーバーへアップロードされます。');
    render();
});

document.getElementById('editor').addEventListener('click', function(e) {
    var del = e.target.closest('[data-del]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del'));
    var removed = DATA.items.splice(i, 1)[0];
    var hadPending = pendingForIndex(i);
    // 未保存の新規だけならサーバー削除は不要
    if (removed && removed.fileName && !hadPending) queueDeleteFile(removed.fileName);
    pendingFiles = pendingFiles
        .filter(function(p) { return p.index !== i; })
        .map(function(p) {
            return { index: p.index > i ? p.index - 1 : p.index, file: p.file, fileName: p.fileName };
        });
    if (!DATA.items.length) DATA.items = [emptyItem()];
    render();
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    DATA.updated = document.getElementById('updatedField').value.trim();

    // タイトルもPDFも空の行は保存対象から外す（途中の「追加しただけ」の空行対策）
    var kept = [];
    var keptPending = [];
    for (var i = 0; i < DATA.items.length; i++) {
        var it = DATA.items[i];
        var title = (it.title || '').trim();
        var pending = pendingForIndex(i);
        var fileName = pending ? pending.fileName : (it.fileName || '');
        if (!title && !fileName) continue;
        if (!title) {
            cmsSetStatus((kept.length + 1) + '件目のタイトルを入力してください。');
            return;
        }
        if (!fileName) {
            cmsSetStatus((kept.length + 1) + '件目のPDFファイルを選んでください。空の行は削除するか、PDFを選んでください。');
            return;
        }
        kept.push({ title: title, fileName: fileName });
        if (pending) {
            keptPending.push({ file: pending.file, fileName: fileName });
        }
    }

    if (!kept.length) {
        cmsSetStatus('タイトルとPDFを入力してから保存してください。');
        return;
    }

    var payload = { updated: DATA.updated, items: kept };
    var ok = await cmsSave({
        kind: 'importantNotes',
        jsonPath: facilityDir() + '/importantNotes.json',
        payload: payload,
        destDir: keptPending.length ? facilityDir() : '',
        files: keptPending,
        deletePaths: pendingDeletePaths.slice()
    });
    if (ok) {
        pendingFiles = [];
        pendingDeletePaths = [];
        DATA = payload;
        render();
        if (keptPending.length) {
            cmsSetStatus('サーバーに保存しました（PDF ' + keptPending.length + ' 件）。');
        }
    }
});

cmsRememberPassword();
loadFacility();
