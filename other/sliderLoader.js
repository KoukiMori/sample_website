/**
 * スライダーデータを読み込んで表示する
 * - topics.json を日付の新しい順に並べ、上位7件をスライダー・お知らせリストに表示
 * - 画像なしの場合はプレースホルダー画像を使用
 */

// スライダーで許可する画像拡張子（小文字で比較）
const SLIDER_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

/** 画像なし時のプレースホルダー（スライダー用） */
const SLIDER_PLACEHOLDER_IMAGE = 'assets/otherimage/slider/slide1.jpg';

/** パスが許可された画像拡張子かどうか */
function isImagePath(path) {
    if (!path || typeof path !== 'string') return false;
    const ext = path.split('.').pop()?.toLowerCase().replace(/\?.*$/, '');
    return SLIDER_IMAGE_EXTENSIONS.includes(ext);
}

/** スライダー表示用の画像URL（画像が無い場合はプレースホルダー。スペース付きファイル名も使えるようにする） */
function getSliderImageUrl(item) {
    const path = isImagePath(item.image) ? item.image : SLIDER_PLACEHOLDER_IMAGE;
    return encodeURI(path);
}

/** 日付を「YYYY.MM.DD」形式に（topicList 表示用） */
function sliderFormatDate(dateString) {
    const d = new Date(dateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
}

function escapeSliderText(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// 管理画面の改行をカルーセル説明にも反映
function escapeSliderTextWithBreaks(text) {
    return escapeSliderText(text)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n/g, '<br>');
}

/** カテゴリから CSS クラス名を返す（topicList 表示用） */
function sliderCategoryClass(category) {
    const map = { '重要': 'important', 'お知らせ': 'info', '求人': 'recruit', 'イベント': 'event', '入札': 'bid', '感染関連': 'corona', 'コロナ': 'corona' };
    return map[category] || 'default';
}

async function loadSlider() {
    try {
        // JSONファイルからデータを取得
        const response = await fetch('data/topics.json', { cache: 'no-store' });
        const topics = await response.json();
        // 求人の「直近だけ遷移」判定用
        if (typeof setTopicListCache === 'function') setTopicListCache(topics);

        // 日付の新しい順に並べ、上位7件をスライダー・お知らせリストに使用
        const sliderItems = topics
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 7);

        // スライダーHTMLを生成（画像なしの場合はプレースホルダー画像を使用）
        const sliderContainer = document.getElementById('sliderItems');
        if (sliderContainer) {
            sliderContainer.innerHTML = sliderItems.map((item) => {
                const href = typeof topicHref === 'function' ? topicHref(item) : '';
                const hrefAttr = href ? ' data-href="' + href + '"' : '';
                const pastRecruit = typeof isPastRecruitTopic === 'function' && isPastRecruitTopic(item);
                // 過去の求人：お知らせ詳細へ遷移。日付とタイトルをカード中央に出す
                if (pastRecruit) {
                    return `
                <div class="item item-recruit-past"${hrefAttr}>
                    <img src="${getSliderImageUrl(item)}" alt="${escapeSliderText(item.title)}" draggable="false" onerror="this.onerror=null;this.src='${SLIDER_PLACEHOLDER_IMAGE}'">
                    <div class="slider-recruit-past-center">
                        <span class="slider-recruit-past-date">${sliderFormatDate(item.date)}</span>
                        <h1>${escapeSliderText(item.title)}</h1>
                    </div>
                </div>
            `;
                }
                const catClass = sliderCategoryClass(item.category);
                const catLabel = escapeSliderText(item.category);
                return `
                <div class="item"${hrefAttr}>
                    <img src="${getSliderImageUrl(item)}" alt="${escapeSliderText(item.title)}" draggable="false" onerror="this.onerror=null;this.src='${SLIDER_PLACEHOLDER_IMAGE}'">
                    <div class="slider-item-header">
                        <span class="slider-item-category category-${catClass}">${catLabel}</span>
                        <h1>${escapeSliderText(item.title)}</h1>
                    </div>
                    <p>${escapeSliderTextWithBreaks(item.description)}</p>
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
                    const inner = '<span class="topic-date">' + sliderFormatDate(item.date) + '</span>' +
                        '<span class="topic-category category-' + sliderCategoryClass(item.category) + '">' + escapeSliderText(item.category) + '</span>' +
                        '<span class="topic-title">' + escapeSliderText(item.title) + '</span>';
                    const href = typeof topicHref === 'function' ? topicHref(item) : '';
                    if (!href) return '<li class="topic-item">' + inner + '</li>';
                    return '<li class="topic-item"><a class="topic-item-link" href="' + href + '">' + inner + '</a></li>';
                }).join('');
            }
        }

    } catch (error) {
        console.error('スライダーデータの読み込みに失敗しました:', error);
    }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', loadSlider);
