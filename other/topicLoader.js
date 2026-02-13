/**
 * お知らせデータを読み込んで表示する共通処理
 * 
 * @param {string} containerId - お知らせを表示するコンテナのID
 * @param {number|null} limit - 表示件数（nullで全件表示）
 */
async function loadTopics(containerId, limit = null) {
    try {
        // JSONファイルからお知らせデータを取得
        const response = await fetch('data/topics.json');
        const topics = await response.json();

        // 日付順にソート（新しい順）
        topics.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 件数制限がある場合は絞り込み
        const displayTopics = limit ? topics.slice(0, limit) : topics;

        // HTMLを生成
        const topicsHtml = displayTopics.map(topic => `
            <li class="topic-item">
                <span class="topic-date">${formatDate(topic.date)}</span>
                <span class="topic-category category-${getCategoryClass(topic.category)}">${topic.category}</span>
                <span class="topic-title">${topic.title}</span>
            </li>
        `).join('');

        // コンテナに挿入
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = topicsHtml;
        }
    } catch (error) {
        console.error('お知らせデータの読み込みに失敗しました:', error);
    }
}

/**
 * 日付を「YYYY.MM.DD」形式にフォーマット
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

/**
 * カテゴリ名からCSSクラス名を生成
 * 重要 → important, お知らせ → info, 求人 → recruit, イベント → event, 入札 → bid, コロナ → corona
 */
function getCategoryClass(category) {
    const categoryMap = {
        '重要': 'important',
        'お知らせ': 'info',
        '求人': 'recruit',
        'イベント': 'event',
        '入札': 'bid',
        'コロナ': 'corona'
    };
    return categoryMap[category] || 'default';
}
