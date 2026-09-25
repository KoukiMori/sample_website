/**
 * 施設ごとの年間行事（行事名と写真のタイトル・文章・画像）を編集する
 * 保存先: assets/otherimage/{施設ID}/pict.json と画像ファイル
 */
var FACILITY_JSON = {};
var pendingFiles = [];
/** 差し替え・削除した写真。サーバー保存時に実ファイルを消す */
var pendingDeletePaths = [];
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

/**
 * アップロードするファイル名を save.php と同じ規則にする
 * （）や・を画面側だけ残すと、サーバーは _ 付きで保存し、再読込で写真が消える
 */
function safeUploadFileName(original) {
    var n = String(original || 'image.jpg');
    if (n.normalize) n = n.normalize('NFC');
    n = n.replace(/\\/g, '/').split('/').pop();
    var match = n.match(/\.([^.]+)$/);
    var ext = match ? match[1].toLowerCase() : 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    if (!/^(jpg|png|gif|webp)$/.test(ext)) ext = 'jpg';
    var base = match ? n.slice(0, -match[0].length) : n;
    base = base.replace(/[\\/:*?"<>|#?&%・（）()【】「」『』［］｛｝\u3000]/g, '_');
    base = base.replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
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

function normalizeImageRel(url) {
    var rel = String(url || '').replace(/\\/g, '/');
    if (rel.indexOf('assets/') !== 0) return '';
    return rel;
}

/** 施設ヒーロー画像や案内写真は消さない */
function isProtectedFacilityFile(rel) {
    var base = String(rel).split('/').pop().toLowerCase();
    if (/^(hanazono|sainiwa|tomoyama|fukushi_center)\.(png|jpe?g|gif|webp)$/.test(base)) return true;
    if (/^guidance-[1-5]\.(png|jpe?g|gif|webp)$/.test(base)) return true;
    return false;
}

/** ほかの季節・枠が同じ写真を使っているか */
function photoStillUsed(rel) {
    var seasons = ['spring', 'summer', 'autumn', 'winter'];
    for (var s = 0; s < seasons.length; s++) {
        var photos = (FACILITY_JSON[seasons[s]] && FACILITY_JSON[seasons[s]].photos) || [];
        for (var i = 0; i < photos.length; i++) {
            if (normalizeImageRel(photos[i].imageUrl) === rel) return true;
        }
    }
    return false;
}

function queueDeletePhoto(url) {
    var rel = normalizeImageRel(url);
    if (!rel) return;
    if (!/^assets\/otherimage\/(hanazono|sainiwa|tomoyama|fukushi_center)\/[^/]+\.(jpe?g|png|gif|webp)$/i.test(rel)) return;
    if (isProtectedFacilityFile(rel)) return;
    if (pendingDeletePaths.indexOf(rel) === -1) pendingDeletePaths.push(rel);
}

function unusedFacilityDeletePaths() {
    return pendingDeletePaths.filter(function(rel) {
        return !photoStillUsed(rel);
    });
}

function renderItems() {
    var list = document.getElementById('itemList');
    var items = seasonBlock().items;
    list.innerHTML = items.map(function(name, i) {
        return '<div class="photo-edit facility-sortable facility-item" data-index="' + i + '">' +
            /* 左のつまみだけをドラッグして、行事名の表示順を入れ替える */
            '<div class="overview-drag-handle" draggable="true" title="ドラッグして順番を変更">⋮⋮</div>' +
            '<div class="facility-sortable-body">' +
                '<label>行事名<input type="text" data-field="item" value="' + cmsEscape(name || '') + '"></label>' +
                '<button type="button" class="btn btn-danger" data-remove-item="' + i + '">この行事名を削除</button>' +
            '</div>' +
            '</div>';
    }).join('');
}

function renderPhotos() {
    var list = document.getElementById('photoList');
    var photos = seasonBlock().photos;
    list.innerHTML = photos.map(function(photo, i) {
        var pending = pendingForPhoto(i);
        // 未保存の選択ファイルは blob URL でその場のサムネイルにする
        var src = pending ? URL.createObjectURL(pending.file) : photoSrc(photo.imageUrl);
        return '<div class="photo-edit facility-sortable facility-photo" data-index="' + i + '">' +
            /* 左のつまみだけをドラッグして、写真の表示順を入れ替える */
            '<div class="overview-drag-handle" draggable="true" title="ドラッグして順番を変更">⋮⋮</div>' +
            '<div class="facility-sortable-body">' +
                (src ? '<img src="' + src + '" alt="" draggable="false">' : '<p>写真未設定</p>') +
                '<label>タイトル<input type="text" data-field="title" value="' + cmsEscape(photo.title || '') + '"></label>' +
                '<label>文章<textarea data-field="description" rows="2">' + cmsEscape(photo.description || '') + '</textarea></label>' +
                '<label>写真を差し替え<input type="file" data-field="file" accept="image/*"></label>' +
                '<button type="button" class="btn btn-danger" data-remove="' + i + '">この写真を削除</button>' +
            '</div>' +
            '</div>';
    }).join('');
}

function collectForm() {
    var block = seasonBlock();
    /* 空欄も残す。並べ替え中に行数がずれないようにするため。空欄は保存時に除く */
    block.items = Array.prototype.map.call(document.querySelectorAll('#itemList .facility-item'), function(card) {
        var input = card.querySelector('[data-field="item"]');
        return input ? input.value : '';
    });
    var cards = document.querySelectorAll('#photoList .facility-photo');
    cards.forEach(function(card, i) {
        if (!block.photos[i]) return;
        var title = card.querySelector('[data-field="title"]');
        var desc = card.querySelector('[data-field="description"]');
        if (title) block.photos[i].title = title.value;
        if (desc) block.photos[i].description = desc.value;
    });
}

/** 保存直前に、行事名の前後空白と空行を除く */
function trimItemsForSave() {
    Object.keys(FACILITY_JSON).forEach(function(key) {
        var block = FACILITY_JSON[key];
        if (!block || !block.items) return;
        block.items = block.items.map(function(s) { return String(s).trim(); }).filter(Boolean);
    });
}

function showSeason() {
    renderItems();
    renderPhotos();
}

/**
 * 写真を移動したあと、まだ保存していないファイルの枠番号を同じだけずらす
 * 例: 0番を2番へ移すと、あいだの1番・2番は一つ前へ詰まる
 */
function remapPendingPhotoIndex(from, to) {
    pendingFiles.forEach(function(f) {
        if (f.season !== currentSeason) return;
        if (f.photoIndex === from) {
            f.photoIndex = to;
        } else if (from < to && f.photoIndex > from && f.photoIndex <= to) {
            f.photoIndex -= 1;
        } else if (to < from && f.photoIndex >= to && f.photoIndex < from) {
            f.photoIndex += 1;
        }
    });
}

/**
 * リストの左つまみをドラッグして、配列の順番を入れ替える
 * 公開ページは配列の先頭から表示するので、上へ置くほど先に出る
 */
function bindSortable(listId, cardSelector, getArray, afterMove) {
    var list = document.getElementById(listId);
    if (!list || list.getAttribute('data-drag-bound') === '1') return;
    list.setAttribute('data-drag-bound', '1');
    var dragFrom = -1;

    list.addEventListener('dragstart', function(e) {
        var handle = e.target.closest('.overview-drag-handle');
        if (!handle || !list.contains(handle)) {
            e.preventDefault();
            return;
        }
        var card = handle.closest(cardSelector);
        if (!card || !list.contains(card)) return;
        collectForm();
        dragFrom = Number(card.getAttribute('data-index'));
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragFrom));
        if (e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(card, 24, 24);
    });

    list.addEventListener('dragend', function() {
        dragFrom = -1;
        list.querySelectorAll(cardSelector).forEach(function(el) {
            el.classList.remove('is-dragging', 'is-drop-target');
        });
    });

    list.addEventListener('dragover', function(e) {
        var card = e.target.closest(cardSelector);
        if (!card || !list.contains(card) || dragFrom < 0) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.querySelectorAll(cardSelector).forEach(function(el) {
            el.classList.toggle('is-drop-target', el === card);
        });
    });

    list.addEventListener('dragleave', function(e) {
        var card = e.target.closest(cardSelector);
        if (card && list.contains(card) && !card.contains(e.relatedTarget)) {
            card.classList.remove('is-drop-target');
        }
    });

    list.addEventListener('drop', function(e) {
        e.preventDefault();
        var card = e.target.closest(cardSelector);
        if (!card || !list.contains(card) || dragFrom < 0) return;
        var toIndex = Number(card.getAttribute('data-index'));
        if (toIndex === dragFrom || isNaN(toIndex)) {
            dragFrom = -1;
            return;
        }
        collectForm();
        var arr = getArray();
        var from = dragFrom;
        var moved = arr.splice(from, 1)[0];
        arr.splice(toIndex, 0, moved);
        dragFrom = -1;
        if (afterMove) afterMove(from, toIndex);
    });
}

async function loadFacility(opts) {
    currentId = document.getElementById('facilitySelect').value;
    currentSeason = document.getElementById('seasonSelect').value;
    pendingFiles = [];
    pendingDeletePaths = [];
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
document.getElementById('itemList').addEventListener('input', collectForm);

/* 行事名：上にある行ほど公開ページのリストで先に出る */
bindSortable('itemList', '.facility-item', function() {
    return seasonBlock().items;
}, function() {
    renderItems();
    cmsSetStatus('行事名の順番を変更しました。保存するまでサーバーには反映されません。');
});

/* 写真：上にあるカードほど公開ページのカードで先に出る */
bindSortable('photoList', '.facility-photo', function() {
    return seasonBlock().photos;
}, function(from, to) {
    remapPendingPhotoIndex(from, to);
    renderPhotos();
    cmsSetStatus('写真の順番を変更しました。保存するまでサーバーには反映されません。');
});

document.getElementById('itemList').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-remove-item]');
    if (!btn) return;
    collectForm();
    seasonBlock().items.splice(Number(btn.getAttribute('data-remove-item')), 1);
    renderItems();
});

document.getElementById('addItemBtn').addEventListener('click', function() {
    collectForm();
    seasonBlock().items.push('');
    renderItems();
});

document.getElementById('photoList').addEventListener('click', function(e) {
    var btn = e.target.closest('[data-remove]');
    if (!btn) return;
    collectForm();
    var i = Number(btn.getAttribute('data-remove'));
    var photo = seasonBlock().photos[i];
    var hadPending = pendingForPhoto(i);
    // サーバー上にある写真だけ削除予約（未保存の新規はファイルがまだ無い）
    if (photo && photo.imageUrl && !hadPending) queueDeletePhoto(photo.imageUrl);
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
    var newUrl = facilityAssetDir(currentId) + '/' + name;
    var oldUrl = seasonBlock().photos[i].imageUrl;
    if (oldUrl && oldUrl !== newUrl && !pendingForPhoto(i)) queueDeletePhoto(oldUrl);
    // JSON にはサイトルート基準のパスを書き、画像は同じ施設フォルダへ保存する
    seasonBlock().photos[i].imageUrl = newUrl;
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
    trimItemsForSave();
    var dir = facilityAssetDir(currentId);
    var ok = await cmsSave({
        kind: 'pict',
        jsonPath: dir + '/pict.json',
        payload: FACILITY_JSON,
        destDir: dir,
        files: pendingFiles,
        deletePaths: unusedFacilityDeletePaths()
    });
    if (ok) {
        pendingFiles = [];
        pendingDeletePaths = [];
        await loadFacility({ silent: true });
    }
});

cmsRememberPassword();
loadFacility();
