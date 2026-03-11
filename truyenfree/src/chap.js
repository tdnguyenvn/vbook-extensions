function execute(url) {
    var response = fetch(url);
    if (response.ok) {
        var doc = response.html();

        // Nội dung chương nằm trong thẻ <article>
        var content = doc.select("article").first();
        if (content) {
            var html = content.html();
            // Remove script/style tags
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            return Response.success(html);
        }

        // Fallback: thử các selector khác
        content = doc.select("#chapter-content").first();
        if (!content) content = doc.select(".chapter-content").first();
        if (content) {
            return Response.success(content.html());
        }
    }
    return null;
}