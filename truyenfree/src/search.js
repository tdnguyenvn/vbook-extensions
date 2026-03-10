function execute(key, page) {
    if (!page) page = '1';
    let url = "https://truyenfree.org/tim-kiem?keyword=" + key + "&page=" + page;

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];

        doc.select("div.flex.flex-row.items-start.gap-4, div.grid.grid-cols-12").forEach(function (e) {
            let aTitle = e.select("a[href^='/truyen/']").first();
            if (aTitle) {
                let name = aTitle.text();
                // If first link is an image with no text, find the next link
                if (!name) name = e.select("a[href^='/truyen/']").last().text();
                let link = aTitle.attr("href");
                if (link && link.startsWith("/")) link = "https://truyenfree.org" + link;

                let cover = e.select("img").attr("src");
                if (cover && cover.startsWith("/")) cover = "https://truyenfree.org" + cover;
                if (!cover) cover = "https://truyenfree.org/images/default-cover.png";

                let description = e.select("a[href*='/chuong-']").first().text();
                if (!description) description = "Chương mới";

                novelList.push({
                    name: name,
                    link: link,
                    cover: cover,
                    description: description,
                    host: "https://truyenfree.org"
                });
            }
        });

        let next = null;
        let pNext = parseInt(page) + 1;
        let hasNext = doc.select("a[href*='page=" + pNext + "']");
        if (hasNext.size() > 0) {
            next = pNext.toString();
        }

        return Response.success(novelList, next);
    }
    return null;
}
