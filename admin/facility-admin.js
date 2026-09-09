/**
 * 施設ごとの年間行事（行事名と写真のタイトル・文章・画像）を編集する
 */
var FACILITY_JSON = {};
var pendingFiles = [];
var currentId = 'hanazono';
var currentSeason = 'spring';

function seasonBlock() {
    if (!FACILITY_JSON[currentSeason]) {
        FACILITY_JSON[currentSeason] = { label: '', items: [], photos: [] };
    }
    if (!FACILITY_JSON[currentSeason].photos) FACILITY_JSON[currentSeason].photos = [];
    if (!FACILITY_JSON[currentSeason].items) FACILITY_JSON[currentSeason].items = [];
    return FACILITY_JSON[currentSeason];
}

function photoSrc(url) {
    if (!url) return '';
    if (/^https?:/i.test(url) || url.indexOf('photos/') === 0) {
        return url.indexOf('photos/') === 0 ? '../facilities/' + currentId + '/' + encodeURI(url) : url;
    }
    return '../' + encodeURI(url);
}

function renderPhotos() {
    var list = document.getElementById('photoList');
    var photos = seasonBlock().photos;
    list.innerHTML = photos.map(function(photo, i) {
        var src = photoSrc(photo.imageUrl);
        return '<div class="photo-edit" data-index="' + i + '">' +
            (src ? '<img src="' + src + '" alt="">' : '') +
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

async function loadFacility() {
    currentId = document.getElementById('facilitySelect').value;
    currentSeason = document.getElementById('seasonSelect').value;
    pendingFiles = [];
    try {
        var res = await fetch('../facilities/' + currentId + '/pict.json', { cache: 'no-store' });
        FACILITY_JSON = await res.json();
        showSeason();
        cmsSetStatus(currentId + ' を読み込みました。');
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
    pendingFiles = pendingFiles.filter(function(f) { return f.photoIndex !== i; });
    renderPhotos();
});

document.getElementById('photoList').addEventListener('change', function(e) {
    var input = e.target.closest('input[type="file"]');
    if (!input || !input.files || !input.files[0]) return;
    var card = input.closest('.photo-edit');
    var i = Number(card.getAttribute('data-index'));
    var file = input.files[0];
    var name = file.name.replace(/[\\/:*?"<>|]/g, '_');
    seasonBlock().photos[i].imageUrl = 'photos/' + name;
    pendingFiles.push({ file: file, fileName: name });
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
    await cmsSave({
        kind: 'pict',
        jsonPath: 'facilities/' + currentId + '/pict.json',
        payload: FACILITY_JSON,
        destDir: 'facilities/' + currentId + '/photos',
        files: pendingFiles
    });
    pendingFiles = [];
});

cmsRememberPassword();
loadFacility();
