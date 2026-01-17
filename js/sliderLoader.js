/**
 * スライダーデータを読み込んで表示する
 * - item 1: 重要カテゴリの最新1件
 * - item 2: お知らせカテゴリの最新1件
 * - item 3: 求人カテゴリの最新1件
 * - item 4〜7: イベントカテゴリの最新4件
 */
async function loadSlider() {
    try {
        // JSONファイルからデータを取得
        const response = await fetch('data/topics.json');
        const topics = await response.json();

        // カテゴリ別に分類＆日付順ソート（新しい順）
        const important = topics
            .filter(t => t.category === '重要')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const info = topics
            .filter(t => t.category === 'お知らせ')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const recruit = topics
            .filter(t => t.category === '求人')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const events = topics
            .filter(t => t.category === 'イベント')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4); // 最新4件

        // スライダー用の配列を構築
        const sliderItems = [];

        // item 1: 重要の最新1件
        if (important.length > 0) {
            sliderItems.push(important[0]);
        }

        // item 2: お知らせの最新1件
        if (info.length > 0) {
            sliderItems.push(info[0]);
        }

        // item 3: 求人の最新1件
        if (recruit.length > 0) {
            sliderItems.push(recruit[0]);
        }

        // item 4〜7: イベントの最新4件
        sliderItems.push(...events);

        // スライダーHTMLを生成
        const sliderContainer = document.getElementById('sliderItems');
        if (sliderContainer) {
            sliderContainer.innerHTML = sliderItems.map((item, index) => `
                <div class="item">
                    <!-- スライド${index + 1}の画像 -->
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
