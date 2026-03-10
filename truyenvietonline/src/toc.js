function execute(url) {
    let allChapters = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
        let pageUrl = url;
        if (page > 1) {
            pageUrl = url + "?chuong_page=" + page;
        }

        let response = fetch(pageUrl);
        if (!response.ok) break;

        let doc = response.html();

        doc.select(".chapter-list li h3 a").forEach(function (e) {
            allChapters.push({
                name: e.text(),
                url: e.attr("href"),
                host: "https://truyenvietonline.com"
            });
        });

        // Kiểm tra có trang tiếp theo không
        let nextPage = false;
        doc.select(".pagination a").forEach(function (e) {
            let href = e.attr("href");
            if (href && href.indexOf("chuong_page=" + (page + 1)) !== -1) {
                nextPage = true;
            }
        });

        if (nextPage) {
            page++;
        } else {
            hasNext = false;
        }
    }

    if (allChapters.length > 0) {
        return Response.success(allChapters);
    }
    return null;
}