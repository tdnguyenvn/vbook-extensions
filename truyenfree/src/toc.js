function execute(url) {
    if (url.endsWith("/")) url = url.slice(0, -1);

    let response = fetch(url);
    if (!response.ok) return null;

    let doc = response.html();
    let chapters = [];
    let added = {};

    // Danh sách CSS selector
    doc.select("a[href*='/chuong-']").forEach(function (e) {
        let link = e.attr("href");
        if (link.startsWith("/")) link = "https://truyenfree.org" + link;

        if (link.indexOf("/truyen/") !== -1 && !added[link]) {
            added[link] = true;
            let name = e.select("span").first().text();
            if (!name) name = e.text();

            chapters.push({
                name: name.trim(),
                url: link,
                host: "https://truyenfree.org"
            });
        }
    });

    // Thử trích xuất từ nội dung window.__NEXT_DATA__ 
    let nextData = doc.select("#__NEXT_DATA__").html();
    if (nextData && chapters.length < 50) {
        // Có thể CSR chỉ load 10 chương đầu, data toàn bộ ở JSON
        try {
            let json = JSON.parse(nextData);

            // Tìm trong json.props.pageProps...
            // Hoặc dùng regex để extract slug và name
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

    return Response.success(chapters);
}