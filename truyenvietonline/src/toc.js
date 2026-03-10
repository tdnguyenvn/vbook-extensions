function execute(url) {
    var allChapters = [];

    // Đảm bảo URL kết thúc bằng /
    if (!url.endsWith("/")) {
        url = url + "/";
    }

    // Lấy trang đầu tiên
    var response = fetch(url);
    if (!response.ok) return null;

    var doc = response.html();

    // Trang có 2 .chapter-list:
    // - "Chương mới nhất" (4 chương)
    // - "Danh sách chương" đầy đủ
    // Lấy danh sách cuối cùng bằng .last()
    var chapterLists = doc.select("ul.chapter-list");
    var mainList = chapterLists.last();
    if (mainList != null) {
        var items = mainList.select("li a");
        for (var i = 0; i < items.size(); i++) {
            var e = items.get(i);
            allChapters.push({
                name: e.text(),
                url: e.attr("href"),
                host: "https://truyenvietonline.com"
            });
        }
    }

    // Tìm tổng số trang từ pagination
    var maxPage = 1;
    var pagEls = doc.select(".pagination a");
    for (var j = 0; j < pagEls.size(); j++) {
        var href = pagEls.get(j).attr("href");
        if (href && href.indexOf("chuong_page=") > -1) {
            var idx = href.indexOf("chuong_page=") + 12;
            var numStr = "";
            while (idx < href.length && href.charAt(idx) >= '0' && href.charAt(idx) <= '9') {
                numStr += href.charAt(idx);
                idx++;
            }
            var p = parseInt(numStr);
            if (p > maxPage) maxPage = p;
        }
    }

    // Lấy các trang tiếp theo
    for (var page = 2; page <= maxPage; page++) {
        var pageResponse = fetch(url + "?chuong_page=" + page);
        if (!pageResponse.ok) break;

        var pageDoc = pageResponse.html();
        var pageLists = pageDoc.select("ul.chapter-list");
        var pageMainList = pageLists.last();
        if (pageMainList != null) {
            var pageItems = pageMainList.select("li a");
            for (var k = 0; k < pageItems.size(); k++) {
                var pe = pageItems.get(k);
                allChapters.push({
                    name: pe.text(),
                    url: pe.attr("href"),
                    host: "https://truyenvietonline.com"
                });
            }
        }
    }

    if (allChapters.length > 0) {
        return Response.success(allChapters);
    }
    return null;
}