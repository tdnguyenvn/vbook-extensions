function execute(url) {
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Tên truyện từ h1
        let name = doc.select("h1").text();

        // Ảnh bìa từ .thumb .book img
        let cover = doc.select(".thumb .book img").attr("src");

        // Tác giả - nằm trong .thumb .list chứa icon fa-user
        let author = "";
        doc.select(".thumb .list").forEach(function (e) {
            if (e.html().indexOf("fa-user") !== -1) {
                author = e.select("a").text();
            }
        });

        // Mô tả - nằm trong .desc
        let description = doc.select(".desc").html();
        if (!description) {
            description = doc.select(".info").html();
        }

        // Chi tiết (thể loại + tác giả)
        let detail = "";
        doc.select(".thumb .list").forEach(function (e) {
            detail += e.html() + "<br>";
        });

        return Response.success({
            name: name,
            cover: cover,
            host: "https://truyenvietonline.com",
            author: author,
            description: description,
            detail: detail
        });
    }
    return null;
}