/**
 * 施設ごとの年間行事（行事名と写真のタイトル・文章・画像）を編集する
 * 保存先: assets/otherimage/{施設ID}/pict.json と画像ファイル
 */
var FACILITY_JSON = {};
var pendingFiles = [];
var currentId = 'hanazono';
var currentSeason = 'spring';

/** 施設ごとの画像・JSON ディレクトリ（サイトルート基準） */
function facilityAssetDir(id) {
    return 'assets/otherimage/' + (id || currentId);
}

function seasonBlock() {
    if (!FACILITY_JSON[currentSeason]) {
        FACILITY_JSON[currentSeason] = { label: '', items: [], photos: [] };
    }
    if (!FACILITY_JSON[currentSeason].photos) FACILITY_JSON[currentSeason].photos = [];
    if (!FACILITY_JSON[currentSeason].items) FACILITY_JSON[currentSeason].items = [];
    return FACILITY_JSON[currentSeason];
}

/** アップロードするファイル名を本番でも壊れない形にする（NFC・拡張子小文字） */
function safeUploadFileName(original) {
    var n = String(original || 'image.jpg');
    if (n.normalize) n = n.normalize('NFC');
    n = n.replace(/\\/g, '/').split('/').pop();
    var ext = (n.split('.').pop() || 'jpg').toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (!/^(jpg|png|gif|webp)$/.test(ext)) ext = 'jpg';
    var base = n.replace(/\.[^.]+$/, '');
    base = base.replace(/[\\/:*?"<>|#?&%]/g, '_').replace(/\s+/g, '_');
    if (!base) base = 'image';
    return base + '.' + ext;
}

/** 管理画面プレビュー用URL（外部URLはそのまま、ルート相対は ../ を付与） */
function photoSrc(url) {
    if (!url) return '';
    if (/^https?:/i.test(url) || url.indexOf('blob:') === 0) return url;
    var rel = String(url).replace(/\\/g, '/');
    if (rel.normalize) rel = rel.normalize('NFC');
    var encoded = rel.split('/').map(function(seg) {
        if (!seg || seg === '.' || seg === '..') return seg;
        try { return encodeURIComponent(decodeURIComponent(seg)); }
        catch (e) { return encodeURIComponent(seg); }
    }).join('/');
    // 旧パス photos/xxx → 施設フォルダ内相対だったものを互換表示
    if (rel.indexOf('photos/') === 0) {
        return '../facilities/' + currentId + '/' + encoded;
    }
    return '../' + encoded;
}

/** いまの季節・枠に、まだ保存していない選択ファイルがあるか */
function pendingForPhoto(i) {
    for (var k = 0; k < pendingFiles.length; k++) {
        if (pendingFiles[k].season === currentSeason && pendingFiles[k].photoIndex === i) {
            return pendingFiles[k];
        }
    }
    return null;
}

function renderPhotos() {
    var list = document.getElementById('photoList');
    var photos = seasonBlock().photos;
    list.innerHTML = photos.map(function(photo, i) {
        var pending = pendingForPhoto(i);
        // 未保存の選択ファイルは blob URL でその場のサムネイルにする
        var src = pending ? URL.createObjectURL(pending.file) : photoSrc(photo.imageUrl);
        return '<div class="photo-edit" data-index="' + i + '">' +
            (src ? '<img src="' + src + '" alt="">' : '<p>写真未設定</p>') +
            '<label>タイトル<input type="text" data-field="title" value="' + cmsEscape(photo.title || '') + '"></label>' +
            '<label>文章<textarea data-field="description" rows="2">' + cmsEscape(photo.description || '') + '</textarea></label>' +
            '<label>写真を差し替え<input type="file" data-field="file" accept="image/*"></label>' +
            '<button type="button" class="btn btn-danger" data-remove="' + i + '">この写真を削除</button>' +
            '</div>';
    }).join('');
}

function collectForm() {
    var block = seasonBlock();
    block.items = document.getElementById('itemsField').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    var cards = document.querySelectorAll('.photo-edit');
    cards.forEach(function(card, i) {
        if (!block.photos[i]) return;
        var title = card.querySelector('[data-field="title"]');
        var desc = card.querySelector('[data-field="description"]');
        if (title) block.photos[i].title = title.value;
        if (desc) block.photos[i].description = desc.value;
    });
}

function showSeason() {
    var block = seasonBlock();
    document.getElementById('itemsField').value = (block.items || []).join('\n');
    renderPhotos();
}

async function loadFacility(opts) {
    currentId = document.getElementById('facilitySelect').value;
    currentSeason = document.getElementById('seasonSelect').value;
    pendingFiles = [];
    try {
        // 各施設フォルダの pict.json を読む
        var res = await fetch('../' + facilityAssetDir(currentId) + '/pict.json', { cache: 'no-store' });
        FACILITY_JSON = await res.json();
        showSeason();
        if (!(opts && opts.silent)) {
            cmsSetStatus(currentId + ' を読み込みました。（' + facilityAssetDir(currentId) + '/）');
        }
    } catch (e) {
        console.error(e);
        cmsSetStatus('読み込みに失敗しました。');
    }
}

document.getElementById('facilitySelect').addEventListener('change', function() {
    collectForm();
    loadFacility();
});
document.getElementById('seasonSelect').addEventListener('change', function() {
    collectForm();
    currentSeason = this.value;
    showSeason();
});

document.getElementById('photoList').addEventListener('input', collectForm);
document.getElementById('itemsField').addEventListener('input', collectForm);

document.getElementById('photoList').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-remove]');
    if (!btn) return;
    collectForm();
    var i = Number(btn.getAttribute('data-remove'));
    seasonBlock().photos.splice(i, 1);
    // 削除した枠の未保存ファイルを捨て、後ろの枠番号を詰める
    pendingFiles = pendingFiles.filter(function(f) {
        if (f.season !== currentSeason) return true;
        if (f.photoIndex === i) return false;
        if (f.photoIndex > i) f.photoIndex -= 1;
        return true;
    });
    renderPhotos();
});

document.getElementById('photoList').addEventListener('change', function(e) {
    var input = e.target.closest('input[type="file"]');
    if (!input || !input.files || !input.files[0]) return;
    var card = input.closest('.photo-edit');
    var i = Number(card.getAttribute('data-index'));
    var file = input.files[0];
    var name = safeUploadFileName(file.name);
    // JSON にはサイトルート基準のパスを書き、画像は同じ施設フォルダへ保存する
    seasonBlock().photos[i].imageUrl = facilityAssetDir(currentId) + '/' + name;
    pendingFiles = pendingFiles.filter(function(f) {
        return !(f.season === currentSeason && f.photoIndex === i);
    });
    pendingFiles.push({ file: file, fileName: name, photoIndex: i, season: currentSeason });
    collectForm();
    renderPhotos();
});

document.getElementById('addPhotoBtn').addEventListener('click', function() {
    collectForm();
    seasonBlock().photos.push({ imageUrl: '', title: '', description: '' });
    renderPhotos();
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    collectForm();
    var dir = facilityAssetDir(currentId);
    var ok = await cmsSave({
        kind: 'pict',
        jsonPath: dir + '/pict.json',
        payload: FACILITY_JSON,
        destDir: dir,
        files: pendingFiles
    });
    if (ok) {
        pendingFiles = [];
        await loadFacility({ silent: true });
    }
});

cmsRememberPassword();
loadFacility();
