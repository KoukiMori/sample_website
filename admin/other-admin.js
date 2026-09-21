/**
 * 入札・例規集・求人・施設取組の編集
 */
var PAGE = 'nyusatu';
var DATA = {};
var pendingByDir = {};
/* 求人・例規集の旧ファイル削除（保存時に save.php へ渡す） */
var pendingDeletePaths = [];
/* 入札：再描画後も開いていた年度を維持する（yearId をキー） */
var openNyusatuYears = {};
/* 例規：再描画後も開いていた編・章を維持する */
var openReikiFolds = {};

var CONFIG = {
    nyusatu: { path: '../data/nyusatu.json', jsonPath: 'data/nyusatu.json', kind: 'nyusatu' },
    reiki: { path: '../data/reiki.json', jsonPath: 'data/reiki.json', kind: 'reiki' },
    recruitment: { path: '../data/recruitment.json', jsonPath: 'data/recruitment.json', kind: 'recruitment' },
    torikumi: { path: '../data/shisetu_torikumi.json', jsonPath: 'data/shisetu_torikumi.json', kind: 'torikumi' }
};

function addPending(destDir, file, fileName) {
    if (!pendingByDir[destDir]) pendingByDir[destDir] = [];
    pendingByDir[destDir].push({ file: file, fileName: fileName });
}

/* 保存用のファイル名。save.php と同じ規則（・（）などサーバーで落ちやすい文字も置換） */
function safeUploadFileName(fileName) {
    var base = String(fileName || 'file').split(/[/\\]/).pop();
    if (base.normalize) base = base.normalize('NFC');
    var match = base.match(/\.([^.]+)$/);
    var ext = match ? match[1].toLowerCase() : '';
    if (ext === 'jpeg') ext = 'jpg';
    var stem = match ? base.slice(0, -match[0].length) : base;
    stem = stem.replace(/[\\/:*?"<>|#?&%・（）()【】「」『』［］｛｝\u3000]/g, '_');
    stem = stem.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    if (!stem) stem = 'file';
    return ext ? stem + '.' + ext : stem;
}

/* 管理画面の表示名用（拡張子なしの元ファイル名） */
function uploadDisplayLabel(fileName) {
    var base = String(fileName || '').split(/[/\\]/).pop();
    return base.replace(/\.[^.]+$/, '') || base;
}

/* ../assets/xxx/file → assets/xxx/file を削除予約 */
function queueDeleteStoredFile(href, folderPrefix) {
    if (!href || href === '#') return;
    var rel = String(href).replace(/^\.\.\//, '').replace(/^\/+/, '');
    if (rel.indexOf(folderPrefix) !== 0) return;
    if (pendingDeletePaths.indexOf(rel) === -1) pendingDeletePaths.push(rel);
}

function queueDeleteRecruitPath(href) {
    queueDeleteStoredFile(href, 'assets/recruitment/');
}

function queueDeleteReikiPath(href) {
    queueDeleteStoredFile(href, 'assets/reiki/');
}

function queueDeleteTorikumiPath(href) {
    queueDeleteStoredFile(href, 'assets/torikumi/');
}

/* 例規の項目を { title, href } に揃える（旧データは文字列のまま） */
function normalizeReikiItem(it) {
    if (typeof it === 'string') return { title: it, href: '' };
    return { title: (it && it.title) || '', href: (it && it.href) || '' };
}

function normalizeReikiData() {
    (DATA.sections || []).forEach(function(sec) {
        (sec.hens || []).forEach(function(hen) {
            (hen.chapters || []).forEach(function(ch) {
                ch.items = (ch.items || []).map(normalizeReikiItem);
            });
        });
        (sec.links || []).forEach(function(lk, i) {
            sec.links[i] = { label: (lk && lk.label) || '', href: (lk && lk.href) || '' };
        });
    });
}

/* 施設取組の項目を { label, href } に揃える（旧データは文字列のまま） */
function normalizeTorikumiItem(it) {
    if (typeof it === 'string') {
        var p = it.split('|');
        if (p.length > 1) return { label: p[0], href: p.slice(1).join('|') };
        return { label: it, href: '' };
    }
    return { label: (it && it.label) || '', href: (it && it.href) || '' };
}

function normalizeTorikumiData() {
    (DATA.sections || []).forEach(function(sec) {
        sec.items = (sec.items || []).map(normalizeTorikumiItem);
    });
}

/* 見出し削除時に紐づくPDFも削除予約する */
function queueDeleteTorikumiSection(sec) {
    ((sec && sec.items) || []).forEach(function(it) {
        if (it && it.href) queueDeleteTorikumiPath(it.href);
    });
}

function renderNyusatu() {
    var html = '';
    var base = (DATA.basePath || 'assets/nyusatu').replace(/\/$/, '');
    (DATA.years || []).forEach(function(year, yi) {
        var yearKey = year.yearId || ('idx-' + yi);
        // 初回は先頭年度だけ開く。以降はユーザーが開いた状態を維持
        var isOpen = openNyusatuYears.hasOwnProperty(yearKey)
            ? openNyusatuYears[yearKey]
            : (yi === 0);
        openNyusatuYears[yearKey] = isOpen;
        html += '<section class="howto nyusatu-year-admin' + (isOpen ? ' is-open' : '') + '" data-year-key="' + cmsEscape(yearKey) + '">';
        html += '<button type="button" class="nyusatu-year-toggle" data-toggle-year="' + cmsEscape(yearKey) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">';
        html += '<span class="nyusatu-year-toggle-title">' + cmsEscape(year.label || '年度') + '（' + cmsEscape(year.yearId || '') + '）</span>';
        html += '<span class="nyusatu-year-toggle-icon" aria-hidden="true">▼</span>';
        html += '</button>';
        html += '<div class="nyusatu-year-admin-body">';
        html += '<label>年度名<input data-y="' + yi + '" data-k="label" value="' + cmsEscape(year.label) + '"></label>';
        html += '<label>年度ID<input data-y="' + yi + '" data-k="yearId" value="' + cmsEscape(year.yearId) + '"></label>';
        (year.results || []).forEach(function(row, ri) {
            html += '<div class="photo-edit">';
            html += '<label>執行日<input data-y="' + yi + '" data-r="' + ri + '" data-k="dateLabel" value="' + cmsEscape(row.dateLabel) + '"></label>';
            html += '<label>Excelファイル名<input data-y="' + yi + '" data-r="' + ri + '" data-k="excel" value="' + cmsEscape(row.excel) + '"></label>';
            html += '<label>Excelを置く<input type="file" data-upload="excel" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-y="' + yi + '" data-r="' + ri + '"></label>';
            html += '<label>PDFファイル名<input data-y="' + yi + '" data-r="' + ri + '" data-k="pdf" value="' + cmsEscape(row.pdf) + '"></label>';
            html += '<label>PDFを置く<input type="file" data-upload="pdf" accept=".pdf,application/pdf" data-y="' + yi + '" data-r="' + ri + '"></label>';
            // PDF があるときだけ、公開ページと同じリンクをプレビュー表示
            if (row.pdf) {
                html += '<p class="nyusatu-admin-links">表示リンク：';
                html += '<a href="../' + cmsEscape(base) + '/' + cmsEscape(year.yearId) + '/pdf/' + cmsEscape(row.pdf) + '" target="_blank" rel="noopener">PDFファイル</a>';
                html += '</p>';
            }
            html += '<button type="button" class="btn btn-danger" data-del-result="' + yi + '-' + ri + '">この執行分を削除</button>';
            html += '</div>';
        });
        html += '<button type="button" class="btn" data-add-result="' + yi + '">執行分を追加</button>';
        html += '<button type="button" class="btn btn-danger" data-del-year="' + yi + '">この年度を削除</button>';
        html += '</div></section>';
    });
    html += '<button type="button" class="btn" id="addYearBtn">年度を追加</button>';
    document.getElementById('editor').innerHTML = html;
}

function isKaikeiRecruitCard(card) {
    return (card.title || '').indexOf('会計年度') !== -1;
}

function recruitCardHasFile(card) {
    return (card.files || []).some(function(f) {
        var href = (f.href || '').trim();
        return href && href !== '#';
    });
}

// チェックON＝募集なし。未設定ならファイルの有無で決める
function isRecruitNoRecruit(card) {
    if (typeof card.noRecruit === 'boolean') return card.noRecruit;
    return !recruitCardHasFile(card);
}

function recruitFileFieldsHtml(card, i) {
    var html = '<h3>詳細を見るに表示するファイル（直近1件のみ）</h3>';
    (card.files || []).forEach(function(file, fi) {
        html += '<div class="photo-edit">';
        html += '<label>表示名<input data-c="' + i + '" data-f="' + fi + '" data-k="fileLabel" value="' + cmsEscape(file.label) + '"></label>';
        html += '<label>ファイルを置く（PDF・JPG・PNG）<input type="file" data-upload="recruit-file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png" data-c="' + i + '" data-f="' + fi + '"></label>';
        if (file.href) html += '<p class="image-path-note">' + cmsEscape(file.href) + '</p>';
        html += '<button type="button" class="btn btn-danger" data-del-recruit-file="' + i + '-' + fi + '">このファイルを外す</button>';
        html += '</div>';
    });
    html += '<button type="button" class="btn" data-add-recruit-file="' + i + '">ファイルを追加</button>';
    html += '<p class="admin-header-note">新しいファイルを置くと、同じカードの旧ファイルは外して削除します。</p>';
    return html;
}

function defaultKaikeiSection() {
    return { title: '', body: '', items: [{ label: '', href: '' }] };
}

function renderRecruitment() {
    var html = '';
    (DATA.cards || []).forEach(function(card, i) {
        if (!card.files) card.files = [];
        if (!card.sections) card.sections = [];
        html += '<section class="howto"><h2>' + cmsEscape(card.title || ('カード ' + (i + 1))) + '</h2>';
        if (isKaikeiRecruitCard(card)) {
            var noRecruit = isRecruitNoRecruit(card);
            card.noRecruit = noRecruit;
            html += '<label class="recruit-norecruit-check">';
            html += '<input type="checkbox" data-c="' + i + '" data-k="noRecruit"' + (noRecruit ? ' checked' : '') + '>';
            html += '会計年度任用職員の募集はいたしておりません</label>';
            // チェックを外すと、リード文・タイトル・詳細の記入欄を出す
            if (!noRecruit) {
                html += '<div class="recruit-open-form">';
                html += '<label>リード文（公開ページのリンク文言）<textarea data-c="' + i + '" data-k="description" rows="3">' + cmsEscape(card.description) + '</textarea></label>';
                html += '<label>導入文<textarea data-c="' + i + '" data-k="intro" rows="3">' + cmsEscape(card.intro || '') + '</textarea></label>';
                html += '<h3>タイトルと詳細</h3>';
                card.sections.forEach(function(sec, si) {
                    if (!sec.items) sec.items = [];
                    html += '<div class="photo-edit">';
                    html += '<label>タイトル<input data-c="' + i + '" data-sec="' + si + '" data-k="secTitle" value="' + cmsEscape(sec.title) + '"></label>';
                    html += '<label>本文（任意）<textarea data-c="' + i + '" data-sec="' + si + '" data-k="secBody" rows="4">' + cmsEscape(sec.body || '') + '</textarea></label>';
                    sec.items.forEach(function(item, ii) {
                        html += '<div class="photo-edit">';
                        html += '<label>詳細名<input data-c="' + i + '" data-sec="' + si + '" data-it="' + ii + '" data-k="itemLabel" value="' + cmsEscape(item.label) + '"></label>';
                        html += '<label>ファイルを置く（PDF・JPG・PNG）<input type="file" data-upload="recruit-section" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png" data-c="' + i + '" data-sec="' + si + '" data-it="' + ii + '"></label>';
                        if (item.href) html += '<p class="image-path-note">' + cmsEscape(item.href) + '</p>';
                        html += '<button type="button" class="btn btn-danger" data-del-recruit-item="' + i + '-' + si + '-' + ii + '">この詳細を外す</button>';
                        html += '</div>';
                    });
                    html += '<button type="button" class="btn" data-add-recruit-item="' + i + '-' + si + '">詳細を追加</button>';
                    html += '<button type="button" class="btn btn-danger" data-del-recruit-sec="' + i + '-' + si + '">このタイトルを削除</button>';
                    html += '</div>';
                });
                html += '<button type="button" class="btn" data-add-recruit-sec="' + i + '">タイトルを追加</button>';
                html += '</div>';
            }
            html += '</section>';
            return;
        }
        html += '<label>タイトル<input data-c="' + i + '" data-k="title" value="' + cmsEscape(card.title) + '"></label>';
        html += '<label>リード文（太字は &lt;strong&gt;文字&lt;/strong&gt;）<textarea data-c="' + i + '" data-k="description" rows="3">' + cmsEscape(card.description) + '</textarea></label>';
        html += '<label>補足（1行に1つ）<textarea data-c="' + i + '" data-k="notes" rows="4">' + cmsEscape((card.notes || []).join('\n')) + '</textarea></label>';
        html += recruitFileFieldsHtml(card, i);
        html += '</section>';
    });
    document.getElementById('editor').innerHTML = html;
}

function renderTorikumi() {
    var html = '';
    var sections = DATA.sections || [];
    sections.forEach(function(sec, i) {
        html += '<section class="howto"><label>見出し<input data-s="' + i + '" data-k="title" value="' + cmsEscape(sec.title) + '"></label>';
        html += '<label>注記<input data-s="' + i + '" data-k="note" value="' + cmsEscape(sec.note) + '"></label>';
        var items = sec.items || [];
        html += '<div class="reiki-item-list">';
        items.forEach(function(it, ii) {
            // 例規・概要と同じく、左つまみでドラッグ並べ替え
            html += '<div class="photo-edit overview-row torikumi-item-row" data-s="' + i + '" data-it="' + ii + '">';
            html += '<div class="overview-drag-handle" draggable="true" title="ドラッグして順番を変更">⋮⋮</div>';
            html += '<div class="overview-row-fields">';
            html += '<label>表示名<input data-s="' + i + '" data-it="' + ii + '" data-k="itemLabel" value="' + cmsEscape(it.label) + '"></label>';
            // PDFのみ選択可。保存先は assets/torikumi
            html += '<label>ファイルを置く（PDFのみ）<input type="file" data-upload="torikumi" accept=".pdf,application/pdf" data-s="' + i + '" data-it="' + ii + '"></label>';
            if (it.href) {
                html += '<p class="image-path-note"><a href="' + cmsEscape(it.href) + '" target="_blank" rel="noopener">' + cmsEscape(it.href) + '</a></p>';
            }
            html += '<div class="reiki-item-actions">';
            html += '<button type="button" class="btn" data-move-torikumi-item="' + i + '-' + ii + '" data-dir="up"' + (ii === 0 ? ' disabled' : '') + '>上へ</button>';
            html += '<button type="button" class="btn" data-move-torikumi-item="' + i + '-' + ii + '" data-dir="down"' + (ii === items.length - 1 ? ' disabled' : '') + '>下へ</button>';
            html += '<button type="button" class="btn btn-danger" data-del-torikumi-item="' + i + '-' + ii + '">この項目を削除</button>';
            html += '</div></div></div>';
        });
        html += '</div>';
        html += '<div class="reiki-item-actions">';
        html += '<button type="button" class="btn" data-add-torikumi-item="' + i + '">項目を追加</button>';
        // 見出し自体の並び替え
        html += '<button type="button" class="btn" data-move-torikumi-sec="' + i + '" data-dir="up"' + (i === 0 ? ' disabled' : '') + '>見出しを上へ</button>';
        html += '<button type="button" class="btn" data-move-torikumi-sec="' + i + '" data-dir="down"' + (i === sections.length - 1 ? ' disabled' : '') + '>見出しを下へ</button>';
        html += '<button type="button" class="btn btn-danger" data-del-sec="' + i + '">この見出しを削除</button>';
        html += '</div></section>';
    });
    html += '<button type="button" class="btn" id="addSecBtn">見出しを追加</button>';
    document.getElementById('editor').innerHTML = html;
}

/* 開閉ブロックの開始。初回は指定したキーだけ開く */
function reikiFoldOpen(key, defaultOpen) {
    if (!openReikiFolds.hasOwnProperty(key)) openReikiFolds[key] = defaultOpen;
    return openReikiFolds[key];
}

function reikiFoldStart(key, title, extraClass, defaultOpen) {
    var isOpen = reikiFoldOpen(key, defaultOpen);
    var html = '<div class="nyusatu-year-admin reiki-fold' + (extraClass ? ' ' + extraClass : '') + (isOpen ? ' is-open' : '') + '" data-reiki-fold="' + cmsEscape(key) + '">';
    html += '<button type="button" class="nyusatu-year-toggle" data-toggle-reiki="' + cmsEscape(key) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">';
    html += '<span class="nyusatu-year-toggle-title">' + cmsEscape(title || '（無題）') + '</span>';
    html += '<span class="nyusatu-year-toggle-icon" aria-hidden="true">▼</span></button>';
    html += '<div class="nyusatu-year-admin-body">';
    return html;
}

function reikiFoldEnd() {
    return '</div></div>';
}

/* 例規の項目を配列内で移動する */
function moveReikiInList(arr, from, to) {
    from = Number(from);
    to = Number(to);
    if (!arr || from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return false;
    var moved = arr.splice(from, 1)[0];
    arr.splice(to, 0, moved);
    return true;
}

/* 左つまみのドラッグで、同じ章（または監査基準）の中だけ並べ替える */
var reikiDragFrom = null;

function bindReikiItemDrag() {
    var editor = document.getElementById('editor');
    if (!editor || editor.getAttribute('data-reiki-drag-bound') === '1') return;
    editor.setAttribute('data-reiki-drag-bound', '1');

    editor.addEventListener('dragstart', function(e) {
        if (PAGE !== 'reiki') return;
        var handle = e.target.closest('.overview-drag-handle');
        if (!handle) return;
        var card = handle.closest('.reiki-item-row');
        if (!card) return;
        reikiDragFrom = {
            si: Number(card.getAttribute('data-rs')),
            hi: card.getAttribute('data-h'),
            ci: card.getAttribute('data-c'),
            ii: Number(card.getAttribute('data-i')),
            li: card.getAttribute('data-l')
        };
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'reiki-item');
    });

    editor.addEventListener('dragend', function() {
        reikiDragFrom = null;
        editor.querySelectorAll('.reiki-item-row').forEach(function(el) {
            el.classList.remove('is-dragging', 'is-drop-target');
        });
    });

    editor.addEventListener('dragover', function(e) {
        if (PAGE !== 'reiki' || !reikiDragFrom) return;
        var card = e.target.closest('.reiki-item-row');
        if (!card || !sameReikiDropGroup(card, reikiDragFrom)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        editor.querySelectorAll('.reiki-item-row').forEach(function(el) {
            el.classList.toggle('is-drop-target', el === card);
        });
    });

    editor.addEventListener('drop', function(e) {
        if (PAGE !== 'reiki' || !reikiDragFrom) return;
        var card = e.target.closest('.reiki-item-row');
        if (!card || !sameReikiDropGroup(card, reikiDragFrom)) return;
        e.preventDefault();
        var from = reikiDragFrom;
        reikiDragFrom = null;
        var changed = false;
        if (from.li !== null && from.li !== undefined && from.li !== '') {
            var toLi = Number(card.getAttribute('data-l'));
            changed = moveReikiInList(DATA.sections[from.si].links, from.li, toLi);
        } else {
            var toIi = Number(card.getAttribute('data-i'));
            var items = DATA.sections[from.si].hens[Number(from.hi)].chapters[Number(from.ci)].items;
            changed = moveReikiInList(items, from.ii, toIi);
        }
        if (changed) {
            renderPreserveScroll();
            cmsSetStatus('順番を変更しました。保存するまでサーバーには反映されません。');
        }
    });
}

function sameReikiDropGroup(card, from) {
    if (Number(card.getAttribute('data-rs')) !== from.si) return false;
    var isLink = from.li !== null && from.li !== undefined && from.li !== '';
    var cardIsLink = card.hasAttribute('data-l') && !card.hasAttribute('data-i');
    if (isLink) return cardIsLink;
    if (cardIsLink) return false;
    return card.getAttribute('data-h') === from.hi && card.getAttribute('data-c') === from.ci;
}

/* 施設取組：同じ見出し内の項目だけドラッグ並べ替え */
var torikumiDragFrom = null;

function bindTorikumiItemDrag() {
    var editor = document.getElementById('editor');
    if (!editor || editor.getAttribute('data-torikumi-drag-bound') === '1') return;
    editor.setAttribute('data-torikumi-drag-bound', '1');

    editor.addEventListener('dragstart', function(e) {
        if (PAGE !== 'torikumi') return;
        var handle = e.target.closest('.overview-drag-handle');
        if (!handle) return;
        var card = handle.closest('.torikumi-item-row');
        if (!card) return;
        torikumiDragFrom = {
            s: Number(card.getAttribute('data-s')),
            it: Number(card.getAttribute('data-it'))
        };
        card.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'torikumi-item');
    });

    editor.addEventListener('dragend', function() {
        torikumiDragFrom = null;
        editor.querySelectorAll('.torikumi-item-row').forEach(function(el) {
            el.classList.remove('is-dragging', 'is-drop-target');
        });
    });

    editor.addEventListener('dragover', function(e) {
        if (PAGE !== 'torikumi' || !torikumiDragFrom) return;
        var card = e.target.closest('.torikumi-item-row');
        // 同じ見出し内だけドロップ可
        if (!card || Number(card.getAttribute('data-s')) !== torikumiDragFrom.s) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        editor.querySelectorAll('.torikumi-item-row').forEach(function(el) {
            el.classList.toggle('is-drop-target', el === card);
        });
    });

    editor.addEventListener('drop', function(e) {
        if (PAGE !== 'torikumi' || !torikumiDragFrom) return;
        var card = e.target.closest('.torikumi-item-row');
        if (!card || Number(card.getAttribute('data-s')) !== torikumiDragFrom.s) return;
        e.preventDefault();
        var from = torikumiDragFrom;
        torikumiDragFrom = null;
        var toIt = Number(card.getAttribute('data-it'));
        var items = DATA.sections[from.s].items || [];
        if (moveReikiInList(items, from.it, toIt)) {
            renderPreserveScroll();
            cmsSetStatus('順番を変更しました。保存するまでサーバーには反映されません。');
        }
    });
}

/* 削除する章・編に付いているファイルも削除予約する */
function queueDeleteReikiChapter(ch) {
    ((ch && ch.items) || []).forEach(function(it) {
        if (it && it.href) queueDeleteReikiPath(it.href);
    });
}

function queueDeleteReikiHen(hen) {
    ((hen && hen.chapters) || []).forEach(queueDeleteReikiChapter);
}

function newReikiItem() {
    return { title: '', href: '' };
}

function newReikiChapter() {
    return { title: '新しい章', items: [newReikiItem()] };
}

function newReikiHen() {
    return { title: '新しい編', chapters: [newReikiChapter()] };
}

// 例規集の新しいセクション（編・章つき）
function newReikiSection() {
    return {
        title: '新しいセクション',
        subtitle: '',
        hens: [newReikiHen()]
    };
}

function queueDeleteReikiSection(sec) {
    if (!sec) return;
    (sec.hens || []).forEach(queueDeleteReikiHen);
    (sec.links || []).forEach(function(lk) {
        if (lk && lk.href) queueDeleteReikiPath(lk.href);
    });
}

function renderReiki() {
    var html = '<p>見出しをクリックすると編・章を開閉できます。「セクションを追加」「編を追加」「章を追加」「項目を追加」で増やせます。項目は左のつまみをドラッグするか「上へ」「下へ」で同じ章の中を並べ替えます。ファイルの保存先は <code>assets/reiki</code> です。</p>';
    (DATA.sections || []).forEach(function(sec, si) {
        html += '<section class="howto nyusatu-year-admin reiki-fold' + (reikiFoldOpen('sec-' + si, si === 0) ? ' is-open' : '') + '" data-reiki-fold="sec-' + si + '">';
        html += '<button type="button" class="nyusatu-year-toggle" data-toggle-reiki="sec-' + si + '" aria-expanded="' + (openReikiFolds['sec-' + si] ? 'true' : 'false') + '">';
        html += '<span class="nyusatu-year-toggle-title">' + cmsEscape(sec.title || 'セクション') + '</span>';
        html += '<span class="nyusatu-year-toggle-icon" aria-hidden="true">▼</span></button>';
        html += '<div class="nyusatu-year-admin-body">';
        html += '<label>セクション名<input data-rs="' + si + '" data-k="title" value="' + cmsEscape(sec.title) + '"></label>';
        if (sec.hens) {
            sec.hens.forEach(function(hen, hi) {
                html += reikiFoldStart('hen-' + si + '-' + hi, hen.title || '編', 'reiki-fold-nested', si === 0 && hi === 0);
                html += '<label>編の名前<input data-rs="' + si + '" data-h="' + hi + '" data-k="henTitle" value="' + cmsEscape(hen.title) + '"></label>';
                (hen.chapters || []).forEach(function(ch, ci) {
                    var items = ch.items || [];
                    html += reikiFoldStart('ch-' + si + '-' + hi + '-' + ci, ch.title || '項目', 'reiki-fold-nested', si === 0 && hi === 0 && ci === 0);
                    html += '<label>章の名前<input data-rs="' + si + '" data-h="' + hi + '" data-c="' + ci + '" data-k="chTitle" value="' + cmsEscape(ch.title) + '"></label>';
                    html += '<div class="reiki-item-list">';
                    items.forEach(function(item, ii) {
                        html += '<div class="photo-edit overview-row reiki-item-row" data-rs="' + si + '" data-h="' + hi + '" data-c="' + ci + '" data-i="' + ii + '">';
                        html += '<div class="overview-drag-handle" draggable="true" title="ドラッグして順番を変更">⋮⋮</div>';
                        html += '<div class="overview-row-fields">';
                        html += '<label>項目名<input data-rs="' + si + '" data-h="' + hi + '" data-c="' + ci + '" data-i="' + ii + '" data-k="itemTitle" value="' + cmsEscape(item.title) + '"></label>';
                        html += '<label>ファイルを置く（PDFなど）<input type="file" data-upload="reiki-item" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png" data-rs="' + si + '" data-h="' + hi + '" data-c="' + ci + '" data-i="' + ii + '"></label>';
                        if (item.href) {
                            html += '<p class="image-path-note"><a href="' + cmsEscape(item.href) + '" target="_blank" rel="noopener">' + cmsEscape(item.href) + '</a></p>';
                        }
                        html += '<div class="reiki-item-actions">';
                        html += '<button type="button" class="btn" data-move-reiki-item="' + si + '-' + hi + '-' + ci + '-' + ii + '" data-dir="up"' + (ii === 0 ? ' disabled' : '') + '>上へ</button>';
                        html += '<button type="button" class="btn" data-move-reiki-item="' + si + '-' + hi + '-' + ci + '-' + ii + '" data-dir="down"' + (ii === items.length - 1 ? ' disabled' : '') + '>下へ</button>';
                        html += '<button type="button" class="btn btn-danger" data-del-reiki-item="' + si + '-' + hi + '-' + ci + '-' + ii + '">この項目を削除</button>';
                        html += '</div></div></div>';
                    });
                    html += '</div>';
                    html += '<div class="reiki-item-actions">';
                    html += '<button type="button" class="btn" data-add-reiki-item="' + si + '-' + hi + '-' + ci + '">項目を追加</button>';
                    html += '<button type="button" class="btn btn-danger" data-del-reiki-ch="' + si + '-' + hi + '-' + ci + '">この章を削除</button>';
                    html += '</div>';
                    html += reikiFoldEnd();
                });
                html += '<div class="reiki-item-actions">';
                html += '<button type="button" class="btn" data-add-reiki-ch="' + si + '-' + hi + '">章を追加</button>';
                html += '<button type="button" class="btn btn-danger" data-del-reiki-hen="' + si + '-' + hi + '">この編を削除</button>';
                html += '</div>';
                html += reikiFoldEnd();
            });
            html += '<button type="button" class="btn" data-add-reiki-hen="' + si + '">編を追加</button>';
        } else {
            html += '<label>注記<textarea data-rs="' + si + '" data-k="note" rows="2">' + cmsEscape(sec.note) + '</textarea></label>';
            var links = sec.links || [];
            html += '<div class="reiki-item-list">';
            links.forEach(function(lk, li) {
                html += '<div class="photo-edit overview-row reiki-item-row" data-rs="' + si + '" data-l="' + li + '">';
                html += '<div class="overview-drag-handle" draggable="true" title="ドラッグして順番を変更">⋮⋮</div>';
                html += '<div class="overview-row-fields">';
                html += '<label>表示名<input data-rs="' + si + '" data-l="' + li + '" data-k="linkLabel" value="' + cmsEscape(lk.label) + '"></label>';
                html += '<label>ファイルを置く（PDFなど）<input type="file" data-upload="reiki-link" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png" data-rs="' + si + '" data-l="' + li + '"></label>';
                if (lk.href) {
                    html += '<p class="image-path-note"><a href="' + cmsEscape(lk.href) + '" target="_blank" rel="noopener">' + cmsEscape(lk.href) + '</a></p>';
                }
                html += '<div class="reiki-item-actions">';
                html += '<button type="button" class="btn" data-move-reiki-link="' + si + '-' + li + '" data-dir="up"' + (li === 0 ? ' disabled' : '') + '>上へ</button>';
                html += '<button type="button" class="btn" data-move-reiki-link="' + si + '-' + li + '" data-dir="down"' + (li === links.length - 1 ? ' disabled' : '') + '>下へ</button>';
                html += '<button type="button" class="btn btn-danger" data-del-reiki-link="' + si + '-' + li + '">このリンクを削除</button>';
                html += '</div></div></div>';
            });
            html += '</div>';
            html += '<button type="button" class="btn" data-add-reiki-link="' + si + '">リンクを追加</button>';
        }
        html += '<button type="button" class="btn btn-danger" data-del-reiki-sec="' + si + '">このセクションを削除</button>';
        html += '</div></section>';
    });
    html += '<button type="button" class="btn" id="addReikiSecBtn">セクションを追加</button>';
    document.getElementById('editor').innerHTML = html;
}

/* 開閉ボタンの見出しを、入力中の名前に合わせる */
function refreshReikiToggleTitle(key, title) {
    var wrap = document.querySelector('[data-reiki-fold="' + key + '"]');
    if (!wrap) return;
    var btn = wrap.querySelector('.nyusatu-year-toggle');
    var el = btn && btn.querySelector('.nyusatu-year-toggle-title');
    if (el) el.textContent = title || '（無題）';
}

function collectNyusatu(e) {
    var t = e && e.target;
    if (!t || !t.getAttribute) return;
    var yi = t.getAttribute('data-y');
    var ri = t.getAttribute('data-r');
    var k = t.getAttribute('data-k');
    if (yi === null || !k) return;
    yi = Number(yi);
    if (ri === null) {
        var year = DATA.years[yi];
        var oldYearId = year.yearId;
        year[k] = t.value;
        // 年度名・年度IDを変えたら、開閉見出しのタイトルもすぐ反映
        if (k === 'label' || k === 'yearId') {
            refreshNyusatuYearTitle(yi, oldYearId);
        }
    } else {
        DATA.years[yi].results[Number(ri)][k] = t.value;
    }
}

/* 年度見出し（開閉ボタン）の表示を入力内容に合わせる */
function refreshNyusatuYearTitle(yi, oldYearId) {
    var year = DATA.years[yi];
    if (!year) return;
    var section = document.querySelectorAll('.nyusatu-year-admin')[yi];
    if (!section) return;
    var newKey = year.yearId || ('idx-' + yi);
    var oldKey = section.getAttribute('data-year-key') || oldYearId || ('idx-' + yi);
    // 開閉状態のキーを年度ID変更に追従させる
    if (oldKey !== newKey) {
        if (openNyusatuYears.hasOwnProperty(oldKey)) {
            openNyusatuYears[newKey] = openNyusatuYears[oldKey];
            delete openNyusatuYears[oldKey];
        }
        section.setAttribute('data-year-key', newKey);
        var toggle = section.querySelector('[data-toggle-year]');
        if (toggle) toggle.setAttribute('data-toggle-year', newKey);
        // 未保存のアップロード先も新しい年度IDへ付け替え
        migrateNyusatuPendingDir(oldKey, newKey);
    }
    var titleEl = section.querySelector('.nyusatu-year-toggle-title');
    if (titleEl) {
        titleEl.textContent = (year.label || '年度') + '（' + (year.yearId || '') + '）';
    }
    // 表示リンクのパスも新しい年度IDに合わせる
    (year.results || []).forEach(function(row, ri) {
        refreshNyusatuLinks(yi, ri);
    });
}

/* 年度ID変更時：保留中のファイル保存先ディレクトリを付け替える */
function migrateNyusatuPendingDir(oldYearId, newYearId) {
    if (!oldYearId || !newYearId || oldYearId === newYearId) return;
    ['excel', 'pdf'].forEach(function(kind) {
        var from = 'assets/nyusatu/' + oldYearId + '/' + kind;
        var to = 'assets/nyusatu/' + newYearId + '/' + kind;
        if (!pendingByDir[from]) return;
        pendingByDir[to] = (pendingByDir[to] || []).concat(pendingByDir[from]);
        delete pendingByDir[from];
    });
}

/* PDF のファイル名が変わったら、表示リンクのプレビューだけ差し替える */
function refreshNyusatuLinks(yi, ri) {
    var card = document.querySelector(
        '.photo-edit input[data-y="' + yi + '"][data-r="' + ri + '"][data-k="pdf"]'
    );
    if (!card) return;
    card = card.closest('.photo-edit');
    if (!card) return;
    var row = DATA.years[yi].results[ri];
    var year = DATA.years[yi];
    var base = (DATA.basePath || 'assets/nyusatu').replace(/\/$/, '');
    var old = card.querySelector('.nyusatu-admin-links');
    if (old) old.remove();
    if (!row.pdf) return;
    var p = document.createElement('p');
    p.className = 'nyusatu-admin-links';
    p.appendChild(document.createTextNode('表示リンク：'));
    var b = document.createElement('a');
    b.href = '../' + base + '/' + year.yearId + '/pdf/' + row.pdf;
    b.target = '_blank';
    b.rel = 'noopener';
    b.textContent = 'PDFファイル';
    p.appendChild(b);
    var delBtn = card.querySelector('[data-del-result]');
    if (delBtn) card.insertBefore(p, delBtn);
    else card.appendChild(p);
}

function render() {
    if (PAGE === 'nyusatu') renderNyusatu();
    else if (PAGE === 'recruitment') renderRecruitment();
    else if (PAGE === 'torikumi') renderTorikumi();
    else renderReiki();
}

/* 並べ替えなどで再描画しても、今見ている位置を保つ */
function renderPreserveScroll() {
    var y = window.scrollY;
    render();
    window.scrollTo(0, y);
}

async function loadPage() {
    PAGE = document.getElementById('pageSelect').value;
    pendingByDir = {};
    if (PAGE === 'nyusatu') openNyusatuYears = {};
    if (PAGE === 'reiki') openReikiFolds = {};
    var cfg = CONFIG[PAGE];
    var res = await fetch(cfg.path, { cache: 'no-store' });
    DATA = await res.json();
    if (PAGE === 'reiki') normalizeReikiData();
    if (PAGE === 'torikumi') normalizeTorikumiData();
    render();
    cmsSetStatus('読み込みました。');
}

document.getElementById('pageSelect').addEventListener('change', loadPage);

document.getElementById('editor').addEventListener('input', function(e) {
    var t = e.target;
    if (PAGE === 'nyusatu') {
        collectNyusatu(e);
        // ファイル名入力中も、公開ページと同じリンク表示をすぐ反映
        var k = t.getAttribute && t.getAttribute('data-k');
        if (k === 'excel' || k === 'pdf') {
            var yi = Number(t.getAttribute('data-y'));
            var ri = Number(t.getAttribute('data-r'));
            refreshNyusatuLinks(yi, ri);
        }
        return;
    }
    if (PAGE === 'recruitment') {
        var c = t.getAttribute('data-c');
        if (c === null) return;
        c = Number(c);
        var g = t.getAttribute('data-g');
        var l = t.getAttribute('data-l');
        var k = t.getAttribute('data-k');
        if (!k || k === 'noRecruit') return;
        var fi = t.getAttribute('data-f');
        if (fi !== null && k === 'fileLabel') {
            if (!DATA.cards[c].files) DATA.cards[c].files = [];
            DATA.cards[c].files[Number(fi)].label = t.value;
            return;
        }
        var sec = t.getAttribute('data-sec');
        if (sec !== null) {
            if (!DATA.cards[c].sections) DATA.cards[c].sections = [];
            var s = Number(sec);
            var it = t.getAttribute('data-it');
            if (it !== null) {
                DATA.cards[c].sections[s].items[Number(it)].label = t.value;
            } else if (k === 'secTitle') {
                DATA.cards[c].sections[s].title = t.value;
            } else if (k === 'secBody') {
                DATA.cards[c].sections[s].body = t.value;
            }
            return;
        }
        if (g === null) {
            if (k === 'notes') DATA.cards[c].notes = t.value.split('\n').filter(Boolean);
            else DATA.cards[c][k] = t.value;
        } else if (l !== null) {
            DATA.cards[c].groups[Number(g)].links[Number(l)][k] = t.value;
        }
        return;
    }
    if (PAGE === 'torikumi') {
        var s = t.getAttribute('data-s');
        var k = t.getAttribute('data-k');
        if (s === null) return;
        s = Number(s);
        // 項目ごとの表示名を個別入力
        if (k === 'itemLabel') {
            var it = t.getAttribute('data-it');
            if (it !== null) DATA.sections[s].items[Number(it)].label = t.value;
        } else DATA.sections[s][k] = t.value;
        return;
    }
    var rs = t.getAttribute('data-rs');
    if (rs === null) return;
    rs = Number(rs);
    var k = t.getAttribute('data-k');
    var h = t.getAttribute('data-h');
    var c = t.getAttribute('data-c');
    if (k === 'title') {
        DATA.sections[rs].title = t.value;
        refreshReikiToggleTitle('sec-' + rs, t.value);
    } else if (k === 'note') DATA.sections[rs].note = t.value;
    else if (k === 'linkLabel') {
        var li = t.getAttribute('data-l');
        if (li !== null) DATA.sections[rs].links[Number(li)].label = t.value;
    } else if (k === 'henTitle') {
        DATA.sections[rs].hens[Number(h)].title = t.value;
        refreshReikiToggleTitle('hen-' + rs + '-' + h, t.value);
    } else if (k === 'chTitle') {
        DATA.sections[rs].hens[Number(h)].chapters[Number(c)].title = t.value;
        refreshReikiToggleTitle('ch-' + rs + '-' + h + '-' + c, t.value);
    } else if (k === 'itemTitle') {
        var ii = t.getAttribute('data-i');
        if (h !== null && c !== null && ii !== null) {
            DATA.sections[rs].hens[Number(h)].chapters[Number(c)].items[Number(ii)].title = t.value;
        }
    }
});

document.getElementById('editor').addEventListener('click', function(e) {
    // 年度ヘッダークリックで開閉（再描画せずクラスだけ切替）
    var toggleYear = e.target.closest('[data-toggle-year]');
    if (toggleYear) {
        var key = toggleYear.getAttribute('data-toggle-year');
        var section = toggleYear.closest('.nyusatu-year-admin');
        if (!section) return;
        var nowOpen = !section.classList.contains('is-open');
        section.classList.toggle('is-open', nowOpen);
        toggleYear.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
        openNyusatuYears[key] = nowOpen;
        return;
    }
    // 例規：セクション・編・章の開閉（再描画せずクラスだけ切替）
    var toggleReiki = e.target.closest('[data-toggle-reiki]');
    if (toggleReiki) {
        var rkey = toggleReiki.getAttribute('data-toggle-reiki');
        var fold = toggleReiki.closest('[data-reiki-fold]');
        if (!fold) return;
        var nowOpenR = !fold.classList.contains('is-open');
        fold.classList.toggle('is-open', nowOpenR);
        toggleReiki.setAttribute('aria-expanded', nowOpenR ? 'true' : 'false');
        openReikiFolds[rkey] = nowOpenR;
        return;
    }
    var addY = e.target.closest('#addYearBtn');
    var addR = e.target.closest('[data-add-result]');
    var delR = e.target.closest('[data-del-result]');
    var delY = e.target.closest('[data-del-year]');
    var addS = e.target.closest('#addSecBtn');
    var delS = e.target.closest('[data-del-sec]');
    var addRf = e.target.closest('[data-add-recruit-file]');
    var delRf = e.target.closest('[data-del-recruit-file]');
    var addRsec = e.target.closest('[data-add-recruit-sec]');
    var delRsec = e.target.closest('[data-del-recruit-sec]');
    var addRitem = e.target.closest('[data-add-recruit-item]');
    var delRitem = e.target.closest('[data-del-recruit-item]');
    var addRi = e.target.closest('[data-add-reiki-item]');
    var delRi = e.target.closest('[data-del-reiki-item]');
    var addRl = e.target.closest('[data-add-reiki-link]');
    var delRl = e.target.closest('[data-del-reiki-link]');
    var addRh = e.target.closest('[data-add-reiki-hen]');
    var delRh = e.target.closest('[data-del-reiki-hen]');
    var addRc = e.target.closest('[data-add-reiki-ch]');
    var delRc = e.target.closest('[data-del-reiki-ch]');
    var addReikiSec = e.target.closest('#addReikiSecBtn');
    var delReikiSec = e.target.closest('[data-del-reiki-sec]');
    var moveRi = e.target.closest('[data-move-reiki-item]');
    var moveRl = e.target.closest('[data-move-reiki-link]');
    var addTi = e.target.closest('[data-add-torikumi-item]');
    var delTi = e.target.closest('[data-del-torikumi-item]');
    var moveTi = e.target.closest('[data-move-torikumi-item]');
    var moveTs = e.target.closest('[data-move-torikumi-sec]');
    if (addY) {
        DATA.years = DATA.years || [];
        var newId = 'r' + (DATA.years.length + 1);
        DATA.years.push({ yearId: newId, label: '令和○年度', results: [] });
        openNyusatuYears[newId] = true;
        render();
    }
    if (addR) {
        var yi = Number(addR.getAttribute('data-add-result'));
        DATA.years[yi].results.push({ dateLabel: '', dateId: '', excel: '', pdf: '' });
        render();
    }
    if (delR) {
        var parts = delR.getAttribute('data-del-result').split('-');
        DATA.years[Number(parts[0])].results.splice(Number(parts[1]), 1);
        render();
    }
    if (delY) {
        var delYi = Number(delY.getAttribute('data-del-year'));
        var delYear = DATA.years[delYi];
        if (delYear && delYear.yearId) delete openNyusatuYears[delYear.yearId];
        DATA.years.splice(delYi, 1);
        render();
    }
    if (addS) {
        DATA.sections = DATA.sections || [];
        DATA.sections.push({ title: '新しい見出し', note: '', items: [] });
        render();
    }
    if (delS) {
        var delSi = Number(delS.getAttribute('data-del-sec'));
        // 紐づくPDFも保存時に削除する
        if (PAGE === 'torikumi') queueDeleteTorikumiSection(DATA.sections[delSi]);
        DATA.sections.splice(delSi, 1);
        render();
    }
    if (addTi) {
        var si = Number(addTi.getAttribute('data-add-torikumi-item'));
        if (!DATA.sections[si].items) DATA.sections[si].items = [];
        DATA.sections[si].items.push({ label: '', href: '' });
        render();
    }
    if (delTi) {
        var p = delTi.getAttribute('data-del-torikumi-item').split('-');
        var sec = DATA.sections[Number(p[0])];
        var removed = sec.items.splice(Number(p[1]), 1)[0];
        if (removed && removed.href) queueDeleteTorikumiPath(removed.href);
        render();
    }
    // 項目を上へ・下へ移動（公開ページの並び順）
    if (moveTi) {
        var p = moveTi.getAttribute('data-move-torikumi-item').split('-');
        var s = Number(p[0]);
        var i = Number(p[1]);
        var items = DATA.sections[s].items || [];
        var dir = moveTi.getAttribute('data-dir');
        if (dir === 'up' && i > 0) moveReikiInList(items, i, i - 1);
        if (dir === 'down' && i < items.length - 1) moveReikiInList(items, i, i + 1);
        render();
    }
    // 見出しを上へ・下へ移動
    if (moveTs) {
        var s = Number(moveTs.getAttribute('data-move-torikumi-sec'));
        var dir = moveTs.getAttribute('data-dir');
        var secs = DATA.sections || [];
        if (dir === 'up' && s > 0) moveReikiInList(secs, s, s - 1);
        if (dir === 'down' && s < secs.length - 1) moveReikiInList(secs, s, s + 1);
        render();
    }
    if (addRf) {
        var ci = Number(addRf.getAttribute('data-add-recruit-file'));
        if (!DATA.cards[ci].files) DATA.cards[ci].files = [];
        DATA.cards[ci].files.push({ label: '', href: '' });
        render();
    }
    if (delRf) {
        var parts = delRf.getAttribute('data-del-recruit-file').split('-');
        var delCard = DATA.cards[Number(parts[0])];
        var delFile = delCard.files[Number(parts[1])];
        if (delFile && delFile.href) queueDeleteRecruitPath(delFile.href);
        delCard.files.splice(Number(parts[1]), 1);
        render();
    }
    if (addRsec) {
        var ci = Number(addRsec.getAttribute('data-add-recruit-sec'));
        if (!DATA.cards[ci].sections) DATA.cards[ci].sections = [];
        DATA.cards[ci].sections.push(defaultKaikeiSection());
        renderPreserveScroll();
    }
    if (delRsec) {
        var parts = delRsec.getAttribute('data-del-recruit-sec').split('-');
        var delCard = DATA.cards[Number(parts[0])];
        var delSec = delCard.sections[Number(parts[1])];
        (delSec.items || []).forEach(function(it) {
            if (it.href) queueDeleteRecruitPath(it.href);
        });
        delCard.sections.splice(Number(parts[1]), 1);
        renderPreserveScroll();
    }
    if (addRitem) {
        var parts = addRitem.getAttribute('data-add-recruit-item').split('-');
        var sec = DATA.cards[Number(parts[0])].sections[Number(parts[1])];
        if (!sec.items) sec.items = [];
        sec.items.push({ label: '', href: '' });
        renderPreserveScroll();
    }
    if (delRitem) {
        var parts = delRitem.getAttribute('data-del-recruit-item').split('-');
        var items = DATA.cards[Number(parts[0])].sections[Number(parts[1])].items;
        var removed = items[Number(parts[2])];
        if (removed && removed.href) queueDeleteRecruitPath(removed.href);
        items.splice(Number(parts[2]), 1);
        renderPreserveScroll();
    }
    if (moveRi) {
        var p = moveRi.getAttribute('data-move-reiki-item').split('-');
        var items = DATA.sections[Number(p[0])].hens[Number(p[1])].chapters[Number(p[2])].items;
        var i = Number(p[3]);
        var dir = moveRi.getAttribute('data-dir');
        if (dir === 'up' && i > 0) moveReikiInList(items, i, i - 1);
        if (dir === 'down' && i < items.length - 1) moveReikiInList(items, i, i + 1);
        renderPreserveScroll();
    }
    if (moveRl) {
        var p = moveRl.getAttribute('data-move-reiki-link').split('-');
        var links = DATA.sections[Number(p[0])].links;
        var i = Number(p[1]);
        var dir = moveRl.getAttribute('data-dir');
        if (dir === 'up' && i > 0) moveReikiInList(links, i, i - 1);
        if (dir === 'down' && i < links.length - 1) moveReikiInList(links, i, i + 1);
        renderPreserveScroll();
    }
    if (addRi) {
        var p = addRi.getAttribute('data-add-reiki-item').split('-');
        DATA.sections[Number(p[0])].hens[Number(p[1])].chapters[Number(p[2])].items.push(newReikiItem());
        openReikiFolds['sec-' + p[0]] = true;
        openReikiFolds['hen-' + p[0] + '-' + p[1]] = true;
        openReikiFolds['ch-' + p[0] + '-' + p[1] + '-' + p[2]] = true;
        renderPreserveScroll();
    }
    if (addRc) {
        var p = addRc.getAttribute('data-add-reiki-ch').split('-');
        var si = Number(p[0]);
        var hi = Number(p[1]);
        var hen = DATA.sections[si].hens[hi];
        if (!hen.chapters) hen.chapters = [];
        hen.chapters.push(newReikiChapter());
        var ci = hen.chapters.length - 1;
        openReikiFolds['sec-' + si] = true;
        openReikiFolds['hen-' + si + '-' + hi] = true;
        openReikiFolds['ch-' + si + '-' + hi + '-' + ci] = true;
        renderPreserveScroll();
    }
    if (addRh) {
        var si = Number(addRh.getAttribute('data-add-reiki-hen'));
        var sec = DATA.sections[si];
        if (!sec.hens) sec.hens = [];
        sec.hens.push(newReikiHen());
        var hi = sec.hens.length - 1;
        openReikiFolds['sec-' + si] = true;
        openReikiFolds['hen-' + si + '-' + hi] = true;
        openReikiFolds['ch-' + si + '-' + hi + '-0'] = true;
        renderPreserveScroll();
    }
    if (addReikiSec) {
        DATA.sections = DATA.sections || [];
        DATA.sections.push(newReikiSection());
        var newSi = DATA.sections.length - 1;
        openReikiFolds['sec-' + newSi] = true;
        openReikiFolds['hen-' + newSi + '-0'] = true;
        openReikiFolds['ch-' + newSi + '-0-0'] = true;
        renderPreserveScroll();
        cmsSetStatus('セクションを追加しました。保存するまでサーバーには反映されません。');
    }
    if (delReikiSec) {
        var delSi = Number(delReikiSec.getAttribute('data-del-reiki-sec'));
        var removedSec = DATA.sections[delSi];
        queueDeleteReikiSection(removedSec);
        DATA.sections.splice(delSi, 1);
        openReikiFolds = {};
        renderPreserveScroll();
        cmsSetStatus('セクションを削除しました。保存するまでサーバーには反映されません。');
    }
    if (delRc) {
        var p = delRc.getAttribute('data-del-reiki-ch').split('-');
        var chapters = DATA.sections[Number(p[0])].hens[Number(p[1])].chapters;
        queueDeleteReikiChapter(chapters[Number(p[2])]);
        chapters.splice(Number(p[2]), 1);
        renderPreserveScroll();
    }
    if (delRh) {
        var p = delRh.getAttribute('data-del-reiki-hen').split('-');
        var hens = DATA.sections[Number(p[0])].hens;
        queueDeleteReikiHen(hens[Number(p[1])]);
        hens.splice(Number(p[1]), 1);
        renderPreserveScroll();
    }
    if (delRi) {
        var p = delRi.getAttribute('data-del-reiki-item').split('-');
        var items = DATA.sections[Number(p[0])].hens[Number(p[1])].chapters[Number(p[2])].items;
        var removed = items[Number(p[3])];
        if (removed && removed.href) queueDeleteReikiPath(removed.href);
        items.splice(Number(p[3]), 1);
        renderPreserveScroll();
    }
    if (addRl) {
        var s = Number(addRl.getAttribute('data-add-reiki-link'));
        if (!DATA.sections[s].links) DATA.sections[s].links = [];
        DATA.sections[s].links.push({ label: '', href: '' });
        renderPreserveScroll();
    }
    if (delRl) {
        var p = delRl.getAttribute('data-del-reiki-link').split('-');
        var links = DATA.sections[Number(p[0])].links;
        var removed = links[Number(p[1])];
        if (removed && removed.href) queueDeleteReikiPath(removed.href);
        links.splice(Number(p[1]), 1);
        renderPreserveScroll();
    }
});

document.getElementById('editor').addEventListener('change', function(e) {
    var noRecruitBox = e.target.closest('input[data-k="noRecruit"]');
    if (noRecruitBox && PAGE === 'recruitment') {
        var ci = Number(noRecruitBox.getAttribute('data-c'));
        var card = DATA.cards[ci];
        card.noRecruit = noRecruitBox.checked;
        if (card.noRecruit) {
            (card.files || []).forEach(function(f) {
                if (f.href) queueDeleteRecruitPath(f.href);
            });
            card.files = [];
        } else {
            if (!card.description) {
                card.description = '介護職員（夜勤専従パートタイム）、施設管理人（パートタイム）を募集しております。';
            }
            if (!card.intro) {
                card.intro = '志摩広域行政組合会計年度任用職員を募集します。希望される方は、募集要項をご覧いただき、ご応募ください。';
            }
            if (!card.sections) card.sections = [];
            if (!card.sections.length) card.sections.push(defaultKaikeiSection());
        }
        render();
        return;
    }
    var input = e.target.closest('input[type="file"]');
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];
    // 保存名は安全な文字だけ。表示ラベルは元の日本語名を残す
    var name = safeUploadFileName(file.name);
    var displayLabel = uploadDisplayLabel(file.name);
    var kind = input.getAttribute('data-upload');
    if (kind === 'excel' || kind === 'pdf') {
        var yi = Number(input.getAttribute('data-y'));
        var ri = Number(input.getAttribute('data-r'));
        var yearId = DATA.years[yi].yearId;
        if (kind === 'excel') DATA.years[yi].results[ri].excel = name;
        else DATA.years[yi].results[ri].pdf = name;
        addPending('assets/nyusatu/' + yearId + '/' + kind, file, name);
        render();
    }
    if (kind === 'recruit' || kind === 'recruit-file') {
        var c = Number(input.getAttribute('data-c'));
        var card = DATA.cards[c];
        var newHref = '../assets/recruitment/' + name;
        // 直近1件だけ残す：同カードの旧ファイルは参照を外し、削除予約する
        (card.files || []).forEach(function(f) {
            if (f.href && f.href !== newHref) queueDeleteRecruitPath(f.href);
        });
        (card.groups || []).forEach(function(g) {
            (g.links || []).forEach(function(l) {
                if (l.href && l.href !== newHref) queueDeleteRecruitPath(l.href);
                l.href = '';
            });
        });
        var label = displayLabel;
        if (kind === 'recruit-file') {
            var fi = Number(input.getAttribute('data-f'));
            if (card.files && card.files[fi] && (card.files[fi].label || '').trim()) {
                label = card.files[fi].label;
            }
        }
        card.files = [{ label: label, href: newHref }];
        if (isKaikeiRecruitCard(card)) card.noRecruit = false;
        addPending('assets/recruitment', file, name);
        render();
    }
    if (kind === 'recruit-section') {
        var c = Number(input.getAttribute('data-c'));
        var s = Number(input.getAttribute('data-sec'));
        var i = Number(input.getAttribute('data-it'));
        var card = DATA.cards[c];
        var item = card.sections[s].items[i];
        var newHref = '../assets/recruitment/' + name;
        if (item.href && item.href !== newHref) queueDeleteRecruitPath(item.href);
        item.href = newHref;
        if (!(item.label || '').trim()) item.label = displayLabel;
        card.noRecruit = false;
        addPending('assets/recruitment', file, name);
        renderPreserveScroll();
    }
    if (kind === 'reiki-item' || kind === 'reiki-link') {
        var newHref = '../assets/reiki/' + name;
        if (kind === 'reiki-item') {
            var rs = Number(input.getAttribute('data-rs'));
            var hi = Number(input.getAttribute('data-h'));
            var ci = Number(input.getAttribute('data-c'));
            var ii = Number(input.getAttribute('data-i'));
            var item = DATA.sections[rs].hens[hi].chapters[ci].items[ii];
            if (item.href && item.href !== newHref) queueDeleteReikiPath(item.href);
            item.href = newHref;
        } else {
            var rs = Number(input.getAttribute('data-rs'));
            var li = Number(input.getAttribute('data-l'));
            var link = DATA.sections[rs].links[li];
            if (link.href && link.href !== newHref) queueDeleteReikiPath(link.href);
            link.href = newHref;
        }
        addPending('assets/reiki', file, name);
        render();
    }
    if (kind === 'torikumi') {
        // 施設取組はPDFのみ受け付ける
        if (!/\.pdf$/i.test(name)) {
            cmsSetStatus('PDFファイルのみアップロードできます。');
            input.value = '';
            return;
        }
        var s = Number(input.getAttribute('data-s'));
        var i = Number(input.getAttribute('data-it'));
        var item = DATA.sections[s].items[i];
        var newHref = '../assets/torikumi/' + name;
        if (item.href && item.href !== newHref) queueDeleteTorikumiPath(item.href);
        // 表示名が空ならファイル名（拡張子なし）を入れる
        if (!(item.label || '').trim()) item.label = displayLabel;
        item.href = newHref;
        addPending('assets/torikumi', file, name);
        render();
    }
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    var cfg = CONFIG[PAGE];
    var dirs = Object.keys(pendingByDir);
    var deletePaths = pendingDeletePaths.slice();
    if (dirs.length === 0) {
        var okEmpty = await cmsSave({
            kind: cfg.kind,
            jsonPath: cfg.jsonPath,
            payload: DATA,
            destDir: '',
            files: [],
            deletePaths: deletePaths
        });
        if (okEmpty) pendingDeletePaths = [];
        return;
    }
    for (var i = 0; i < dirs.length; i++) {
        var ok = await cmsSave({
            kind: cfg.kind,
            jsonPath: cfg.jsonPath,
            payload: DATA,
            destDir: dirs[i],
            files: pendingByDir[dirs[i]],
            /* 削除は最後の保存リクエストだけ送る */
            deletePaths: i === dirs.length - 1 ? deletePaths : []
        });
        if (!ok) return;
    }
    pendingByDir = {};
    pendingDeletePaths = [];
});

cmsRememberPassword();
bindReikiItemDrag();
bindTorikumiItemDrag();
loadPage();
