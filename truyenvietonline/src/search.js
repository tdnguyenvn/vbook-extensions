function execute(key, page) {
    if (!page) page = '1';

    let url = "https://truyenvietonline.com/?s=" + key;
    if (parseInt(page) > 1) {
        url = "https://truyenvietonline.com/page/" + page + "/?s=" + key;
    }

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        let novelList = [];
        doc.select(".box-manga__item").forEach(function (e) {
            let nameEl = e.select("h3 a");
            let imgEl = e.select("img");
            let chapEl = e.select("p a");

            novelList.push({
                name: nameEl.text(),
                link: nameEl.attr("href"),
                cover: imgEl.attr("src"),
                description: chapEl.text(),
                host: "https://truyenvietonline.com"
            });
        });

        // Kiểm tra phân trang
        let next = null;
        let nextPage = parseInt(page) + 1;
        doc.select(".pagination a, .page-numbers a").forEach(function (e) {
            let href = e.attr("href");
            if (href && href.indexOf("/page/" + nextPage + "/") !== -1) {
                next = String(nextPage);
            }
        });

        return Response.success(novelList, next);
    }
    return null;
}
