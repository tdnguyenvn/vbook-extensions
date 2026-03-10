function execute(url) {
    if (url.endsWith("/")) url = url.slice(0, -1);

    let response = fetch(url);
    if (!response.ok) return null;

    let doc = response.html();
    let chapters = [];
    let added = {};

    let htmlContent = doc.html();

    // 1. Cố gắng bóc tách bookId từ nội dung trang
    let bookIdMatch = htmlContent.match(/"bookId":"([a-f0-9]+)"/);
    if (bookIdMatch) {
        let bookId = bookIdMatch[1];
        let nextActionId = "4008c0dece1cbf808d489e298a56b9bfec70e43879"; // ID server action lấy danh sách chương

        let chaptersResponse = fetch(url, {
            method: "POST",
            headers: {
                "next-action": nextActionId,
                "content-type": "text/plain;charset=UTF-8",
                "accept": "text/x-component"
            },
            body: JSON.stringify([{ "bookId": bookId, "page": 1, "limit": 1000000000, "isNewest": false }])
        });

        if (chaptersResponse.ok) {
            let resText = chaptersResponse.text();
            let regex = /"slugId":"([^"]+)","number":(\d+),"bookId":"[^"]+","name":"([^"]+)"/g;
            let match;

            // Collect all into array to sort them just in case
            let tempChapters = [];
            while ((match = regex.exec(resText)) !== null) {
                let cSlug = match[1];
                let cNum = parseInt(match[2]);
                let cTitle = match[3];
                let link = url + "/" + cSlug;

                if (!added[link]) {
                    added[link] = true;
                    tempChapters.push({
                        number: cNum,
                        name: cTitle, // Giải mã tiếng Việt nếu bị lỗi (Regex text thường đã giải mã)
                        url: link,
                        host: "https://truyenfree.org"
                    });
                }
            }

            // Sắp xếp theo number
            tempChapters.sort(function (a, b) { return a.number - b.number; });

            // Push vào chapters chính
            tempChapters.forEach(function (c) {
                chapters.push({
                    name: c.name,
                    url: c.url,
                    host: c.host
                });
            });
        }
    }

    // 2. Fallback dự phòng: Lấy danh sách chương có trong HTML nếu Action lỗi hoặc không tìm thấy bookId
    if (chapters.length === 0) {
        doc.select("a[href*='/chuong-']").forEach(function (e) {
            let link = e.attr("href");
            if (link.startsWith("/")) link = "https://truyenfree.org" + link;
            if (link.indexOf("/truyen/") !== -1 && !added[link]) {
                added[link] = true;
                let name = e.select("span").first() ? e.select("span").first().text() : e.text();

                chapters.push({
                    name: name.trim(),
                    url: link,
                    host: "https://truyenfree.org"
                });
            }
        });
    }

    // JSON extract fallback từ doc (Chỉ dành cho NextJS map cơ bản nếu có)
    if (chapters.length < 50 && htmlContent.indexOf("__NEXT_DATA__") !== -1) {
        let nextData = doc.select("#__NEXT_DATA__").html();
        if (nextData) {
            try {
                let regex = /"slug":"(chuong-[^"]+)","(name|title)":"([^"]+)"/g;
                let match;
                while ((match = regex.exec(nextData)) !== null) {
                    let cSlug = match[1];
                    let cTitle = match[3];
                    let link = url + "/" + cSlug;

                    if (!added[link]) {
                        added[link] = true;
                        chapters.push({
                            name: cTitle,
                            url: link,
                            host: "https://truyenfree.org"
                        });
                    }
                }
            } catch (e) { }
        }
    }

    return Response.success(chapters);
}
