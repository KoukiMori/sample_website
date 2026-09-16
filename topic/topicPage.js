/**
 * topic.html?id= のとき、1件の詳細を表示する
 */
(function() {
    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    if (!id) return;

    var wrap = document.getElementById('topicListWrap');
    var detail = document.getElementById('topicDetail');
    var back = document.getElementById('topicBack');
    if (wrap) wrap.hidden = true;
    if (back) back.hidden = false;
    if (!detail) return;
    detail.hidden = false;

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function categoryClass(category) {
        var map = {
            '重要': 'important',
            'お知らせ': 'info',
            '求人': 'recruit',
            'イベント': 'event',
            '入札': 'bid',
            'コロナ': 'corona'
        };
        return map[category] || 'default';
    }

    fetch('data/topics.json', { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(topics) {
            var item = (topics || []).find(function(topic) {
                return String(topic.id) === String(id);
            });
            var heading = document.querySelector('.page-content h1');
            if (!item) {
                if (heading) heading.textContent = 'お知らせ';
                detail.innerHTML = '<p>お知らせが見つかりませんでした。</p>';
                return;
            }
            if (heading) heading.textContent = item.title || 'お知らせ';
            document.title = (item.title || 'お知らせ') + ' | 志摩広域行政組合';

            var dateText = typeof formatDate === 'function' ? formatDate(item.date) : (item.date || '');
            // 簡単な説明（カルーセルと同じ）の下に、詳細の説明を出す
            var body = escapeHtml(item.description).replace(/\n/g, '<br>');
            var more = escapeHtml(item.detail).replace(/\n/g, '<br>');
            var image = '';
            if (item.image) {
                image = '<img class="topic-detail-image" src="' + encodeURI(item.image) + '" alt="' + escapeHtml(item.title) + '">';
            }
            detail.innerHTML =
                '<p class="topic-detail-meta">' +
                    '<span class="topic-date">' + escapeHtml(dateText) + '</span>' +
                    '<span class="topic-category category-' + categoryClass(item.category) + '">' + escapeHtml(item.category) + '</span>' +
                '</p>' +
                image +
                (body ? '<p class="topic-detail-body">' + body + '</p>' : '') +
                (more ? '<p class="topic-detail-more">' + more + '</p>' : '');
        })
        .catch(function(err) {
            console.error(err);
            detail.innerHTML = '<p>お知らせを表示できませんでした。</p>';
        });
})();
