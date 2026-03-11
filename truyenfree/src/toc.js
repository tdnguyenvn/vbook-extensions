function execute(url) {
    if (url.endsWith("/")) url = url.slice(0, -1);
    let response = fetch(url);
    if (!response.ok) return null;
    
    let doc = response.html();
    let htmlContent = doc.html();
    
    let bookId = extractBookId(htmlContent);
    if (!bookId) return Response.success([]);
    
    let chapters = fetchChaptersByAction(doc, url, bookId);
    if (!chapters || chapters.length === 0) {
        chapters = parseChaptersFromDOM(doc, url);
    }
    
    return Response.success(chapters);
}

function extractBookId(html) {
    // cover URL
    let coverMatch = html.match(/\/cover\/([a-f0-9]{24})\./);
    if (coverMatch) return coverMatch[1];
    
    // RSC payload (escaped)
    let rscMatch = html.match(/\\?"_id\\?":\\?"([a-f0-9]{24})\\?"/);
    if (rscMatch) return rscMatch[1];
    
    return "";
}

function fetchChaptersByAction(doc, url, bookId) {
    let scripts = doc.select("script[src*='/_next/static/chunks/']");
    let priorityChunks = [];
    for (let i = 0; i < scripts.size(); i++) {
        let src = scripts.get(i).attr("src");
        if (!src.includes("turbopack") && !src.includes("framework") && !src.includes("main-") && !src.includes("webpack-")) {
            priorityChunks.push(src);
        }
    }
    
    for (let src of priorityChunks) {
        if (src.startsWith("/")) src = "https://truyenfree.org" + src;
        try {
            let res = fetch(src);
            if (!res.ok) continue;
            let js = res.text();
            if (js.includes("actionGetChapters")) {
                let actionId = "";
                let m = js.match(/createServerReference\)\("([a-f0-9]{30,50})"[^"]*"actionGetChapters"/);
                if (m) actionId = m[1];
                else {
                    let m2 = js.match(/"([a-f0-9]{40,50})"[^"]*actionGetChapters/);
                    if (m2) actionId = m2[1];
                }
                
                if (actionId) {
                    let chapters = tryFetch(url, bookId, actionId);
                    if (chapters && chapters.length > 0) return chapters;
                }
            }
        } catch (e) {}
    }
    return [];
}

function tryFetch(url, bookId, actionId) {
    let resp = fetch(url, {
        method: "POST",
        headers: {
            "Next-Action": actionId,
            "Content-Type": "text/plain;charset=UTF-8"
        },
        body: '[{"bookId":"' + bookId + '","page":1,"limit":10000,"isNewest":false}]'
    });
    
    if (!resp.ok) return [];
    let text = resp.text();
    let lines = text.split('\n');
    let dataLine = lines.find(function(l) { return l.startsWith('1:'); });
    if (!dataLine) return [];
    
    try {
        let json = JSON.parse(dataLine.substring(2));
        let list = json.data || [];
        return list.map(function(ch) {
            return {
                name: ch.name,
                url: url + "/" + ch.slugId,
                host: "https://truyenfree.org"
            };
        });
    } catch (e) {
        return [];
    }
}

function parseChaptersFromDOM(doc, url) {
    let chapters = [];
    let elements = doc.select("a[href*='" + url.replace("https://truyenfree.org", "") + "/chuong-']");
    for (let i = 0; i < elements.size(); i++) {
        let el = elements.get(i);
        let name = el.text().trim();
        let href = el.attr("href");
        if (name && href) {
            if (href.startsWith("/")) href = "https://truyenfree.org" + href;
            chapters.push({
                name: name,
                url: href,
                host: "https://truyenfree.org"
            });
        }
    }
    return chapters;
}
