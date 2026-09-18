/**
 * 施設ごとの概要表・職員構成表を編集する
 * 保存先: assets/otherimage/{施設ID}/overview.json
 */

/* 福祉センター以外で使う職員構成の役職（固定順）※ emptyOverview より先に定義する */
var DEFAULT_STAFF_ROLES = [
    '施設長', '施設係長', '事務員', '介護支援専門員', '相談員',
    '介護職員', '看護職員', '栄養士', '調理員', '医師'
];

var OVERVIEW = emptyOverview();
var currentId = 'sainiwa';
/* タブ切替用：サーバー未保存の編集内容を施設ごとに一時保持 */
var DRAFTS = {};

function cloneOverview(data) {
    return JSON.parse(JSON.stringify(data || emptyOverview()));
}

function stashDraft(id) {
    if (!id) return;
    DRAFTS[id] = cloneOverview(OVERVIEW);
}

function clearDraft(id) {
    if (id) delete DRAFTS[id];
}

var ALL_FACILITY_IDS = ['sainiwa', 'tomoyama', 'hanazono', 'fukushi_center'];

/* 項目名の並び（空の項目名は除く） */
function labelsFromRows(rows) {
    var labels = [];
    (rows || []).forEach(function(row) {
        var label = (row.label || '').trim();
        if (!label) return;
        if (labels.indexOf(label) === -1) labels.push(label);
    });
    return labels;
}

/* 他施設の rows を master の項目名・順序に揃える
 * ・無い項目名はタイトルだけ追加
 * ・master で消した項目も、他施設にあれば末尾に残す（削除は他施設へ伝播しない） */
function alignRowsToLabels(labels, rows) {
    var byLabel = {};
    (rows || []).forEach(function(row) {
        var key = (row.label || '').trim();
        if (!key || byLabel[key]) return;
        byLabel[key] = {
            label: key,
            value: row.value == null ? '' : String(row.value),
            mapUrl: row.mapUrl == null ? '' : String(row.mapUrl)
        };
    });
    var next = labels.map(function(label) {
        if (byLabel[label]) return byLabel[label];
        return { label: label, value: '', mapUrl: '' };
    });
    // 削除分は他施設から消さない
    Object.keys(byLabel).forEach(function(label) {
        if (labels.indexOf(label) === -1) next.push(byLabel[label]);
    });
    return next;
}

/* タブ移動時：今見ていた施設の項目順を、他施設の下書きにもタイトルだけ反映 */
async function propagateLabelsToOtherDrafts(sourceId) {
    var source = DRAFTS[sourceId] || OVERVIEW;
    var labels = labelsFromRows(source.rows);
    if (!labels.length) return;

    for (var i = 0; i < ALL_FACILITY_IDS.length; i++) {
        var id = ALL_FACILITY_IDS[i];
        if (id === sourceId) continue;

        var data = DRAFTS[id] ? cloneOverview(DRAFTS[id]) : null;
        if (!data) {
            try {
                var res = await fetch('../' + facilityAssetDir(id) + '/overview.json', { cache: 'no-store' });
                data = res.ok ? await res.json() : { rows: [] };
            } catch (e) {
                data = { rows: [] };
            }
        }
        if (!data || typeof data !== 'object') data = { rows: [] };
        if (!Array.isArray(data.rows)) data.rows = [];
        data.rows = alignRowsToLabels(labels, data.rows);
        if (!hasStaffEditor(id)) delete data.staff;
        DRAFTS[id] = data;
    }
}

function emptyOverview() {
    return { rows: [emptyRow()], staff: defaultStaff() };
}

function emptyRow() {
    return { label: '', value: '', mapUrl: '' };
}

function defaultStaff() {
    return {
        title: '職員構成',
        note: '',
        roles: DEFAULT_STAFF_ROLES.map(function(label) {
            return { label: label, count: '' };
        })
    };
}

function hasStaffEditor(id) {
    return id !== 'fukushi_center';
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
    if (hasStaffEditor(currentId)) {
        var titleEl = document.getElementById('staffTitle');
        var noteEl = document.getElementById('staffNote');
        var roles = [];
        document.querySelectorAll('#staffRoleList .staff-role-item').forEach(function(item) {
            roles.push({
                label: item.getAttribute('data-label') || '',
                count: ((item.querySelector('[data-field="count"]') || {}).value || '').trim()
            });
        });
        OVERVIEW.staff = {
            title: (titleEl && titleEl.value.trim()) || '職員構成',
            note: (noteEl && noteEl.value) || '',
            roles: roles.length ? roles : defaultStaff().roles
        };
    } else {
        delete OVERVIEW.staff;
    }
}

function rowHtml(row, index) {
    row = row || emptyRow();
    return '<div class="photo-edit overview-row" data-index="' + index + '">' +
        /* 左のつまみをドラッグして並べ替え */
        '<div class="overview-drag-handle" draggable="true" title="ドラッグして順番を変更">⋮⋮</div>' +
        '<div class="overview-row-fields">' +
            '<label>項目名<input type="text" data-field="label" placeholder="例: 名称" value="' + cmsEscape(row.label || '') + '"></label>' +
            '<label>内容<textarea data-field="value" rows="3" placeholder="表の右側に出す内容">' + cmsEscape(row.value || '') + '</textarea></label>' +
            '<label>GoogleマップのURL（任意）<input type="text" data-field="mapUrl" placeholder="https://..." value="' + cmsEscape(row.mapUrl || '') + '"></label>' +
            '<div class="item-actions">' +
                '<button type="button" class="btn btn-danger" data-remove-row>この項目を削除</button>' +
            '</div>' +
        '</div>' +
        '</div>';
}

function renderRows() {
    document.getElementById('rowList').innerHTML = (OVERVIEW.rows || []).map(rowHtml).join('');
}

/* ドラッグ中の元インデックス */
var dragFromIndex = -1;

function bindOverviewDrag() {
    var list = document.getElementById('rowList');
    if (!list || list.getAttribute('data-drag-bound') === '1') return;
    list.setAttribute('data-drag-bound', '1');

    list.addEventListener('dragstart', function(e) {
        var handle = e.target.closest('.overview-drag-handle');
        if (!handle) {
            e.preventDefault();
            return;
        }
        var card = handle.closest('.overview-row');
        if (!card) return;
        collectForm();
        dragFromIndex = Number(card.getAttribute('data-index'));
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragFromIndex));
    });

    list.addEventListener('dragend', function() {
        dragFromIndex = -1;
        list.querySelectorAll('.overview-row').forEach(function(el) {
            el.classList.remove('is-dragging', 'is-drop-target');
        });
    });

    list.addEventListener('dragover', function(e) {
        var card = e.target.closest('.overview-row');
        if (!card || dragFromIndex < 0) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.querySelectorAll('.overview-row').forEach(function(el) {
            el.classList.toggle('is-drop-target', el === card);
        });
    });

    list.addEventListener('dragleave', function(e) {
        var card = e.target.closest('.overview-row');
        if (card && !card.contains(e.relatedTarget)) {
            card.classList.remove('is-drop-target');
        }
    });

    list.addEventListener('drop', function(e) {
        e.preventDefault();
        var card = e.target.closest('.overview-row');
        if (!card || dragFromIndex < 0) return;
        var toIndex = Number(card.getAttribute('data-index'));
        if (toIndex === dragFromIndex || isNaN(toIndex)) {
            dragFromIndex = -1;
            renderRows();
            return;
        }
        collectForm();
        var moved = OVERVIEW.rows.splice(dragFromIndex, 1)[0];
        OVERVIEW.rows.splice(toIndex, 0, moved);
        dragFromIndex = -1;
        renderRows();
        cmsSetStatus('順番を変更しました。保存するまでサーバーには反映されません。');
    });
}

function ensureStaff() {
    if (!OVERVIEW.staff) OVERVIEW.staff = defaultStaff();
    if (!OVERVIEW.staff.title) OVERVIEW.staff.title = '職員構成';
    if (OVERVIEW.staff.note == null) OVERVIEW.staff.note = '';
    // 役職順を固定リストに揃える（既存人数は引き継ぐ）
    var byLabel = {};
    (OVERVIEW.staff.roles || []).forEach(function(r) {
        if (r && r.label) byLabel[r.label] = r.count == null ? '' : String(r.count);
    });
    OVERVIEW.staff.roles = DEFAULT_STAFF_ROLES.map(function(label) {
        return { label: label, count: byLabel.hasOwnProperty(label) ? byLabel[label] : '' };
    });
}

function renderStaff() {
    var editor = document.getElementById('staffEditor');
    var list = document.getElementById('staffRoleList');
    var titleEl = document.getElementById('staffTitle');
    if (!editor || !list) return;
    if (!hasStaffEditor(currentId)) {
        editor.hidden = true;
        list.innerHTML = '';
        return;
    }
    ensureStaff();
    editor.hidden = false;
    if (titleEl) titleEl.value = OVERVIEW.staff.title || '職員構成';
    var noteEl = document.getElementById('staffNote');
    if (noteEl) noteEl.value = OVERVIEW.staff.note || '';
    list.innerHTML = (OVERVIEW.staff.roles || []).map(function(role) {
        return '<label class="staff-role-item" data-label="' + cmsEscape(role.label) + '">' +
            cmsEscape(role.label) +
            '<input type="text" data-field="count" inputmode="numeric" placeholder="人数" value="' + cmsEscape(role.count || '') + '">' +
            '</label>';
    }).join('');
}

function setActiveTab(id) {
    document.querySelectorAll('#facilityTabs .admin-tab').forEach(function(btn) {
        var on = btn.getAttribute('data-facility') === id;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
}

async function loadFacility(id) {
    if (id) currentId = id;
    setActiveTab(currentId);

    // 未保存の下書きがあればそれを優先（他施設へ移っても順番・追加を保持）
    if (DRAFTS[currentId]) {
        OVERVIEW = cloneOverview(DRAFTS[currentId]);
        if (!OVERVIEW.rows) OVERVIEW.rows = [];
        if (hasStaffEditor(currentId)) ensureStaff();
        else delete OVERVIEW.staff;
        renderRows();
        renderStaff();
        cmsSetStatus(currentId + ' の未保存の編集内容を表示しています。サーバー保存するまで他端末・再読込には反映されません。');
        return;
    }

    try {
        var res = await fetch('../' + facilityAssetDir(currentId) + '/overview.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        OVERVIEW = await res.json();
        if (!OVERVIEW.rows) OVERVIEW.rows = [];
        if (hasStaffEditor(currentId)) ensureStaff();
        else delete OVERVIEW.staff;
        renderRows();
        renderStaff();
        cmsSetStatus(currentId + ' の概要' + (hasStaffEditor(currentId) ? '・職員構成' : '') + 'を読み込みました。');
    } catch (e) {
        console.error(e);
        OVERVIEW = emptyOverview();
        if (!hasStaffEditor(currentId)) delete OVERVIEW.staff;
        renderRows();
        renderStaff();
        cmsSetStatus('データが無いため空の表を表示しています。入力後に保存してください。');
    }
}

document.getElementById('facilityTabs').addEventListener('click', async function(e) {
    var btn = e.target.closest('.admin-tab');
    if (!btn) return;
    var id = btn.getAttribute('data-facility');
    if (!id || id === currentId) return;
    collectForm();
    stashDraft(currentId);
    // 追加・並べ替えした項目名を、移動先を含む他施設の下書きにも揃える
    await propagateLabelsToOtherDrafts(currentId);
    loadFacility(id);
});

document.getElementById('rowList').addEventListener('click', function(e) {
    var removeRow = e.target.closest('[data-remove-row]');
    if (!removeRow) return;
    collectForm();
    var card = e.target.closest('.overview-row');
    var i = card ? Number(card.getAttribute('data-index')) : -1;
    if (i < 0) return;
    OVERVIEW.rows.splice(i, 1);
    renderRows();
});

document.getElementById('addRowBtn').addEventListener('click', function() {
    collectForm();
    OVERVIEW.rows.push(emptyRow());
    renderRows();
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    collectForm();
    // 福祉センターは職員構成を保存しない
    if (!hasStaffEditor(currentId) && OVERVIEW.staff) delete OVERVIEW.staff;
    var ok = await cmsSave({
        kind: 'overview',
        jsonPath: facilityAssetDir(currentId) + '/overview.json',
        payload: OVERVIEW
    });
    if (ok) clearDraft(currentId);
    // 才庭寮を保存したとき：他施設の概要項目を同じタイトル・同じ順に揃える（中身は各施設のまま）
    if (ok && currentId === 'sainiwa') {
        await syncOverviewLabelsFromSainiwa(OVERVIEW.rows || []);
    }
});

/* 才庭寮の項目名と順序を、他施設へ反映（value / mapUrl は既存を残す） */
async function syncOverviewLabelsFromSainiwa(masterRows) {
    var others = ['tomoyama', 'hanazono', 'fukushi_center'];
    var labels = labelsFromRows(masterRows);
    if (!labels.length) return;

    var synced = 0;
    for (var i = 0; i < others.length; i++) {
        var id = others[i];
        var data;
        try {
            var res = await fetch('../' + facilityAssetDir(id) + '/overview.json', { cache: 'no-store' });
            data = res.ok ? await res.json() : { rows: [] };
        } catch (e) {
            data = { rows: [] };
        }
        if (!data || typeof data !== 'object') data = { rows: [] };
        if (!Array.isArray(data.rows)) data.rows = [];

        var byLabel = {};
        data.rows.forEach(function(row) {
            var key = (row.label || '').trim();
            if (!key || byLabel[key]) return;
            byLabel[key] = {
                label: key,
                value: row.value == null ? '' : String(row.value),
                mapUrl: row.mapUrl == null ? '' : String(row.mapUrl)
            };
        });

        data.rows = alignRowsToLabels(labels, data.rows);

        var saved = await cmsSave({
            kind: 'overview',
            jsonPath: facilityAssetDir(id) + '/overview.json',
            payload: data
        });
        if (saved) {
            synced++;
            // 他施設の下書きも、揃えた項目順に更新（未保存編集の中身は可能な範囲で残す）
            if (DRAFTS[id]) {
                var draftByLabel = {};
                (DRAFTS[id].rows || []).forEach(function(row) {
                    var key = (row.label || '').trim();
                    if (key) draftByLabel[key] = row;
                });
                DRAFTS[id].rows = data.rows.map(function(row) {
                    var key = (row.label || '').trim();
                    if (key && draftByLabel[key]) {
                        return {
                            label: key,
                            value: draftByLabel[key].value == null ? '' : String(draftByLabel[key].value),
                            mapUrl: draftByLabel[key].mapUrl == null ? '' : String(draftByLabel[key].mapUrl)
                        };
                    }
                    return { label: row.label, value: row.value || '', mapUrl: row.mapUrl || '' };
                });
            }
        }
    }
    if (synced === others.length) {
        cmsSetStatus('才庭寮を保存し、他施設の概要項目名と順序も揃えました。');
    } else if (synced > 0) {
        cmsSetStatus('才庭寮を保存しました。他施設は ' + synced + ' 件まで項目を揃えました（一部失敗）。');
    }
}

cmsRememberPassword();
bindOverviewDrag();
loadFacility('sainiwa');
