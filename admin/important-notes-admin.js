/**
 * 各施設の重要事項説明書PDFを登録する
 * 保存先: assets/otherimage/{施設ID}/importantNotes.json と PDF
 */
var NAMES = {
    sainiwa: '才庭寮',
    tomoyama: 'ともやま苑',
    hanazono: '花園寮'
};
var DATA = { updated: '', fileName: '' };
var currentId = 'sainiwa';
var pendingFile = null;

function facilityDir() {
    return 'assets/otherimage/' + currentId;
}

// 西暦を令和表記（R8.9.17）にする
function toReiwaLabel(date) {
    var y = date.getFullYear() - 2018;
    return 'R' + y + '.' + (date.getMonth() + 1) + '.' + date.getDate();
}

function showForm() {
    document.getElementById('updatedField').value = DATA.updated || '';
    var current = document.getElementById('currentFile');
    if (DATA.fileName) {
        current.textContent = '登録中のファイル: ' + DATA.fileName;
    } else {
        current.textContent = 'まだPDFは登録されていません。';
    }
}

async function loadFacility() {
    currentId = document.getElementById('facilitySelect').value;
    pendingFile = null;
    document.getElementById('pdfFile').value = '';
    try {
        var res = await fetch('../' + facilityDir() + '/importantNotes.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('not found');
        DATA = await res.json();
        if (!DATA.updated) DATA.updated = '';
        if (!DATA.fileName) DATA.fileName = '';
        showForm();
        cmsSetStatus(NAMES[currentId] + ' の重要事項説明書を読み込みました。');
    } catch (e) {
        DATA = { updated: '', fileName: '' };
        showForm();
        cmsSetStatus('データが無いため空の状態です。PDFを選んで保存してください。');
    }
}

document.getElementById('facilitySelect').addEventListener('change', loadFacility);

document.getElementById('todayBtn').addEventListener('click', function() {
    document.getElementById('updatedField').value = toReiwaLabel(new Date());
});

document.getElementById('pdfFile').addEventListener('change', function() {
    var file = this.files && this.files[0];
    pendingFile = file || null;
    if (file && !document.getElementById('updatedField').value.trim()) {
        document.getElementById('updatedField').value = toReiwaLabel(new Date());
    }
});

document.getElementById('saveBtn').addEventListener('click', async function() {
    DATA.updated = document.getElementById('updatedField').value.trim();
    var files = [];
    if (pendingFile) {
        var ext = (pendingFile.name.split('.').pop() || 'pdf').toLowerCase();
        if (ext !== 'pdf') {
            cmsSetStatus('PDFファイルを選んでください。');
            return;
        }
        DATA.fileName = 'important-notes.pdf';
        files.push({ file: pendingFile, fileName: DATA.fileName });
    }
    if (!DATA.fileName) {
        cmsSetStatus('PDFファイルを選んでください。');
        return;
    }
    var ok = await cmsSave({
        kind: 'importantNotes',
        jsonPath: facilityDir() + '/importantNotes.json',
        payload: DATA,
        destDir: files.length ? facilityDir() : '',
        files: files
    });
    if (ok) {
        pendingFile = null;
        document.getElementById('pdfFile').value = '';
        showForm();
    }
});

cmsRememberPassword();
loadFacility();
