function execute() {
    let response = fetch("https://truyenvietonline.com");
    if (response.ok) {
        let doc = response.html();
        let genre = [];
        let added = {};

        doc.select("a[href*='/the-loai/']").forEach(function (e) {
            let href = e.attr("href");
            let text = e.text().trim();
            if (text && !added[text] && href.indexOf("truyenvietonline.com") !== -1) {
                added[text] = true;
                genre.push({
                    title: text,
                    input: href,
                    script: "gen.js"
                });
            }
        });

        return Response.success(genre);
    }
    return null;
}