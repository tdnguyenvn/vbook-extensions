function execute(url) {
    let response = fetch(url);
    if (response.ok) {
        return Response.success(response.html().select("#chapter-content").html());
    }
    return null;
}