/**
 * スライダーデータを読み込んで表示する
 * - topics.json を日付の新しい順に並べ、上位7件をスライダー・お知らせリストに表示
 * - 画像なしの場合はプレースホルダー画像を使用
 */

// スライダーで許可する画像拡張子（小文字で比較）
const SLIDER_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

/** 画像なし時のプレースホルダー（スライダー用） */
const SLIDER_PLACEHOLDER_IMAGE = 'assets/slider/slide1.jpg';

/** パスが許可された画像拡張子かどうか */
function isImagePath(path) {
    if (!path || typeof path !== 'string') return false;
    const ext = path.split('.').pop()?.toLowerCase().replace(/\?.*$/, '');
    return SLIDER_IMAGE_EXTENSIONS.includes(ext);
}

/** スライダー表示用の画像URL（画像が無い場合はプレースホルダー） */
function getSliderImageUrl(item) {
    return isImagePath(item.image) ? item.image : SLIDER_PLACEHOLDER_IMAGE;
}

/** 日付を「YYYY.MM.DD」形式に（topicList 表示用） */
function sliderFormatDate(dateString) {
    const d = new Date(dateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
}

/** カテゴリから CSS クラス名を返す（topicList 表示用） */
function sliderCategoryClass(category) {
    const map = { '重要': 'important', 'お知らせ': 'info', '求人': 'recruit', 'イベント': 'event', '入札': 'bid', 'コロナ': 'corona' };
    return map[category] || 'default';
}

async function loadSlider() {
    try {
        // JSONファイルからデータを取得
        const response = await fetch('data/topics.json');
        const topics = await response.json();

        // 日付の新しい順に並べ、上位7件をスライダー・お知らせリストに使用
        const sliderItems = topics
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 7);

        // スライダーHTMLを生成（画像なしの場合はプレースホルダー画像を使用）
        const sliderContainer = document.getElementById('sliderItems');
        if (sliderContainer) {
            sliderContainer.innerHTML = sliderItems.map((item) => {
                const catClass = sliderCategoryClass(item.category);
                const catLabel = (item.category || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `
                <div class="item">
                    <img src="${getSliderImageUrl(item)}" alt="${(item.title || '').replace(/"/g, '&quot;')}">
                    <div class="slider-item-header">
                        <span class="slider-item-category category-${catClass}">${catLabel}</span>
                        <h1>${(item.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
                    </div>
                    <p>${(item.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                </div>
            `;
            }).join('');
        }

        // スライダー初期化（toppage.jsの処理を呼び出し）
        if (typeof initSlider === 'function') {
            initSlider();
        }

        // トップページのみ：お知らせリストの件数をスライダーと必ず一致させる（sliderItems と同一配列で描画）
        if (sliderContainer) {
            const topicListEl = document.getElementById('topicList');
            if (topicListEl) {
                topicListEl.innerHTML = sliderItems.map(function(item) {
                    return '<li class="topic-item">' +
                        '<span class="topic-date">' + sliderFormatDate(item.date) + '</span>' +
                        '<span class="topic-category category-' + sliderCategoryClass(item.category) + '">' + (item.category || '') + '</span>' +
                        '<span class="topic-title">' + (item.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>' +
                        '</li>';
                }).join('');
            }
        }

    } catch (error) {
        console.error('スライダーデータの読み込みに失敗しました:', error);
    }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', loadSlider);
