/**
 * スライダーデータを読み込んで表示する
 * - item 1: 重要カテゴリの最新1件
 * - item 2: お知らせカテゴリの最新1件
 * - item 3: 求人カテゴリの最新1件
 * - item 4〜7: イベントカテゴリの最新4件
 * - 画像は jpg / jpeg / png / gif / webp / bmp / svg など拡張子で判定
 */

// スライダーで許可する画像拡張子（小文字で比較）
const SLIDER_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

/** パスが許可された画像拡張子かどうか */
function isImagePath(path) {
    if (!path || typeof path !== 'string') return false;
    const ext = path.split('.').pop()?.toLowerCase().replace(/\?.*$/, '');
    return SLIDER_IMAGE_EXTENSIONS.includes(ext);
}

async function loadSlider() {
    try {
        // JSONファイルからデータを取得
        const response = await fetch('data/topics.json');
        const topics = await response.json();

        // カテゴリ別に分類＆日付順ソート（新しい順）。画像パスが有効なもののみ対象
        const withImage = (t) => isImagePath(t.image);
        const important = topics
            .filter(t => t.category === '重要' && withImage(t))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const info = topics
            .filter(t => t.category === 'お知らせ' && withImage(t))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const recruit = topics
            .filter(t => t.category === '求人' && withImage(t))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const events = topics
            .filter(t => t.category === 'イベント' && withImage(t))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4); // 最新4件

        // スライダー用の配列を構築
        const sliderItems = [];

        if (important.length > 0) sliderItems.push(important[0]);
        if (info.length > 0) sliderItems.push(info[0]);
        if (recruit.length > 0) sliderItems.push(recruit[0]);
        sliderItems.push(...events);

        // スライダーHTMLを生成（画像はそのまま src に指定・拡張子は上でフィルタ済み）
        const sliderContainer = document.getElementById('sliderItems');
        if (sliderContainer) {
            sliderContainer.innerHTML = sliderItems.map((item, index) => `
                <div class="item">
                    <img src="${item.image}" alt="${item.title}">
                    <h1>${item.title}</h1>
                    <p>${item.description}</p>
                </div>
            `).join('');
        }

        // スライダー初期化（toppage.jsの処理を呼び出し）
        if (typeof initSlider === 'function') {
            initSlider();
        }

    } catch (error) {
        console.error('スライダーデータの読み込みに失敗しました:', error);
    }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', loadSlider);
