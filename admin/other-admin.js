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
            // ファイル名があるときだけ、公開ページと同じ文言のリンクをプレビュー表示
            if (row.excel || row.pdf) {
                html += '<p class="nyusatu-admin-links">表示リンク：';
                if (row.excel) {
                    html += '<a href="../' + cmsEscape(base) + '/' + cmsEscape(year.yearId) + '/excel/' + cmsEscape(row.excel) + '" target="_blank" rel="noopener">Excelファイル</a>';
                }
                if (row.excel && row.pdf) html += '　';
                if (row.pdf) {
                    html += '<a href="../' + cmsEscape(base) + '/' + cmsEscape(year.yearId) + '/pdf/' + cmsEscape(row.pdf) + '" target="_blank" rel="noopener">PDFファイル</a>';
                }
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

function renderRecruitment() {
    var html = '';
    (DATA.cards || []).forEach(function(card, i) {
        if (!card.files) card.files = [];
        html += '<section class="howto"><h2>' + cmsEscape(card.title || ('カード ' + (i + 1))) + '</h2>';
        html += '<label>タイトル<input data-c="' + i + '" data-k="title" value="' + cmsEscape(card.title) + '"></label>';
        html += '<label>リード文（太字は &lt;strong&gt;文字&lt;/strong&gt;）<textarea data-c="' + i + '" data-k="description" rows="3">' + cmsEscape(card.description) + '</textarea></label>';
        html += '<label>補足（1行に1つ）<textarea data-c="' + i + '" data-k="notes" rows="4">' + cmsEscape((card.notes || []).join('\n')) + '</textarea></label>';
        html += '<h3>詳細を見るに表示するファイル（直近1件のみ）</h3>';
        card.files.forEach(function(file, fi) {
            html += '<div class="photo-edit">';
            html += '<label>表示名<input data-c="' + i + '" data-f="' + fi + '" data-k="fileLabel" value="' + cmsEscape(file.label) + '"></label>';
            html += '<label>ファイルを置く（PDF・JPG・PNG）<input type="file" data-upload="recruit-file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png" data-c="' + i + '" data-f="' + fi + '"></label>';
            if (file.href) html += '<p class="image-path-note">' + cmsEscape(file.href) + '</p>';
            html += '<button type="button" class="btn btn-danger" data-del-recruit-file="' + i + '-' + fi + '">このファイルを外す</button>';
            html += '</div>';
        });
        html += '<button type="button" class="btn" data-add-recruit-file="' + i + '">ファイルを追加</button>';
        html += '<p class="admin-header-note">新しいファイルを置くと、同じカードの旧ファイルは外して削除します。</p>';
        html += '</section>';
    });
    document.getElementById('editor').innerHTML = html;
}

function renderTorikumi() {
    var html = '';
    (DATA.sections || []).forEach(function(sec, i) {
        html += '<section class="howto"><label>見出し<input data-s="' + i + '" data-k="title" value="' + cmsEscape(sec.title) + '"></label>';
        html += '<label>注記<input data-s="' + i + '" data-k="note" value="' + cmsEscape(sec.note) + '"></label>';
        var lines = (sec.items || []).map(function(it) {
            return typeof it === 'string' ? it : ((it.label || '') + (it.href ? '|' + it.href : ''));
        }).join('\n');
        html += '<label>項目（1行に1つ。リンクは 表示名|URL）<textarea data-s="' + i + '" data-k="items" rows="5">' + cmsEscape(lines) + '</textarea></label>';
        html += '<button type="button" class="btn btn-danger" data-del-sec="' + i + '">この見出しを削除</button></section>';
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

function renderReiki() {
    var html = '<p>見出しをクリックすると編・章を開閉できます。「編を追加」「章を追加」「項目を追加」で増やせます。項目は左のつまみをドラッグするか「上へ」「下へ」で同じ章の中を並べ替えます。ファイルの保存先は <code>assets/reiki</code> です。</p>';
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
        html += '</div></section>';
    });
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

/* Excel / PDF のファイル名が変わったら、表示リンクのプレビューだけ差し替える */
function refreshNyusatuLinks(yi, ri) {
    var card = document.querySelector(
        '.photo-edit input[data-y="' + yi + '"][data-r="' + ri + '"][data-k="excel"]'
    );
    if (!card) return;
    card = card.closest('.photo-edit');
    if (!card) return;
    var row = DATA.years[yi].results[ri];
    var year = DATA.years[yi];
    var base = (DATA.basePath || 'assets/nyusatu').replace(/\/$/, '');
    var old = card.querySelector('.nyusatu-admin-links');
    if (old) old.remove();
    if (!row.excel && !row.pdf) return;
    var p = document.createElement('p');
    p.className = 'nyusatu-admin-links';
    p.appendChild(document.createTextNode('表示リンク：'));
    if (row.excel) {
        var a = document.createElement('a');
        a.href = '../' + base + '/' + year.yearId + '/excel/' + row.excel;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Excelファイル';
        p.appendChild(a);
    }
    if (row.excel && row.pdf) p.appendChild(document.createTextNode('　'));
    if (row.pdf) {
        var b = document.createElement('a');
        b.href = '../' + base + '/' + year.yearId + '/pdf/' + row.pdf;
        b.target = '_blank';
        b.rel = 'noopener';
        b.textContent = 'PDFファイル';
        p.appendChild(b);
    }
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
        if (!k) return;
        var fi = t.getAttribute('data-f');
        if (fi !== null && k === 'fileLabel') {
            if (!DATA.cards[c].files) DATA.cards[c].files = [];
            DATA.cards[c].files[Number(fi)].label = t.value;
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
        if (k === 'items') {
            DATA.sections[s].items = t.value.split('\n').filter(Boolean).map(function(line) {
                var p = line.split('|');
                if (p.length > 1) return { label: p[0], href: p.slice(1).join('|') };
                return line;
            });
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
    var addRi = e.target.closest('[data-add-reiki-item]');
    var delRi = e.target.closest('[data-del-reiki-item]');
    var addRl = e.target.closest('[data-add-reiki-link]');
    var delRl = e.target.closest('[data-del-reiki-link]');
    var addRh = e.target.closest('[data-add-reiki-hen]');
    var delRh = e.target.closest('[data-del-reiki-hen]');
    var addRc = e.target.closest('[data-add-reiki-ch]');
    var delRc = e.target.closest('[data-del-reiki-ch]');
    var moveRi = e.target.closest('[data-move-reiki-item]');
    var moveRl = e.target.closest('[data-move-reiki-link]');
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
        DATA.sections.splice(Number(delS.getAttribute('data-del-sec')), 1);
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
    var input = e.target.closest('input[type="file"]');
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];
    var name = file.name.replace(/[\\/:*?"<>|]/g, '_');
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
        var label = name;
        if (kind === 'recruit-file') {
            var fi = Number(input.getAttribute('data-f'));
            if (card.files && card.files[fi] && (card.files[fi].label || '').trim()) {
                label = card.files[fi].label;
            }
        }
        card.files = [{ label: label, href: newHref }];
        addPending('assets/recruitment', file, name);
        render();
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
loadPage();
