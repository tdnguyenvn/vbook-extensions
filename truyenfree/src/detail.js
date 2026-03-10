function execute(url) {
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        let name = doc.select("h1").first().text();

        // Ảnh bìa
        let cover = doc.select("img[src*='/storage/images/']").first().attr("src");
        if (!cover) cover = doc.select("img").first().attr("src");
        if (cover && cover.startsWith("/")) cover = "https://truyenfree.org" + cover;

        // Tác giả
        let author = doc.select("a[href^='/tac-gia/']").first().text();
        if (!author) author = "Đang cập nhật";

        // Mô tả - Subagent cho biết nội dung sau chữ GIỚI THIỆU
        // Dùng .html() của div kế tiếp h2 chữ GIỚI THIỆU
        let description = doc.select("h2:contains(GIỚI THIỆU) ~ div").first().html();
        if (!description) {
            description = doc.select("div:has(> p)").first().html();
        }
        if (!description) {
            description = doc.select(".description").html() || "Không có giới thiệu";
        }

        // Chi tiết
        let detail = "Tác giả: " + author + "<br>Thể loại: ";
        doc.select("a[href^='/danh-sach/']").forEach(function (e) {
            detail += e.text() + " ";
        });

        // Khắc phục lỗi trả về author "" nếu không lấy được
        return Response.success({
            name: name,
            cover: cover,
            host: "https://truyenfree.org",
            author: author,
            description: description,
            detail: detail
        });
    }
    return null;
}