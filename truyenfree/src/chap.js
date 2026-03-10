function execute(url) {
    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Theo phân tích DOM:
        let content = doc.select("#chapter-content").html();
        if (!content) content = doc.select(".chapter-content").html();

        // Remove qc hoặc tracking nếu có
        content = content.replace(/<script[^>]*>.*<\/script>/g, '');
        content = content.replace(/<style[^>]*>.*<\/style>/g, '');

        return Response.success(content);
    }
    return null;
}