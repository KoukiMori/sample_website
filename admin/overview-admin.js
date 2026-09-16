/**
 * 施設ごとの概要表を編集する
 * 保存先: assets/otherimage/{施設ID}/overview.json
 */
var OVERVIEW = emptyOverview();
var currentId = 'sainiwa';

function emptyOverview() {
    return { rows: [emptyRow()] };
}

function emptyRow() {
    return { label: '', value: '', mapUrl: '' };
}

function facilityAssetDir(id) {
    return 'assets/otherimage/' + (id || currentId);
}

// 画面の入力を OVERVIEW に取り込む
function collectForm() {
    var cards = document.querySelectorAll('#rowList .overview-row');
    OVERVIEW.rows = [];
    cards.forEach(function(card) {
        OVERVIEW.rows.push({
            label: (card.querySelector('[data-field="label"]') || {}).value || '',
            value: (card.querySelector('[data-field="value"]') || {}).value || '',
            mapUrl: ((card.querySelector('[data-field="mapUrl"]') || {}).value || '').trim()
        });
    });
}

function rowHtml(row, index) {
    row = row || emptyRow();
    return '<div class="photo-edit overview-row" data-index="' + index + '">' +
        '<label>項目名<input type="text" data-field="label" placeholder="例: 名称" value="' + cmsEscape(row.label || '') + '"></label>' +
        '<label>内容<textarea data-field="value" rows="3" placeholder="表の右側に出す内容">' + cmsEscape(row.value || '') + '</textarea></label>' +
        '<label>GoogleマップのURL（任意）<input type="text" data-field="mapUrl" placeholder="https://..." value="' + cmsEscape(row.mapUrl || '') + '"></label>' +
        '<div class="item-actions">' +
            '<button type="button" class="btn" data-move-up>上へ</button>' +
            '<button type="button" class="btn" data-move-down>下へ</button>' +
            '<button type="button" class="btn btn-danger" data-remove-row>この項目を削除</button>' +
        '</div>' +
        '</div>';
}

function renderRows() {
    document.getElementById('rowList').innerHTML = (OVERVIEW.rows || []).map(rowHtml).join('');
}

async function loadFacility() {
    currentId = document.getElementById('facilitySelect').value;
    try {
        var res = await fetch('../' + facilityAssetDir(currentId) + '/overview.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        OVERVIEW = await res.json();
        if (!OVERVIEW.rows) OVERVIEW.rows = [];
        renderRows();
        cmsSetStatus(currentId + ' の概要を読み込みました。');
    } catch (e) {
        console.error(e);
        OVERVIEW = emptyOverview();
        renderRows();
        cmsSetStatus('データが無いため空の概要表を表示しています。入力後に保存してください。');
    }
}

document.getElementById('facilitySelect').addEventListener('change', function() {
    collectForm();
    loadFacility();
});

document.getElementById('rowList').addEventListener('click', function(e) {
    var removeRow = e.target.closest('[data-remove-row]');
    var moveUp = e.target.closest('[data-move-up]');
    var moveDown = e.target.closest('[data-move-down]');
    if (!removeRow && !moveUp && !moveDown) return;
    collectForm();
    var card = e.target.closest('.overview-row');
    var i = card ? Number(card.getAttribute('data-index')) : -1;
    if (i < 0) return;
    if (removeRow) {
        OVERVIEW.rows.splice(i, 1);
    } else if (moveUp && i > 0) {
        var prev = OVERVIEW.rows[i - 1];
        OVERVIEW.rows[i - 1] = OVERVIEW.rows[i];
        OVERVIEW.rows[i] = prev;
    } else if (moveDown && i < OVERVIEW.rows.length - 1) {
        var next = OVERVIEW.rows[i + 1];
        OVERVIEW.rows[i + 1] = OVERVIEW.rows[i];
        OVERVIEW.rows[i] = next;
    }
    renderRows();
});

document.getElementById('addRowBtn').addEventListener('click', function() {
    collectForm();
    OVERVIEW.rows.push(emptyRow());
    renderRows();
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    collectForm();
    await cmsSave({
        kind: 'overview',
        jsonPath: facilityAssetDir(currentId) + '/overview.json',
        payload: OVERVIEW
    });
});

cmsRememberPassword();
loadFacility();
