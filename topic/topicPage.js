/**
 * topic.html?id= のとき、1件の詳細を表示する
 * 行き先が詳細／過去の求人のとき、カード枠外の下に「タイトル＜　＞タイトル」を出す
 * 過去の求人は写真カード中央に管理画面のタイトルを出す
 */
(function() {
    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    if (!id) return;

    var wrap = document.getElementById('topicListWrap');
    var detail = document.getElementById('topicDetail');
    var back = document.getElementById('topicBack');
    var nav = document.getElementById('topicDetailNav');
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
            '感染関連': 'corona',
            'コロナ': 'corona'
        };
        return map[category] || 'default';
    }

    // 詳細ページを開く件だけ、日付新しい順で前後を取る
    function detailNeighbors(topics, currentId) {
        var list = (topics || []).filter(function(t) {
            return typeof opensTopicDetail === 'function'
                ? opensTopicDetail(t)
                : (typeof resolveLinkType === 'function' ? resolveLinkType(t) === 'detail' : true);
        }).slice().sort(function(a, b) {
            var da = new Date(b.date) - new Date(a.date);
            if (da !== 0) return da;
            return Number(b.id) - Number(a.id);
        });
        var index = -1;
        for (var i = 0; i < list.length; i++) {
            if (String(list[i].id) === String(currentId)) {
                index = i;
                break;
            }
        }
        if (index < 0) return { newer: null, older: null };
        return {
            newer: index > 0 ? list[index - 1] : null,
            older: index < list.length - 1 ? list[index + 1] : null
        };
    }

    /* カード枠外：左＝＜直近タイトル　右＝古いタイトル＞ */
    function fillNav(neighbors) {
        if (!nav) return;
        if (!neighbors || (!neighbors.newer && !neighbors.older)) {
            nav.hidden = true;
            nav.innerHTML = '';
            return;
        }
        var left = neighbors.newer
            ? '<a class="topic-detail-nav-prev" href="topic.html?id=' + encodeURIComponent(neighbors.newer.id) + '">' +
                '<span class="topic-detail-nav-mark" aria-hidden="true">＜</span>' +
                '<span class="topic-detail-nav-title">' + escapeHtml(neighbors.newer.title || '') + '</span></a>'
            : '<span class="topic-detail-nav-spacer" aria-hidden="true"></span>';
        var right = neighbors.older
            ? '<a class="topic-detail-nav-next" href="topic.html?id=' + encodeURIComponent(neighbors.older.id) + '">' +
                '<span class="topic-detail-nav-title">' + escapeHtml(neighbors.older.title || '') + '</span>' +
                '<span class="topic-detail-nav-mark" aria-hidden="true">＞</span></a>'
            : '<span class="topic-detail-nav-spacer" aria-hidden="true"></span>';
        nav.innerHTML = left + right;
        nav.hidden = false;
    }

    fetch('data/topics.json', { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(topics) {
            if (typeof setTopicListCache === 'function') setTopicListCache(topics);
            var item = (topics || []).find(function(topic) {
                return String(topic.id) === String(id);
            });
            var heading = document.querySelector('.page-content h1');
            if (!item) {
                if (heading) heading.textContent = 'お知らせ';
                detail.innerHTML = '<p>お知らせが見つかりませんでした。</p>';
                if (nav) {
                    nav.hidden = true;
                    nav.innerHTML = '';
                }
                return;
            }
            // 見出しは一覧と同じく「お知らせ」のみ（個別タイトルは出さない）
            if (heading) heading.textContent = 'お知らせ';
            document.title = (item.title || 'お知らせ') + ' | 志摩広域行政組合';

            var dateText = typeof formatDate === 'function' ? formatDate(item.date) : (item.date || '');
            var pastRecruit = typeof isPastRecruitTopic === 'function' && isPastRecruitTopic(item);
            var imageBlock = '';
            if (item.image) {
                if (pastRecruit) {
                    // 過去の求人：写真の中央に管理画面タイトルを出す
                    imageBlock =
                        '<div class="topic-detail-photo topic-detail-photo-recruit-past">' +
                            '<img class="topic-detail-image" src="' + encodeURI(item.image) + '" alt="' + escapeHtml(item.title) + '">' +
                            '<div class="topic-detail-recruit-past-center">' +
                                '<p class="topic-detail-recruit-past-title">' + escapeHtml(item.title || '') + '</p>' +
                            '</div>' +
                        '</div>';
                } else {
                    imageBlock = '<img class="topic-detail-image" src="' + encodeURI(item.image) + '" alt="' + escapeHtml(item.title) + '">';
                }
            } else if (pastRecruit) {
                imageBlock =
                    '<div class="topic-detail-photo topic-detail-photo-recruit-past topic-detail-photo-empty">' +
                        '<div class="topic-detail-recruit-past-center">' +
                            '<p class="topic-detail-recruit-past-title">' + escapeHtml(item.title || '') + '</p>' +
                        '</div>' +
                    '</div>';
            }

            var body = '';
            var more = '';
            if (!pastRecruit) {
                body = escapeHtml(item.description)
                    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>');
                more = escapeHtml(item.detail)
                    .replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '<br>');
            }

            detail.innerHTML =
                '<p class="topic-detail-meta">' +
                    '<span class="topic-date">' + escapeHtml(dateText) + '</span>' +
                    '<span class="topic-category category-' + categoryClass(item.category) + '">' + escapeHtml(item.category) + '</span>' +
                '</p>' +
                imageBlock +
                (body ? '<p class="topic-detail-body">' + body + '</p>' : '') +
                (more ? '<p class="topic-detail-more">' + more + '</p>' : '');

            // 詳細／過去の求人は、白いカードの枠外下に前後を置く
            var showNav = typeof opensTopicDetail === 'function'
                ? opensTopicDetail(item)
                : (typeof resolveLinkType !== 'function' || resolveLinkType(item) === 'detail');
            fillNav(showNav ? detailNeighbors(topics, item.id) : null);
        })
        .catch(function(err) {
            console.error(err);
            detail.innerHTML = '<p>お知らせを表示できませんでした。</p>';
            if (nav) {
                nav.hidden = true;
                nav.innerHTML = '';
            }
        });
})();
