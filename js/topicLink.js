/**
 * お知らせ1件のクリック先
 * linkType が無い古いデータはカテゴリから決める
 * 求人行き先は、日付が一番新しい1件だけ遷移する
 */
var TOPIC_LINK_HREF = {
    recruit: 'other/recruitment.html',
    bid: 'other/nyusatu_info.html',
    reiki: 'other/reiki.html',
    gaiyo: 'other/kumiai_gaiyo.html',
    torikumi: 'other/shisetu_torikumi.html',
    contact: 'other/contact.html'
};

/* 求人の「直近」判定用（loadTopics / loadSlider が入れる） */
var TOPIC_LIST_CACHE = null;

function setTopicListCache(topics) {
    TOPIC_LIST_CACHE = Array.isArray(topics) ? topics : null;
}

function defaultLinkType(category) {
    if (category === '求人') return 'recruit';
    if (category === '入札') return 'bid';
    return 'detail';
}

function resolveLinkType(item) {
    var type = item && item.linkType;
    if (type === 'none' || type === 'detail' || TOPIC_LINK_HREF[type]) return type;
    return defaultLinkType(item && item.category);
}

/* 求人行き先のうち、日付が最新（同日なら id 大）の1件か */
function isLatestRecruitTopic(item, allTopics) {
    var list = allTopics || TOPIC_LIST_CACHE;
    if (!item || !list || !list.length) return true;
    var recruits = [];
    for (var i = 0; i < list.length; i++) {
        if (resolveLinkType(list[i]) === 'recruit') recruits.push(list[i]);
    }
    if (!recruits.length) return false;
    recruits.sort(function(a, b) {
        var da = new Date(b.date) - new Date(a.date);
        if (da !== 0) return da;
        return Number(b.id) - Number(a.id);
    });
    return String(recruits[0].id) === String(item.id);
}

/* 過去の求人（求人ページへは行かず、お知らせ詳細へ） */
function isPastRecruitTopic(item, allTopics) {
    return resolveLinkType(item) === 'recruit' && !isLatestRecruitTopic(item, allTopics);
}

/* お知らせ詳細ページを開く件か（詳細／過去の求人） */
function opensTopicDetail(item, allTopics) {
    var type = resolveLinkType(item);
    if (type === 'detail') return true;
    return isPastRecruitTopic(item, allTopics);
}

// サイトルートからの相対パス（トップ・お知らせページ共通）
function topicHref(item, allTopics) {
    var type = resolveLinkType(item);
    if (type === 'recruit') {
        // 直近だけ求人募集ページ。過去はお知らせ詳細へ（タイトル表示用）
        if (!isLatestRecruitTopic(item, allTopics)) {
            if (item && item.id != null) {
                return 'topic.html?id=' + encodeURIComponent(item.id);
            }
            return '';
        }
        return TOPIC_LINK_HREF.recruit;
    }
    if (TOPIC_LINK_HREF[type]) return TOPIC_LINK_HREF[type];
    if (type === 'detail' && item && item.id != null) {
        return 'topic.html?id=' + encodeURIComponent(item.id);
    }
    return '';
}
