// recruitment.html 用のスクリプト

function initRecruitmentPage() {
    // 求人カードの「詳細を見る」クリックで下に展開
    initRecruitmentCardToggle();

    // フォーム要素を取得
    const form = document.getElementById('recruitmentForm');

    if (!form) return;

    // フォーム送信時の処理
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // デフォルトの送信を防止

        // フォームデータを取得
        const formData = new FormData(form);

        // バリデーション
        if (!validateForm(formData)) {
            return;
        }

        // ファイルサイズチェック
        if (!validateFileSize(formData)) {
            return;
        }

        // 送信確認ダイアログ
        const confirmMessage = '応募内容を送信しますか？\n送信後は変更できません。';
        if (!confirm(confirmMessage)) {
            return;
        }

        // ここで実際の送信処理を実装
        // 例: サーバーに送信、メール送信など
        submitForm(formData);
    });

    // リアルタイムバリデーション（オプション）
    setupRealTimeValidation();
}

// ページ読み込み時に実行（DOMContentLoaded または既に読み込み済みなら即実行）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecruitmentPage);
} else {
    initRecruitmentPage();
}

/**
 * 求人カードの詳細をクリックで展開・閉じる（イベント委譲で確実に動作）
 */
function initRecruitmentCardToggle() {
    var container = document.querySelector('.recruitment-cards-container');
    if (!container) return;
    container.addEventListener('click', function(e) {
        var btn = e.target.closest('.recruitment-card-toggle');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var card = btn.closest('.recruitment-card');
        if (!card) return;
        var isExpanded = card.classList.toggle('is-expanded');
        btn.setAttribute('aria-expanded', isExpanded);
        var icon = btn.querySelector('i');
        if (icon) icon.setAttribute('aria-hidden', 'true');
        var textEl = btn.querySelector('.recruitment-card-toggle-text');
        if (textEl) textEl.textContent = isExpanded ? '詳細を閉じる' : '詳細を見る';
    });
}

/**
 * フォームのバリデーション
 * @param {FormData} formData - フォームデータ
 * @returns {boolean} - バリデーション結果
 */
function validateForm(formData) {
    // 必須項目のチェック
    const requiredFields = [
        'lastName',
        'firstName',
        'lastNameKana',
        'firstNameKana',
        'email',
        'phone',
        'position',
        'motivation',
        'resume'
    ];

    for (const field of requiredFields) {
        const value = formData.get(field);
        if (!value || value.trim() === '') {
            alert(`${getFieldLabel(field)}を入力してください。`);
            var el = document.getElementById(field);
            if (el) el.focus();
            return false;
        }
    }

    // メールアドレスの形式チェック
    const email = formData.get('email');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        alert('正しいメールアドレスを入力してください。');
        var emailEl = document.getElementById('email');
        if (emailEl) emailEl.focus();
        return false;
    }

    // 電話番号の形式チェック（簡易）
    const phone = formData.get('phone');
    const phonePattern = /^[0-9-]+$/;
    if (!phonePattern.test(phone)) {
        alert('正しい電話番号を入力してください。');
        var phoneEl = document.getElementById('phone');
        if (phoneEl) phoneEl.focus();
        return false;
    }

    return true;
}

/**
 * ファイルサイズのバリデーション
 * @param {FormData} formData - フォームデータ
 * @returns {boolean} - バリデーション結果
 */
function validateFileSize(formData) {
    const maxSize = 5 * 1024 * 1024; // 5MB

    // 履歴書のチェック
    const resume = formData.get('resume');
    if (resume && resume.size > maxSize) {
        alert('履歴書のファイルサイズが5MBを超えています。');
        return false;
    }

    // 職務経歴書のチェック
    const careerHistory = formData.get('careerHistory');
    if (careerHistory && careerHistory.size > maxSize) {
        alert('職務経歴書のファイルサイズが5MBを超えています。');
        return false;
    }

    return true;
}

/**
 * フィールド名からラベルを取得
 * @param {string} fieldName - フィールド名
 * @returns {string} - ラベル
 */
function getFieldLabel(fieldName) {
    const labels = {
        'lastName': '氏名（姓）',
        'firstName': '氏名（名）',
        'lastNameKana': 'フリガナ（セイ）',
        'firstNameKana': 'フリガナ（メイ）',
        'email': 'メールアドレス',
        'phone': '電話番号',
        'position': '希望職種',
        'motivation': '志望動機',
        'resume': '履歴書'
    };
    return labels[fieldName] || fieldName;
}

/**
 * フォーム送信処理
 * @param {FormData} formData - フォームデータ
 */
function submitForm(formData) {
    // 送信中の表示
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '送信中...';
    submitBtn.disabled = true;

    // ここで実際の送信処理を実装
    // 例: fetch APIを使用してサーバーに送信
    /*
    fetch('/api/recruitment', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('応募が完了しました。ありがとうございます。');
            form.reset();
        } else {
            alert('送信に失敗しました。もう一度お試しください。');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('送信に失敗しました。もう一度お試しください。');
    })
    .finally(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
    */

    // デモ用: 送信成功をシミュレート
    setTimeout(() => {
        alert('応募が完了しました。ありがとうございます。\n\n※このフォームはデモ用です。実際の送信処理はサーバー側で実装してください。');
        form.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 1000);
}

/**
 * リアルタイムバリデーションの設定
 */
function setupRealTimeValidation() {
    // メールアドレスのリアルタイムチェック
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value;
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.style.borderColor = '#e53935';
            } else {
                this.style.borderColor = '#e0e0e0';
            }
        });
    }

    // 電話番号のリアルタイムチェック
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', function() {
            const phone = this.value;
            if (phone && !/^[0-9-]+$/.test(phone)) {
                this.style.borderColor = '#e53935';
            } else {
                this.style.borderColor = '#e0e0e0';
            }
        });
    }
}