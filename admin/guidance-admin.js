/**
 * 施設案内の写真5枚を編集する
 * 保存先: assets/otherimage/{施設ID}/guidance.json と画像
 */
var SLOT_COUNT = 5;
var GUIDANCE_JSON = { items: [] };
var pendingFiles = [];
var currentId = 'sainiwa';

function facilityAssetDir(id) {
    return 'assets/otherimage/' + (id || currentId);
}

function emptyItem() {
    return { imageUrl: '', title: '', description: '' };
}

function ensureFive(data) {
    var items = (data && data.items && data.items.slice) ? data.items.slice(0, SLOT_COUNT) : [];
    while (items.length < SLOT_COUNT) items.push(emptyItem());
    return { items: items };
}

function photoSrc(url) {
    if (!url) return '';
    if (/^https?:/i.test(url) || url.indexOf('blob:') === 0) return url;
    return '../' + encodeURI(url);
}

function pendingForSlot(i) {
    for (var k = 0; k < pendingFiles.length; k++) {
        if (pendingFiles[k].slot === i) return pendingFiles[k];
    }
    return null;
}

function collectForm() {
    var cards = document.querySelectorAll('#photoList .photo-edit');
    cards.forEach(function(card, i) {
        if (!GUIDANCE_JSON.items[i]) GUIDANCE_JSON.items[i] = emptyItem();
        var title = card.querySelector('[data-field="title"]');
        var desc = card.querySelector('[data-field="description"]');
        if (title) GUIDANCE_JSON.items[i].title = title.value;
        if (desc) GUIDANCE_JSON.items[i].description = desc.value;
    });
}

function renderPhotos() {
    var list = document.getElementById('photoList');
    list.innerHTML = GUIDANCE_JSON.items.map(function(item, i) {
        var pending = pendingForSlot(i);
        var src = pending ? URL.createObjectURL(pending.file) : photoSrc(item.imageUrl);
        return '<div class="photo-edit" data-index="' + i + '">' +
            '<p class="fee-block-type">写真 ' + (i + 1) + ' / 5</p>' +
            (src ? '<img src="' + src + '" alt="">' : '<p>写真未設定</p>') +
            '<label>タイトル<input type="text" data-field="title" value="' + cmsEscape(item.title || '') + '"></label>' +
            '<label>説明<textarea data-field="description" rows="2">' + cmsEscape(item.description || '') + '</textarea></label>' +
            '<label>写真を登録<input type="file" data-field="file" accept="image/*"></label>' +
            '</div>';
    }).join('');
}

async function loadFacility(opts) {
    currentId = document.getElementById('facilitySelect').value;
    pendingFiles = [];
    try {
        var res = await fetch('../' + facilityAssetDir(currentId) + '/guidance.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        GUIDANCE_JSON = ensureFive(await res.json());
        renderPhotos();
        if (!(opts && opts.silent)) cmsSetStatus(currentId + ' の施設案内を読み込みました。');
    } catch (e) {
        console.error(e);
        GUIDANCE_JSON = ensureFive({ items: [] });
        renderPhotos();
        cmsSetStatus('データが無いため空の5枠を表示しています。入力後に保存してください。');
    }
}

document.getElementById('facilitySelect').addEventListener('change', function() {
    collectForm();
    loadFacility();
});

document.getElementById('photoList').addEventListener('input', collectForm);

document.getElementById('photoList').addEventListener('change', function(e) {
    var input = e.target.closest('input[type="file"]');
    if (!input || !input.files || !input.files[0]) return;
    var card = input.closest('.photo-edit');
    var i = Number(card.getAttribute('data-index'));
    var file = input.files[0];
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var name = 'guidance-' + (i + 1) + '.' + ext;
    GUIDANCE_JSON.items[i].imageUrl = facilityAssetDir(currentId) + '/' + name;
    pendingFiles = pendingFiles.filter(function(f) { return f.slot !== i; });
    pendingFiles.push({ file: file, fileName: name, slot: i });
    collectForm();
    renderPhotos();
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    collectForm();
    var dir = facilityAssetDir(currentId);
    var ok = await cmsSave({
        kind: 'guidance',
        jsonPath: dir + '/guidance.json',
        payload: GUIDANCE_JSON,
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
