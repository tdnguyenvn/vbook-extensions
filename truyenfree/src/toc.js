function execute(url) {
    if (url.endsWith("/")) url = url.slice(0, -1);

    let response = fetch(url);
    if (!response.ok) return null;

    let doc = response.html();
    let chapters = [];
    let added = {};

    let htmlContent = doc.html();

    // 1. Tìm bookId từ RSC payload
    let bookId = extractBookId(htmlContent);

    if (bookId) {
        // 2. Tìm action IDs và thử gọi để lấy chapters
        chapters = fetchChaptersByAction(doc, url, bookId, added);
    }

    // 3. Fallback: Lấy chương từ DOM elements
    if (chapters.length === 0) {
        chapters = parseChaptersFromDOM(doc, url, added);
    }

    return Response.success(chapters);
}

/**
 * Trích xuất bookId từ HTML content (RSC payload)
 */
function extractBookId(htmlContent) {
    // RSC payload format: \\\"book\\\":{\\\"_id\\\":\\\"<24hex>\\\"
    var patterns = [
        /\\\\?"book\\\\?":\{\\\\?"_id\\\\?":\\\\?"([a-f0-9]{24})\\\\?"/,
        /"book":\{"_id":"([a-f0-9]{24})"/,
        /\\\\?"bookId\\\\?":\\\\?"([a-f0-9]{24})\\\\?"/,
        /"bookId":"([a-f0-9]{24})"/
    ];
    for (var i = 0; i < patterns.length; i++) {
        var match = htmlContent.match(patterns[i]);
        if (match) return match[1];
    }
    return "";
}

/**
 * Tìm action IDs từ JS chunks và gọi POST để lấy chapters.
 * Chỉ tải các chunk chứa createServerReference.
 * Dừng ngay khi tìm được action ID trả về chapters.
 */
function fetchChaptersByAction(doc, url, bookId, added) {
    var chapters = [];
    var scripts = doc.select("script[src*='/_next/static/chunks/']");
    var testedIds = {};

    // Duyệt qua từng chunk script
    var scriptList = [];
    scripts.forEach(function (script) {
        scriptList.push(script.attr("src"));
    });

    for (var s = 0; s < scriptList.length; s++) {
        var src = scriptList[s];
        if (src.startsWith("/")) src = "https://truyenfree.org" + src;

        try {
            var jsResponse = fetch(src);
            if (!jsResponse.ok) continue;

            var jsText = jsResponse.text();

            // Chỉ xử lý chunks có chứa createServerReference
            if (jsText.indexOf("createServerReference") === -1) continue;

            // Trích xuất action IDs
            var actionRegex = /createServerReference\)?\("([a-f0-9]{30,50})"/g;
            var match;
            while ((match = actionRegex.exec(jsText)) !== null) {
                var actionId = match[1];
                if (testedIds[actionId]) continue;
                testedIds[actionId] = true;

                // Thử gọi action này
                chapters = tryFetchChapters(url, actionId, bookId, added);
                if (chapters.length > 0) {
                    return chapters; // Tìm được! Trả về ngay
                }
            }
        } catch (e) {
            // Bỏ qua chunk lỗi
        }
    }

    return chapters;
}

/**
 * Thử gọi server action với actionId để lấy chapters
 */
function tryFetchChapters(url, actionId, bookId, added) {
    try {
        var response = fetch(url, {
            method: "POST",
            headers: {
                "next-action": actionId,
                "content-type": "text/plain;charset=UTF-8",
                "accept": "text/x-component"
            },
            body: JSON.stringify([{ "bookId": bookId, "page": 1, "limit": 1000000000, "isNewest": false }])
        });

        if (!response.ok) return [];

        var resText = response.text();

        // Kiểm tra response có chứa dữ liệu chương
        if (resText.indexOf('"slugId"') === -1 || resText.indexOf('"number"') === -1) {
            return [];
        }

        return parseChaptersFromResponse(resText, url, added);
    } catch (e) {
        return [];
    }
}

/**
 * Parse chapters từ response text của server action
 */
function parseChaptersFromResponse(resText, url, added) {
    var chapters = [];
    var tempChapters = [];
    var objRegex = /\{[^}]*"slugId":"([^"]+)"[^}]*\}/g;
    var match;
    while ((match = objRegex.exec(resText)) !== null) {
        var objStr = match[0];
        var cSlugMatch = objStr.match(/"slugId":"([^"]+)"/);
        var cNumMatch = objStr.match(/"number":(\d+)/);
        var cTitleMatch = objStr.match(/"name":"([^"]+)"/);
        if (cSlugMatch && cNumMatch && cTitleMatch) {
            var cSlug = cSlugMatch[1];
            var cNum = parseInt(cNumMatch[1]);
            var cTitle = cTitleMatch[1];
            var link = url + "/" + cSlug;

            if (!added[link]) {
                added[link] = true;
                tempChapters.push({
                    number: cNum,
                    name: cTitle,
                    url: link,
                    host: "https://truyenfree.org"
                });
            }
        }
    }

    tempChapters.sort(function (a, b) { return a.number - b.number; });

    tempChapters.forEach(function (c) {
        chapters.push({
            name: c.name,
            url: c.url,
            host: c.host
        });
    });

    return chapters;
}

/**
 * Parse chapters từ DOM (fallback)
 */
function parseChaptersFromDOM(doc, url, added) {
    var chapters = [];
    var chapterElements = doc.select("a[href*='/chuong-']");

    chapterElements.forEach(function (e) {
        var link = e.attr("href");
        if (link.startsWith("/")) link = "https://truyenfree.org" + link;
        if (link.indexOf("/truyen/") !== -1 && !added[link]) {
            added[link] = true;
            var name = e.select("span").first() ? e.select("span").first().text() : e.text();
            chapters.push({
                name: name.trim(),
                url: link,
                host: "https://truyenfree.org"
            });
        }
    });

    return chapters;
}
