function execute(url) {
    let allChapters = [];

    // Đảm bảo URL kết thúc bằng /
    if (!url.endsWith("/")) {
        url = url + "/";
    }

    // Lấy trang đầu tiên
    let response = fetch(url);
    if (!response.ok) return null;

    let doc = response.html();

    // Lấy danh sách chương từ #dschuong (tránh lấy nhầm "Chương mới nhất")
    doc.select("#dschuong .chapter-list li a").forEach(function (e) {
        allChapters.push({
            name: e.text(),
            url: e.attr("href"),
            host: "https://truyenvietonline.com"
        });
    });

    // Tìm tổng số trang từ pagination
    let maxPage = 1;
    doc.select(".pagination a").forEach(function (e) {
        let href = e.attr("href");
        if (href) {
            let match = href.match(/chuong_page=(\d+)/);
            if (match) {
                let p = parseInt(match[1]);
                if (p > maxPage) maxPage = p;
            }
        }
    });

    // Lấy các trang tiếp theo
    for (let page = 2; page <= maxPage; page++) {
        let pageResponse = fetch(url + "?chuong_page=" + page);
        if (!pageResponse.ok) break;

        let pageDoc = pageResponse.html();
        pageDoc.select("#dschuong .chapter-list li a").forEach(function (e) {
            allChapters.push({
                name: e.text(),
                url: e.attr("href"),
                host: "https://truyenvietonline.com"
            });
        });
    }

    if (allChapters.length > 0) {
        return Response.success(allChapters);
    }
    return null;
}