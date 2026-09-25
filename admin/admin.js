/**
 * カルーセル・お知らせの簡易管理
 * - data/topics.json を読み込んで一覧表示する
 * - PHP サーバーでは save.php で JSON と写真を直接書き込む
 * - PHP が無い場合はダウンロードしてサーバーへ置く
 */

const TOPICS_URL = '../data/topics.json';
const IMAGE_DIR = 'assets/otherimage/slider/';
const CAROUSEL_COUNT = 3;
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
/** カルーセルの簡単な説明の文字数上限 */
const DESC_MAX = 50;

/** 読み込んだお知らせ一覧（編集はこの配列に対して行う） */
let topics = [];
/** 今回新しく選んだ写真。ダウンロード時だけファイルとして書き出す */
let pendingImages = {};
/** 差し替え・削除した写真。サーバー保存時に実ファイルを消す */
let pendingDeletePaths = [];
/** 編集中の id。null なら新規追加 */
let editingId = null;
/** プレビュー用 Object URL（使い終わったら解放する） */
let previewObjectUrl = '';

const listEl = document.getElementById('topicList');
const statusEl = document.getElementById('status');
const searchInput = document.getElementById('searchInput');
const overlay = document.getElementById('formOverlay');
const form = document.getElementById('topicForm');
const formTitle = document.getElementById('formTitle');
const imagePreview = document.getElementById('imagePreview');
const imagePathNote = document.getElementById('imagePathNote');
/** 開いた直後のクリックでオーバーレイが閉じないようにする */
let allowOverlayClose = false;

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function setStatus(message) {
    statusEl.textContent = message;
}

function sortedByDate(items) {
    return items.slice().sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
    });
}

/** カルーセルに出る 3 件の id */
function carouselIdSet() {
    return new Set(sortedByDate(topics).slice(0, CAROUSEL_COUNT).map(function (item) {
        return item.id;
    }));
}

/** 日付の新しい順に並べる。id は付け直さない（詳細ページの ?id= がずれないようにする） */
function normalizeTopicOrder() {
    topics = sortedByDate(topics);
}

function nextTopicId() {
    var max = 0;
    topics.forEach(function (item) {
        var n = Number(item.id);
        if (n > max) max = n;
    });
    return max + 1;
}

function fileExt(fileName) {
    const ext = String(fileName || '').split('.').pop().toLowerCase();
    if (ext === 'jpeg') return 'jpg';
    return ALLOWED_EXT.includes(ext) ? ext : 'jpg';
}

/** 選んだ写真の名前。save.php と同じ規則（jpeg→jpg、危険な文字だけ置換） */
function safeFileName(fileName) {
    let base = String(fileName || 'image').split(/[/\\]/).pop();
    if (base.normalize) base = base.normalize('NFC');
    const ext = fileExt(base);
    let stem = base.replace(/\.[^.]+$/, '');
    stem = stem.replace(/[\\/:*?"<>|#?&%]/g, '_').trim();
    if (!stem) stem = 'image';
    return stem + '.' + ext;
}

/** JSON に書く写真パス。同じ名前があれば id を付けて重複を避ける */
function imagePathForFile(id, fileName) {
    const name = safeFileName(fileName);
    const path = IMAGE_DIR + name;
    const used = topics.some(function (item) {
        return item.id !== id && item.image === path;
    });
    if (!used) return path;
    return IMAGE_DIR + id + '-' + name;
}

function fileNameFromPath(path) {
    return String(path || '').split('/').pop();
}

/** スライダーフォルダの写真だけ削除対象にする */
function isSliderImagePath(path) {
    var rel = String(path || '').replace(/\\/g, '/');
    return /^assets\/otherimage\/slider\/[^/]+\.(jpe?g|png|gif|webp)$/i.test(rel);
}

/** 他のお知らせが同じ写真を使っているか */
function imageStillUsed(path, exceptId) {
    return topics.some(function (t) {
        return t.id !== exceptId && t.image === path;
    });
}

/** もう使わない写真を、保存時の削除リストへ入れる */
function queueDeleteImage(path) {
    if (!isSliderImagePath(path)) return;
    if (pendingDeletePaths.indexOf(path) === -1) pendingDeletePaths.push(path);
}

/** JSON に残っている写真は消さない */
function unusedDeletePaths() {
    var used = {};
    topics.forEach(function (t) {
        if (t.image) used[t.image] = true;
    });
    return pendingDeletePaths.filter(function (p) {
        return !used[p];
    });
}

function revokePreviewUrl() {
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = '';
    }
}

function showPreview(src) {
    if (!src) {
        imagePreview.hidden = true;
        imagePreview.removeAttribute('src');
        return;
    }
    imagePreview.src = src;
    imagePreview.hidden = false;
}

/** 簡単な説明の残り文字数を表示する */
function updateDescCount() {
    const el = document.getElementById('fieldDescription');
    const countEl = document.getElementById('descCount');
    if (!el || !countEl) return;
    countEl.textContent = el.value.length + ' / ' + DESC_MAX;
}

function renderList() {
    const keyword = (searchInput.value || '').trim();
    const inCarousel = carouselIdSet();
    const items = sortedByDate(topics).filter(function (item) {
        if (!keyword) return true;
        return String(item.title || '').indexOf(keyword) !== -1;
    });

    listEl.innerHTML = items.map(function (item) {
        const badge = inCarousel.has(item.id)
            ? '<span class="carousel-badge">カルーセル表示</span>'
            : '';
        const carouselClass = inCarousel.has(item.id) ? ' is-carousel' : '';
        return (
            '<li class="topic-admin-item' + carouselClass + '">' +
                '<span class="item-date">' + escapeHtml(item.date) + '</span>' +
                '<span class="item-category">' + escapeHtml(item.category) + '</span>' +
                '<div class="item-title">' +
                    '<p>' + escapeHtml(item.title) + '</p>' +
                    (item.image
                        ? '<span class="item-image-name">' + escapeHtml(fileNameFromPath(item.image)) + '</span>'
                        : '') +
                    badge +
                '</div>' +
                '<div class="item-actions">' +
                    '<button type="button" class="btn" data-edit="' + item.id + '">編集</button>' +
                    '<button type="button" class="btn btn-danger" data-delete="' + item.id + '">削除</button>' +
                '</div>' +
            '</li>'
        );
    }).join('');
}

function showOverlay() {
    overlay.removeAttribute('hidden');
    overlay.scrollTop = 0;
    form.scrollTop = 0;
    allowOverlayClose = false;
    setTimeout(function () {
        allowOverlayClose = true;
    }, 200);
}

function openForm(id) {
    editingId = id;
    form.reset();
    revokePreviewUrl();
    showPreview('');
    imagePathNote.textContent = '';

    if (id === null) {
        formTitle.textContent = '新規追加';
        document.getElementById('fieldId').value = '';
        document.getElementById('fieldDate').value = new Date().toISOString().slice(0, 10);
        document.getElementById('fieldCategory').value = 'イベント';
        document.getElementById('fieldLinkType').value = defaultLinkType('イベント');
        updateDescCount();
        showOverlay();
        return;
    }

    const item = topics.find(function (t) { return t.id === id; });
    if (!item) return;

    formTitle.textContent = '編集';
    document.getElementById('fieldId').value = String(item.id);
    document.getElementById('fieldDate').value = item.date || '';
    document.getElementById('fieldCategory').value = item.category || 'お知らせ';
    document.getElementById('fieldTitle').value = item.title || '';
    document.getElementById('fieldDescription').value = (item.description || '').slice(0, DESC_MAX);
    document.getElementById('fieldDetail').value = item.detail || '';
    document.getElementById('fieldLinkType').value = resolveLinkType(item);
    imagePathNote.textContent = item.image ? '現在の写真: ' + item.image : '写真未設定（プレースホルダー画像が使われます）';

    if (pendingImages[id]) {
        previewObjectUrl = URL.createObjectURL(pendingImages[id].file);
        showPreview(previewObjectUrl);
    } else if (item.image) {
        showPreview('../' + encodeURI(item.image));
    }

    updateDescCount();
    showOverlay();
}

function closeForm() {
    overlay.setAttribute('hidden', '');
    allowOverlayClose = false;
    editingId = null;
    form.reset();
    revokePreviewUrl();
    showPreview('');
}

function saveForm(event) {
    event.preventDefault();

    const isNew = editingId === null;
    const date = document.getElementById('fieldDate').value;
    const category = document.getElementById('fieldCategory').value;
    const title = document.getElementById('fieldTitle').value.trim();
    const description = document.getElementById('fieldDescription').value.trim().slice(0, DESC_MAX);
    const detail = document.getElementById('fieldDetail').value.trim();
    const fileInput = document.getElementById('fieldImage');
    const file = fileInput.files && fileInput.files[0];

    if (!title) {
        setStatus('タイトルを入力してください。');
        return;
    }

    // 新規は空いている番号。既存の id は変えない
    const id = isNew ? nextTopicId() : editingId;

    let image = '';
    if (!isNew) {
        const existing = topics.find(function (t) { return t.id === id; });
        if (existing && existing.image) image = existing.image;
    }

    // 新しい写真を選んだときだけ、元のファイル名でパスを付けてダウンロード対象に入れる
    if (file) {
        var oldImage = image;
        image = imagePathForFile(id, file.name);
        if (oldImage && oldImage !== image && !imageStillUsed(oldImage, id)) {
            queueDeleteImage(oldImage);
        }
        pendingImages[id] = { file: file, fileName: fileNameFromPath(image) };
    }

    const nextItem = {
        id: id,
        date: date,
        title: title,
        category: category,
        description: description,
        detail: detail,
        image: image,
        linkType: document.getElementById('fieldLinkType').value
    };

    if (isNew) {
        topics.push(nextItem);
    } else {
        topics = topics.map(function (item) {
            return item.id === id ? nextItem : item;
        });
    }

    normalizeTopicOrder();
    closeForm();
    renderList();
    const photoHint = file ? ' 写真も一緒にサーバーへ保存できます。' : '';
    setStatus((isNew ? '追加しました。' : '保存しました。') + '最後に「サーバーに保存」してください。' + photoHint);
}

function deleteItem(id) {
    const item = topics.find(function (t) { return t.id === id; });
    const label = item ? item.title : 'この件';
    if (!window.confirm('「' + label + '」を削除しますか？')) return;

    topics = topics.filter(function (t) { return t.id !== id; });
    if (item && item.image && !imageStillUsed(item.image, id)) {
        queueDeleteImage(item.image);
    }
    delete pendingImages[id];
    normalizeTopicOrder();
    renderList();
    setStatus('削除しました。最後に「サーバーに保存」してください。');
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // JSON だとブラウザがタブで開くことがあるので、常にファイルとして落とす
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 2000);
}

/** topics.json を書き出す。Chrome なら保存先を選べる。それ以外はダウンロードフォルダへ落とす */
async function saveTopicsJsonFile() {
    const text = JSON.stringify(topics, null, 4);
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'topics.json',
                types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(text);
            await writable.close();
            return 'picker';
        } catch (error) {
            if (error && error.name === 'AbortError') return 'cancel';
        }
    }
    // 保存ダイアログが使えないときは、ブラウザのダウンロードフォルダへ落とす
    downloadBlob(new Blob([text], { type: 'application/octet-stream' }), 'topics.json');
    return 'download';
}

/** PHP の save.php へ JSON と新しい写真を送り、サーバーのフォルダへ書き込む */
async function saveToServer() {
    normalizeTopicOrder();
    var pendingList = Object.keys(pendingImages).map(function (key) { return pendingImages[key]; });
    var ok = await cmsSave({
        kind: 'topics',
        jsonPath: 'data/topics.json',
        payload: topics,
        destDir: 'assets/otherimage/slider',
        files: pendingList,
        deletePaths: unusedDeletePaths()
    });
    if (!ok) return;
    pendingImages = {};
    pendingDeletePaths = [];
    setStatus('サーバーに保存しました。トップページを再読み込みしてください。');
}

/** PHP が使えないときの控え：JSON と写真をダウンロードする */
async function downloadAll() {
    normalizeTopicOrder();
    // JSON を先に出す。写真と同時だと、2件目以降をブラウザが止めることがある
    const result = await saveTopicsJsonFile();
    if (result === 'cancel') {
        setStatus('保存をキャンセルしました。');
        return;
    }

    const images = Object.keys(pendingImages).map(function (key) {
        return pendingImages[key];
    });
    images.forEach(function (img, i) {
        setTimeout(function () {
            downloadBlob(img.file, img.fileName);
        }, 400 * (i + 1));
    });

    const imageNote = images.length
        ? ' 新しい写真 ' + images.length + ' 枚はブラウザのダウンロードフォルダへ出します。ファイル名を変えずに assets/otherimage/slider/ へ入れてください。'
        : '';
    if (result === 'picker') {
        setStatus('topics.json を保存しました。選んだ場所が data/topics.json か確認してください。' + imageNote);
        return;
    }
    setStatus('ブラウザのダウンロードフォルダに topics.json を保存しました。プロジェクトの data/topics.json を、そのファイルで上書きしてください。' + imageNote);
}

async function init() {
    try {
        const response = await fetch(TOPICS_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error('読み込みに失敗しました');
        topics = await response.json();
        normalizeTopicOrder();
        renderList();
        const savedPassword = sessionStorage.getItem('adminPassword');
        if (savedPassword) {
            document.getElementById('adminPassword').value = savedPassword;
        }
        setStatus(topics.length + ' 件を読み込みました。');
    } catch (error) {
        console.error(error);
        setStatus('topics.json を読み込めませんでした。npm start してからこのページを開いてください。');
    }
}

document.getElementById('addBtn').addEventListener('click', function () {
    openForm(null);
});

document.getElementById('cancelBtn').addEventListener('click', closeForm);

document.getElementById('saveServerBtn').addEventListener('click', function () {
    saveToServer();
});

document.getElementById('downloadBtn').addEventListener('click', function () {
    downloadAll();
});

searchInput.addEventListener('input', renderList);

document.getElementById('adminPassword').addEventListener('change', function () {
    sessionStorage.setItem('adminPassword', this.value);
});

form.addEventListener('submit', saveForm);

document.getElementById('fieldDescription').addEventListener('input', updateDescCount);

// カテゴリを変えたら、行き先の初期値を合わせる（その後で上書きできる）
document.getElementById('fieldCategory').addEventListener('change', function () {
    document.getElementById('fieldLinkType').value = defaultLinkType(this.value);
});

// 一覧の編集・削除（イベント委譲）
listEl.addEventListener('click', function (event) {
    const editBtn = event.target.closest('[data-edit]');
    const deleteBtn = event.target.closest('[data-delete]');
    if (editBtn) openForm(Number(editBtn.getAttribute('data-edit')));
    if (deleteBtn) deleteItem(Number(deleteBtn.getAttribute('data-delete')));
});

// 写真を選んだらその場でプレビューする
document.getElementById('fieldImage').addEventListener('change', function (event) {
    const file = event.target.files && event.target.files[0];
    revokePreviewUrl();
    if (!file) return;
    previewObjectUrl = URL.createObjectURL(file);
    showPreview(previewObjectUrl);
    const idForName = editingId === null ? 1 : editingId;
    imagePathNote.textContent = 'assets/otherimage/slider/ に置くファイル名: ' + fileNameFromPath(imagePathForFile(idForName, file.name));
});

overlay.addEventListener('click', function (event) {
    if (!allowOverlayClose) return;
    if (event.target === overlay) closeForm();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
