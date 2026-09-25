<?php
/**
 * Google 向けサイトマップ。今見ているドメインで URL を組み立てる
 */
header('Content-Type: application/xml; charset=UTF-8');
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
$base = ($https ? 'https' : 'http') . '://' . $host;

$pages = array(
    '/',
    '/index.html',
    '/facility_list.html',
    '/usageFlow.html',
    '/topic.html',
    '/other.html',
    '/other/contact.html',
    '/other/recruitment.html',
    '/other/nyusatu_info.html',
    '/other/reiki.html',
    '/other/kaikei.html',
    '/other/kumiai_gaiyo.html',
    '/other/shisetu_torikumi.html',
    '/facilities/sainiwa/sainwa.html',
    '/facilities/sainiwa/sainiwaPict.html',
    '/facilities/sainiwa/usageFlow.html',
    '/facilities/sainiwa/importantNotes.html',
    '/facilities/tomoyama/tomoyama.html',
    '/facilities/tomoyama/tomoyamaPict.html',
    '/facilities/tomoyama/usageFlow.html',
    '/facilities/tomoyama/importantNotes.html',
    '/facilities/hanazono/hanazono.html',
    '/facilities/hanazono/hanazonoPict.html',
    '/facilities/hanazono/usageFlow.html',
    '/facilities/fukushi_center/fukushi_center.html',
    '/facilities/fukushi_center/usageFlow.html',
    '/facilities/fukushi_center/importantNotes.html',
);

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($pages as $path) {
    $loc = htmlspecialchars($base . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    echo "  <url><loc>{$loc}</loc></url>\n";
}
echo '</urlset>';
