/**
 * 入札・例規集・求人・施設取組の編集
 */
var PAGE = 'nyusatu';
var DATA = {};
var pendingByDir = {};

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

function renderNyusatu() {
    var html = '';
    (DATA.years || []).forEach(function(year, yi) {
        html += '<section class="howto"><h2>' + cmsEscape(year.label) + '（' + cmsEscape(year.yearId) + '）</h2>';
        html += '<label>年度名<input data-y="' + yi + '" data-k="label" value="' + cmsEscape(year.label) + '"></label>';
        html += '<label>年度ID<input data-y="' + yi + '" data-k="yearId" value="' + cmsEscape(year.yearId) + '"></label>';
        (year.results || []).forEach(function(row, ri) {
            html += '<div class="photo-edit">';
            html += '<label>執行日<input data-y="' + yi + '" data-r="' + ri + '" data-k="dateLabel" value="' + cmsEscape(row.dateLabel) + '"></label>';
            html += '<label>Excelファイル名<input data-y="' + yi + '" data-r="' + ri + '" data-k="excel" value="' + cmsEscape(row.excel) + '"></label>';
            html += '<label>Excelを置く<input type="file" data-upload="excel" data-y="' + yi + '" data-r="' + ri + '"></label>';
            html += '<label>PDFファイル名<input data-y="' + yi + '" data-r="' + ri + '" data-k="pdf" value="' + cmsEscape(row.pdf) + '"></label>';
            html += '<label>PDFを置く<input type="file" data-upload="pdf" data-y="' + yi + '" data-r="' + ri + '"></label>';
            html += '<button type="button" class="btn btn-danger" data-del-result="' + yi + '-' + ri + '">この執行分を削除</button>';
            html += '</div>';
        });
        html += '<button type="button" class="btn" data-add-result="' + yi + '">執行分を追加</button>';
        html += '<button type="button" class="btn btn-danger" data-del-year="' + yi + '">この年度を削除</button></section>';
    });
    html += '<button type="button" class="btn" id="addYearBtn">年度を追加</button>';
    document.getElementById('editor').innerHTML = html;
}

function renderRecruitment() {
    var html = '';
    (DATA.cards || []).forEach(function(card, i) {
        html += '<section class="howto"><h2>カード ' + (i + 1) + '</h2>';
        html += '<label>タイトル<input data-c="' + i + '" data-k="title" value="' + cmsEscape(card.title) + '"></label>';
        html += '<label>リード文<textarea data-c="' + i + '" data-k="description" rows="3">' + cmsEscape(card.description) + '</textarea></label>';
        html += '<label>補足（1行に1つ）<textarea data-c="' + i + '" data-k="notes" rows="4">' + cmsEscape((card.notes || []).join('\n')) + '</textarea></label>';
        (card.groups || []).forEach(function(g, gi) {
            html += '<p>' + cmsEscape(g.label) + '</p>';
            (g.links || []).forEach(function(lk, li) {
                html += '<label>リンク名<input data-c="' + i + '" data-g="' + gi + '" data-l="' + li + '" data-k="label" value="' + cmsEscape(lk.label) + '"></label>';
                html += '<label>ファイル名 / URL<input data-c="' + i + '" data-g="' + gi + '" data-l="' + li + '" data-k="href" value="' + cmsEscape(lk.href) + '"></label>';
                html += '<label>PDFを置く<input type="file" data-upload="recruit" data-c="' + i + '" data-g="' + gi + '" data-l="' + li + '"></label>';
            });
        });
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

function renderReiki() {
    var html = '<p>例規集の項目名を編集できます。1行が1項目です。</p>';
    (DATA.sections || []).forEach(function(sec, si) {
        html += '<section class="howto"><label>セクション名<input data-rs="' + si + '" data-k="title" value="' + cmsEscape(sec.title) + '"></label>';
        if (sec.hens) {
            sec.hens.forEach(function(hen, hi) {
                html += '<h3>' + cmsEscape(hen.title) + '</h3>';
                html += '<label>編の名前<input data-rs="' + si + '" data-h="' + hi + '" data-k="henTitle" value="' + cmsEscape(hen.title) + '"></label>';
                (hen.chapters || []).forEach(function(ch, ci) {
                    html += '<label>' + cmsEscape(ch.title || '項目') + '<textarea data-rs="' + si + '" data-h="' + hi + '" data-c="' + ci + '" data-k="items" rows="6">' + cmsEscape((ch.items || []).join('\n')) + '</textarea></label>';
                });
            });
        } else {
            html += '<label>注記<textarea data-rs="' + si + '" data-k="note" rows="2">' + cmsEscape(sec.note) + '</textarea></label>';
            var linkLines = (sec.links || []).map(function(lk) { return (lk.label || '') + '|' + (lk.href || ''); }).join('\n');
            html += '<label>リンク（表示名|URL）<textarea data-rs="' + si + '" data-k="links" rows="4">' + cmsEscape(linkLines) + '</textarea></label>';
        }
        html += '</section>';
    });
    document.getElementById('editor').innerHTML = html;
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
        DATA.years[yi][k] = t.value;
    } else {
        DATA.years[yi].results[Number(ri)][k] = t.value;
    }
}

function render() {
    if (PAGE === 'nyusatu') renderNyusatu();
    else if (PAGE === 'recruitment') renderRecruitment();
    else if (PAGE === 'torikumi') renderTorikumi();
    else renderReiki();
}

async function loadPage() {
    PAGE = document.getElementById('pageSelect').value;
    pendingByDir = {};
    var cfg = CONFIG[PAGE];
    var res = await fetch(cfg.path, { cache: 'no-store' });
    DATA = await res.json();
    render();
    cmsSetStatus('読み込みました。');
}

document.getElementById('pageSelect').addEventListener('change', loadPage);

document.getElementById('editor').addEventListener('input', function(e) {
    var t = e.target;
    if (PAGE === 'nyusatu') return collectNyusatu(e);
    if (PAGE === 'recruitment') {
        var c = t.getAttribute('data-c');
        if (c === null) return;
        c = Number(c);
        var g = t.getAttribute('data-g');
        var l = t.getAttribute('data-l');
        var k = t.getAttribute('data-k');
        if (g === null) {
            if (k === 'notes') DATA.cards[c].notes = t.value.split('\n').filter(Boolean);
            else DATA.cards[c][k] = t.value;
        } else {
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
    if (k === 'title') DATA.sections[rs].title = t.value;
    else if (k === 'note') DATA.sections[rs].note = t.value;
    else if (k === 'links') {
        DATA.sections[rs].links = t.value.split('\n').filter(Boolean).map(function(line) {
            var p = line.split('|');
            return { label: p[0] || '', href: p[1] || '' };
        });
    } else if (k === 'henTitle') DATA.sections[rs].hens[Number(h)].title = t.value;
    else if (k === 'items') DATA.sections[rs].hens[Number(h)].chapters[Number(c)].items = t.value.split('\n').filter(Boolean);
});

document.getElementById('editor').addEventListener('click', function(e) {
    var addY = e.target.closest('#addYearBtn');
    var addR = e.target.closest('[data-add-result]');
    var delR = e.target.closest('[data-del-result]');
    var delY = e.target.closest('[data-del-year]');
    var addS = e.target.closest('#addSecBtn');
    var delS = e.target.closest('[data-del-sec]');
    if (addY) {
        DATA.years = DATA.years || [];
        DATA.years.push({ yearId: 'r8', label: '令和8年度', results: [] });
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
        DATA.years.splice(Number(delY.getAttribute('data-del-year')), 1);
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
    if (kind === 'recruit') {
        var c = Number(input.getAttribute('data-c'));
        var g = Number(input.getAttribute('data-g'));
        var l = Number(input.getAttribute('data-l'));
        DATA.cards[c].groups[g].links[l].href = '../assets/recruitment/' + name;
        addPending('assets/recruitment', file, name);
        render();
    }
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    var cfg = CONFIG[PAGE];
    var dirs = Object.keys(pendingByDir);
    if (dirs.length === 0) {
        await cmsSave({ kind: cfg.kind, jsonPath: cfg.jsonPath, payload: DATA, destDir: '', files: [] });
        return;
    }
    for (var i = 0; i < dirs.length; i++) {
        var ok = await cmsSave({
            kind: cfg.kind,
            jsonPath: cfg.jsonPath,
            payload: DATA,
            destDir: dirs[i],
            files: pendingByDir[dirs[i]]
        });
        if (!ok) return;
    }
    pendingByDir = {};
});

cmsRememberPassword();
loadPage();
