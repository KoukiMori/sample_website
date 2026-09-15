/**
 * 施設ごとの使用料金を編集する
 * 保存先: assets/otherimage/{施設ID}/fees.json
 */
var FEE_JSON = emptyFees();
var currentId = 'sainiwa';

function emptyFees() {
    return { note: '', footer: '', pdfUrl: '', pdfLabel: '', blocks: [] };
}

function facilityAssetDir(id) {
    return 'assets/otherimage/' + (id || currentId);
}

function emptyKvBlock() {
    return { caption: '', type: 'kv', rowHeader: false, headers: [], rows: [{ label: '', value: '' }] };
}

function emptyGridBlock() {
    return { caption: '', type: 'grid', rowHeader: false, headers: ['介護度1', '介護度2', '介護度3', '介護度4', '介護度5'], rows: [['', '', '', '', '']] };
}

function collectForm() {
    FEE_JSON.note = document.getElementById('noteField').value;
    FEE_JSON.footer = document.getElementById('footerField').value;
    FEE_JSON.pdfUrl = document.getElementById('pdfUrlField').value.trim();
    FEE_JSON.pdfLabel = document.getElementById('pdfLabelField').value.trim();
    var cards = document.querySelectorAll('#blockList .fee-block');
    FEE_JSON.blocks = [];
    cards.forEach(function(card) {
        var type = card.getAttribute('data-type') || 'kv';
        var caption = (card.querySelector('[data-field="caption"]') || {}).value || '';
        if (type === 'kv') {
            var rows = [];
            card.querySelectorAll('.fee-kv-row').forEach(function(row) {
                rows.push({
                    label: (row.querySelector('[data-field="label"]') || {}).value || '',
                    value: (row.querySelector('[data-field="value"]') || {}).value || ''
                });
            });
            FEE_JSON.blocks.push({ caption: caption, type: 'kv', rowHeader: false, headers: [], rows: rows });
            return;
        }
        var headers = String((card.querySelector('[data-field="headers"]') || {}).value || '')
            .split(',')
            .map(function(s) { return s.trim(); })
            .filter(Boolean);
        var rowHeader = !!(card.querySelector('[data-field="rowHeader"]') || {}).checked;
        var rows = [];
        card.querySelectorAll('.fee-grid-row').forEach(function(row) {
            var cells = [];
            row.querySelectorAll('[data-field="cell"]').forEach(function(input) {
                cells.push(input.value);
            });
            while (cells.length < headers.length) cells.push('');
            rows.push(cells.slice(0, headers.length || cells.length));
        });
        FEE_JSON.blocks.push({ caption: caption, type: 'grid', rowHeader: rowHeader, headers: headers, rows: rows });
    });
}

function kvRowHtml(row) {
    row = row || { label: '', value: '' };
    return '<div class="fee-kv-row">' +
        '<input type="text" data-field="label" placeholder="項目名" value="' + cmsEscape(row.label || '') + '">' +
        '<input type="text" data-field="value" placeholder="内容・金額" value="' + cmsEscape(row.value || '') + '">' +
        '<button type="button" class="btn btn-danger" data-remove-row>削除</button>' +
        '</div>';
}

function gridRowHtml(cells, colCount) {
    cells = cells || [];
    var html = '<div class="fee-grid-row">';
    var i;
    for (i = 0; i < colCount; i++) {
        html += '<input type="text" data-field="cell" value="' + cmsEscape(cells[i] || '') + '">';
    }
    html += '<button type="button" class="btn btn-danger" data-remove-row>削除</button></div>';
    return html;
}

function blockHtml(block, index) {
    var type = block.type === 'grid' ? 'grid' : 'kv';
    var inner;
    if (type === 'kv') {
        inner = (block.rows || []).map(kvRowHtml).join('') +
            '<button type="button" class="btn" data-add-kv-row>行を追加</button>';
    } else {
        var colCount = (block.headers && block.headers.length) ? block.headers.length : 5;
        inner = '<label>列名（カンマ区切り）<input type="text" data-field="headers" value="' + cmsEscape((block.headers || []).join(', ')) + '"></label>' +
            '<label class="fee-check"><input type="checkbox" data-field="rowHeader"' + (block.rowHeader ? ' checked' : '') + '> 左端の列を項目名にする</label>' +
            (block.rows || []).map(function(row) { return gridRowHtml(row, colCount); }).join('') +
            '<button type="button" class="btn" data-add-grid-row>行を追加</button>';
    }
    return '<div class="photo-edit fee-block" data-index="' + index + '" data-type="' + type + '">' +
        '<p class="fee-block-type">' + (type === 'kv' ? '項目と内容' : '複数列の表') + '</p>' +
        '<label>表のタイトル<input type="text" data-field="caption" value="' + cmsEscape(block.caption || '') + '"></label>' +
        inner +
        '<button type="button" class="btn btn-danger" data-remove-block>この表を削除</button>' +
        '</div>';
}

function renderBlocks() {
    var list = document.getElementById('blockList');
    list.innerHTML = (FEE_JSON.blocks || []).map(blockHtml).join('');
}

function showForm() {
    document.getElementById('noteField').value = FEE_JSON.note || '';
    document.getElementById('footerField').value = FEE_JSON.footer || '';
    document.getElementById('pdfUrlField').value = FEE_JSON.pdfUrl || '';
    document.getElementById('pdfLabelField').value = FEE_JSON.pdfLabel || '';
    renderBlocks();
}

async function loadFacility() {
    currentId = document.getElementById('facilitySelect').value;
    try {
        var res = await fetch('../' + facilityAssetDir(currentId) + '/fees.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        FEE_JSON = await res.json();
        if (!FEE_JSON.blocks) FEE_JSON.blocks = [];
        showForm();
        cmsSetStatus(currentId + ' の料金を読み込みました。');
    } catch (e) {
        console.error(e);
        FEE_JSON = emptyFees();
        showForm();
        cmsSetStatus('データが無いため空の料金表を表示しています。入力後に保存してください。');
    }
}

document.getElementById('facilitySelect').addEventListener('change', function() {
    collectForm();
    loadFacility();
});

document.getElementById('blockList').addEventListener('click', function(e) {
    var removeBlock = e.target.closest('[data-remove-block]');
    var removeRow = e.target.closest('[data-remove-row]');
    var addKv = e.target.closest('[data-add-kv-row]');
    var addGrid = e.target.closest('[data-add-grid-row]');
    if (!removeBlock && !removeRow && !addKv && !addGrid) return;
    collectForm();
    var card = e.target.closest('.fee-block');
    var i = card ? Number(card.getAttribute('data-index')) : -1;
    if (removeBlock && i >= 0) {
        FEE_JSON.blocks.splice(i, 1);
    } else if (removeRow && i >= 0) {
        var rowEl = e.target.closest('.fee-kv-row, .fee-grid-row');
        var rows = card.querySelectorAll('.fee-kv-row, .fee-grid-row');
        var r = Array.prototype.indexOf.call(rows, rowEl);
        if (r >= 0) FEE_JSON.blocks[i].rows.splice(r, 1);
    } else if (addKv && i >= 0) {
        FEE_JSON.blocks[i].rows.push({ label: '', value: '' });
    } else if (addGrid && i >= 0) {
        var n = (FEE_JSON.blocks[i].headers || []).length || 5;
        var empty = [];
        var c;
        for (c = 0; c < n; c++) empty.push('');
        FEE_JSON.blocks[i].rows.push(empty);
    }
    renderBlocks();
});

document.getElementById('addKvBtn').addEventListener('click', function() {
    collectForm();
    FEE_JSON.blocks.push(emptyKvBlock());
    renderBlocks();
});

document.getElementById('addGridBtn').addEventListener('click', function() {
    collectForm();
    FEE_JSON.blocks.push(emptyGridBlock());
    renderBlocks();
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    collectForm();
    await cmsSave({
        kind: 'fees',
        jsonPath: facilityAssetDir(currentId) + '/fees.json',
        payload: FEE_JSON
    });
});

cmsRememberPassword();
loadFacility();
