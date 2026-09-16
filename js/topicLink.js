/**
 * お知らせ1件のクリック先
 * linkType が無い古いデータはカテゴリから決める
 */
var TOPIC_LINK_HREF = {
    recruit: 'other/recruitment.html',
    bid: 'other/nyusatu_info.html',
    reiki: 'other/reiki.html',
    gaiyo: 'other/kumiai_gaiyo.html',
    torikumi: 'other/shisetu_torikumi.html',
    contact: 'other/contact.html'
};

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

// サイトルートからの相対パス（トップ・お知らせページ共通）
function topicHref(item) {
    var type = resolveLinkType(item);
    if (TOPIC_LINK_HREF[type]) return TOPIC_LINK_HREF[type];
    if (type === 'detail' && item && item.id != null) {
        return 'topic.html?id=' + encodeURIComponent(item.id);
    }
    return '';
}
