/**
 * 指定した topic 配列でお知らせリストを描画（スライダーと同一件数・同一内容で連動させる用）
 * @param {string} containerId - コンテナのID（例: 'topicList'）
 * @param {Array} items - topic オブジェクトの配列（date, category, title を持つ）
 */
function renderTopicListFromItems(containerId, items) {
    if (!items || items.length === 0) return;
    const container = document.getElementById(containerId);
    if (!container) return;
    const html = items.map(topicItemHtml).join('');
    container.innerHTML = html;
}

/**
 * お知らせデータを読み込んで表示する共通処理
 * 
 * @param {string} containerId - お知らせを表示するコンテナのID
 * @param {number|null} limit - 表示件数（nullで全件表示）
 */
async function loadTopics(containerId, limit = null) {
    try {
        // JSONファイルからお知らせデータを取得
        const response = await fetch('data/topics.json', { cache: 'no-store' });
        const topics = await response.json();
        // 求人の「直近だけ遷移」判定用
        if (typeof setTopicListCache === 'function') setTopicListCache(topics);

        // 日付順にソート（新しい順）
        topics.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 件数制限がある場合は絞り込み
        const displayTopics = limit ? topics.slice(0, limit) : topics;

        // HTMLを生成
        const topicsHtml = displayTopics.map(topicItemHtml).join('');

        // コンテナに挿入
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = topicsHtml;
        }
    } catch (error) {
        console.error('お知らせデータの読み込みに失敗しました:', error);
    }
}

function escapeTopicText(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// 行き先がある件はリンク、無い件はそのまま表示
function topicItemHtml(topic) {
    var inner = '<span class="topic-date">' + formatDate(topic.date) + '</span>' +
        '<span class="topic-category category-' + getCategoryClass(topic.category) + '">' + escapeTopicText(topic.category) + '</span>' +
        '<span class="topic-title">' + escapeTopicText(topic.title) + '</span>';
    var href = typeof topicHref === 'function' ? topicHref(topic) : '';
    if (!href) return '<li class="topic-item">' + inner + '</li>';
    return '<li class="topic-item"><a class="topic-item-link" href="' + href + '">' + inner + '</a></li>';
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
 * 重要 → important, お知らせ → info, 求人 → recruit, イベント → event, 入札 → bid, 感染関連 → corona
 */
function getCategoryClass(category) {
    const categoryMap = {
        '重要': 'important',
        'お知らせ': 'info',
        '求人': 'recruit',
        'イベント': 'event',
        '入札': 'bid',
        '感染関連': 'corona',
        'コロナ': 'corona'
    };
    return categoryMap[category] || 'default';
}
