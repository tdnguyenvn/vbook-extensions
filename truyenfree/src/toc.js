function execute(url) {
    if (url.endsWith("/")) url = url.slice(0, -1);

    var response = fetch(url);
    if (!response.ok) return null;

    var doc = response.html();
    var htmlContent = doc.html();

    // 1. Tìm bookId
    var bookId = extractBookId(htmlContent);
    if (!bookId) return Response.success([]);

    // 2. Thử gọi POST với action ID đã biết
    var knownActionIds = [
        "4008c0dece1cbf808d489e298a56b9bfec70e43879"
    ];

    var chapters = [];
    for (var i = 0; i < knownActionIds.length; i++) {
        chapters = tryFetchChapters(url, bookId, knownActionIds[i]);
        if (chapters.length > 0) return Response.success(chapters);
    }

    // 3. Nếu action ID cũ hết hạn, tìm action ID mới từ JS chunks
    var dynamicId = findActionIdFromChunks(doc);
    if (dynamicId) {
        chapters = tryFetchChapters(url, bookId, dynamicId);
        if (chapters.length > 0) return Response.success(chapters);
    }

    // 4. Fallback cuối: parse từ DOM
    chapters = parseChaptersFromDOM(doc, url);
    return Response.success(chapters);
}

/**
 * Trích xuất bookId từ HTML
 */
function extractBookId(html) {
    // Cách 1: Từ cover image URL /cover/<24hex>.
    var coverMatch = html.match(/\/cover\/([a-f0-9]{24})\./);
    if (coverMatch) return coverMatch[1];

    // Cách 2: Từ RSC payload escaped: \"_id\":\"<24hex>\"
    var rscMatch = html.match(/\\"_id\\":\\"([a-f0-9]{24})\\"/);
    if (rscMatch) return rscMatch[1];

    // Cách 3: Từ bookId trực tiếp
    var bookIdMatch = html.match(/\\"bookId\\":\\"([a-f0-9]{24})\\"/);
    if (bookIdMatch) return bookIdMatch[1];

    return "";
}

/**
 * Gọi POST server action và parse JSON response
 */
function tryFetchChapters(url, bookId, actionId) {
    try {
        var resp = fetch(url, {
            method: "POST",
            headers: {
                "Next-Action": actionId,
                "Content-Type": "text/plain;charset=UTF-8"
            },
            body: '[{"bookId":"' + bookId + '","page":1,"limit":100000,"isNewest":false}]'
        });

        if (!resp.ok) return [];

        var text = resp.text();

        // Response RSC format: nhiều dòng, dòng "1:" chứa JSON data
        var chapters = parseRSCResponse(text, url);
        if (chapters.length > 0) return chapters;

        // Fallback: thử regex parse nếu JSON.parse thất bại
        return parseChaptersByRegex(text, url);
    } catch (e) {
        return [];
    }
}

/**
 * Parse RSC response: Tìm dòng "1:" rồi JSON.parse
 */
function parseRSCResponse(text, url) {
    var chapters = [];
    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf("1:") === 0) {
            try {
                var jsonStr = line.substring(2);
                var json = JSON.parse(jsonStr);
                var data = json.data;
                if (data && data.length > 0) {
                    // Sắp xếp theo number
                    data.sort(function(a, b) { return a.number - b.number; });
                    for (var j = 0; j < data.length; j++) {
                        var ch = data[j];
                        if (ch.slugId && ch.name) {
                            chapters.push({
                                name: ch.name,
                                url: url + "/" + ch.slugId,
                                host: "https://truyenfree.org"
                            });
                        }
                    }
                    return chapters;
                }
            } catch (e) {
                // JSON.parse failed, sẽ fallback sang regex
            }
        }
    }
    return chapters;
}

/**
 * Fallback regex parse cho trường hợp JSON.parse thất bại
 */
function parseChaptersByRegex(text, url) {
    var chapters = [];
    var tempChapters = [];
    var added = {};

    var regex = /"slugId":"([^"]+)"/g;
    var numRegex = /"number":(\d+)/g;
    var nameRegex = /"name":"([^"]+)"/g;

    // Tìm tất cả slugId
    var objRegex = /\{[^}]*"slugId":"([^"]+)"[^}]*\}/g;
    var match;
    while ((match = objRegex.exec(text)) !== null) {
        var objStr = match[0];
        var slugMatch = objStr.match(/"slugId":"([^"]+)"/);
        var numMatch = objStr.match(/"number":(\d+)/);
        var nameMatch = objStr.match(/"name":"([^"]+)"/);
        if (slugMatch && numMatch && nameMatch) {
            var slug = slugMatch[1];
            var link = url + "/" + slug;
            if (!added[link]) {
                added[link] = true;
                tempChapters.push({
                    number: parseInt(numMatch[1]),
                    name: nameMatch[1],
                    url: link,
                    host: "https://truyenfree.org"
                });
            }
        }
    }

    tempChapters.sort(function(a, b) { return a.number - b.number; });
    for (var i = 0; i < tempChapters.length; i++) {
        chapters.push({
            name: tempChapters[i].name,
            url: tempChapters[i].url,
            host: tempChapters[i].host
        });
    }
    return chapters;
}

/**
 * Tìm action ID cho chapters từ JS chunks (khi hardcoded ID hết hạn)
 * Tìm "actionGetChapters" label trong createServerReference
 */
function findActionIdFromChunks(doc) {
    var scripts = doc.select("script[src*='/_next/static/chunks/']");
    for (var i = 0; i < scripts.size(); i++) {
        var src = scripts.get(i).attr("src");
        // Bỏ qua framework/system chunks
        if (src.indexOf("turbopack") !== -1) continue;
        if (src.indexOf("framework") !== -1) continue;
        if (src.indexOf("main-") !== -1) continue;
        if (src.indexOf("webpack-") !== -1) continue;

        if (src.indexOf("/") === 0) src = "https://truyenfree.org" + src;

        try {
            var jsResp = fetch(src);
            if (!jsResp.ok) continue;
            var jsText = jsResp.text();

            // Tìm actionGetChapters
            if (jsText.indexOf("actionGetChapters") === -1) continue;

            // Trích xuất action ID gần actionGetChapters
            var actionMatch = jsText.match(/createServerReference\)\("([a-f0-9]{30,50})"[^"]*"actionGetChapters"/);
            if (actionMatch) return actionMatch[1];

            // Thử pattern rộng hơn
            var broadMatch = jsText.match(/"([a-f0-9]{40,50})"[^"]*actionGetChapters/);
            if (broadMatch) return broadMatch[1];
        } catch (e) {
            // Bỏ qua lỗi
        }
    }
    return "";
}

/**
 * Parse chapters từ DOM HTML (fallback cuối cùng, chỉ lấy ít chương có sẵn)
 */
function parseChaptersFromDOM(doc, url) {
    var chapters = [];
    var added = {};
    var elements = doc.select("a[href*='/chuong-']");
    for (var i = 0; i < elements.size(); i++) {
        var el = elements.get(i);
        var href = el.attr("href");
        if (href.indexOf("/") === 0) href = "https://truyenfree.org" + href;
        if (href.indexOf("/truyen/") !== -1 && !added[href]) {
            added[href] = true;
            var name = el.text().trim();
            if (name) {
                chapters.push({
                    name: name,
                    url: href,
                    host: "https://truyenfree.org"
                });
            }
        }
    }
    return chapters;
}
