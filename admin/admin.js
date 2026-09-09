/**
 * カルーセル・お知らせの簡易管理
 * - data/topics.json を読み込んで一覧表示する
 * - PHP サーバーでは save.php で JSON と写真を直接書き込む
 * - PHP が無い場合はダウンロードしてサーバーへ置く
 */

const TOPICS_URL = '../data/topics.json';
const IMAGE_DIR = 'otherimage/slider/';
const CAROUSEL_COUNT = 7;
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/** 読み込んだお知らせ一覧（編集はこの配列に対して行う） */
let topics = [];
/** 今回新しく選んだ写真。ダウンロード時だけファイルとして書き出す */
let pendingImages = {};
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

/** カルーセルに出る 7 件の id */
function carouselIdSet() {
    return new Set(sortedByDate(topics).slice(0, CAROUSEL_COUNT).map(function (item) {
        return item.id;
    }));
}

/** 日付の新しい順に並べ、id を 1 から振り直す（新しい件が先頭） */
function normalizeTopicOrder() {
    const nextPending = {};
    topics = sortedByDate(topics).map(function (item, index) {
        const newId = index + 1;
        if (pendingImages[item.id]) {
            nextPending[newId] = pendingImages[item.id];
        }
        return Object.assign({}, item, { id: newId });
    });
    pendingImages = nextPending;
}

function fileExt(fileName) {
    const ext = String(fileName || '').split('.').pop().toLowerCase();
    if (ext === 'jpeg') return 'jpg';
    return ALLOWED_EXT.includes(ext) ? ext : 'jpg';
}

/** 選んだ写真の名前をほぼそのまま使う（スペースも残す。危険な文字だけ置換） */
function safeFileName(fileName) {
    const base = String(fileName || 'image').split(/[/\\]/).pop();
    const cleaned = base.replace(/[\\/:*?"<>|]/g, '_').trim();
    return cleaned || 'image.png';
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
    document.getElementById('fieldDescription').value = item.description || '';
    imagePathNote.textContent = item.image ? '現在の写真: ' + item.image : '写真未設定（プレースホルダー画像が使われます）';

    if (pendingImages[id]) {
        previewObjectUrl = URL.createObjectURL(pendingImages[id].file);
        showPreview(previewObjectUrl);
    } else if (item.image) {
        showPreview('../' + encodeURI(item.image));
    }

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
    const description = document.getElementById('fieldDescription').value.trim();
    const fileInput = document.getElementById('fieldImage');
    const file = fileInput.files && fileInput.files[0];

    if (!title) {
        setStatus('タイトルを入力してください。');
        return;
    }

    // 新規は仮の id。保存後に日付順で 1 から振り直す
    const id = isNew ? -1 : editingId;

    let image = '';
    if (!isNew) {
        const existing = topics.find(function (t) { return t.id === id; });
        if (existing && existing.image) image = existing.image;
    }

    // 新しい写真を選んだときだけ、元のファイル名でパスを付けてダウンロード対象に入れる
    if (file) {
        image = imagePathForFile(id, file.name);
        pendingImages[id] = { file: file, fileName: fileNameFromPath(image) };
    }

    const nextItem = {
        id: id,
        date: date,
        title: title,
        category: category,
        description: description,
        image: image
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
    const password = document.getElementById('adminPassword').value;
    if (!password) {
        setStatus('パスワードを入力してください。');
        return;
    }

    const formData = new FormData();
    formData.append('password', password);
    formData.append('kind', 'topics');
    formData.append('jsonPath', 'data/topics.json');
    formData.append('payload', JSON.stringify(topics));
    formData.append('destDir', 'otherimage/slider');
    Object.keys(pendingImages).forEach(function (key) {
        const img = pendingImages[key];
        formData.append('files[]', img.file, img.fileName);
    });

    setStatus('サーバーに保存しています…');
    try {
        const response = await fetch('save.php', { method: 'POST', body: formData, cache: 'no-store' });
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            setStatus('PHP が動いていません。本番サーバーで開くか、npm run start:php を使ってください。');
            return;
        }
        if (!data.ok) {
            setStatus(data.error || '保存に失敗しました。');
            return;
        }
        pendingImages = {};
        const n = (data.files && data.files.length) ? data.files.length : 0;
        setStatus(n ? 'サーバーに保存しました（ファイル ' + n + ' 件）。トップページを再読み込みしてください。' : 'サーバーに保存しました。トップページを再読み込みしてください。');
    } catch (error) {
        console.error(error);
        setStatus('サーバーへ保存できませんでした。PHP が動いているか確認してください。');
    }
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
        ? ' 新しい写真 ' + images.length + ' 枚はブラウザのダウンロードフォルダへ出します。ファイル名を変えずに otherimage/slider/ へ入れてください。'
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
    imagePathNote.textContent = 'otherimage/slider/ に置くファイル名: ' + fileNameFromPath(imagePathForFile(idForName, file.name));
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
