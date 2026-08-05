const config = require("./config");
const utils = require("./utils");
const WordPress = require("./wordpress");

class Crawler {

    constructor(page) {

        this.page = page;

        this.wordpress = new WordPress(page);

        this.queue = [];

        this.visited = new Set();

        this.pages = [];

        this.pageMap = new Map();

        this.nextId = 1;

    }

    async crawl() {

        console.log("");
        console.log("Starting crawl...");
        console.log("");

        const crawlStarted = Date.now();

        await this.wordpress.initialise();

        this.queue.push({

            url: config.startUrl,

            parent: null,

            depth: 0

        });

        // TEST LIMIT
        // Change "< 5" to whatever you like whilst testing. && this.pages.length < 10
        while (this.queue.length > 0) {

            const current = this.queue.shift();

            const url = utils.normaliseUrl(current.url);

            if (this.visited.has(url)) {
                continue;
            }

            this.visited.add(url);

            const pageData = await this.visitPage(

                url,

                current.parent,

                current.depth

            );

            if (!pageData) {
                continue;
            }

            this.pages.push(pageData);

            this.pageMap.set(pageData.url, pageData);

            const displayType = pageData.contentType || "Failed";

            console.log(
                `[${this.pages.length}] ${pageData.statusCode || "-"} | ${displayType} | Depth ${pageData.depth} | ${pageData.title}`
            );

            for (const link of pageData.internalLinks) {

                const normalised = utils.normaliseUrl(link);

                if (!utils.isInternal(normalised)) {
                    continue;
                }

                if (utils.shouldIgnore(normalised)) {
                    continue;
                }

                if (this.visited.has(normalised)) {
                    continue;
                }

                this.queue.push({

                    url: normalised,

                    parent: pageData.url,

                    depth: pageData.depth + 1

                });

            }

        }

        this.buildHierarchy();
        this.buildIncomingLinks();

        const crawlDuration = Date.now() - crawlStarted;

        const crawlSummary = this.printSummary(crawlDuration);

        return {
            pages: this.pages,
            summary: crawlSummary
        };

    }

    async visitPage(url, parent, depth) {

        const started = Date.now();

        let response = null;

        let statusCode = null;

        let statusText = "";

        try {

            response = await this.page.goto(url, {

                waitUntil: "networkidle",

                timeout: config.timeout

            });

            if (response) {

                statusCode = response.status();

                statusText = response.statusText();

            }

            const finalUrl = utils.normaliseUrl(this.page.url());

            const redirected = finalUrl !== url;

            const redirectTarget = redirected ? finalUrl : null;

            let title = await this.page.title();

            if (
                (!title || title === "(Untitled)" || title.trim() === "") &&
                finalUrl.toLowerCase().endsWith(".pdf")
            ) {
                title = decodeURIComponent(
                    finalUrl.split("/").pop().split("?")[0]
                );
            }

            const wp = await this.wordpress.getPageData(finalUrl);

            const bodyClass = await this.page.evaluate(() => document.body.className);

            const links = await this.extractLinks();

            const internalLinks = [];

            const externalLinks = [];

            let pdfCount = 0;

            for (const link of links) {

                const normalised = utils.normaliseUrl(link);

                if (utils.isInternal(normalised)) {

                    if (!utils.shouldIgnore(normalised)) {

                        internalLinks.push(normalised);

                    }

                    if (normalised.toLowerCase().endsWith(".pdf")) {

                        pdfCount++;

                    }

                } else {

                    externalLinks.push(normalised);

                }

            }

            const imageCount = await this.page.$$eval(

                "img",

                images => images.length

            );

                        return {

                id: this.nextId++,

                title: title || "(Untitled)",

                url: finalUrl,

                finalUrl,

                parent,

                children: [],

                depth,

                contentType:
                statusCode === 200
                    ? utils.pageType(finalUrl, bodyClass)
                    : "Failed",

                slug: wp?.slug || null,
                wordpressStatus: wp?.status || null,
                lastModified: wp?.modified || null,
                published: wp?.date || null,
                authorId: wp?.author || null,
                wordpressType: wp?.type || null,

                statusCode,

                statusText,

                redirected,

                redirectTarget,

                crawlTime: Date.now() - started,

                internalLinks: [...new Set(internalLinks)],

                externalLinks: [...new Set(externalLinks)],

                imageCount,

                pdfCount,

                visited: true,

                error: null

            };

        } catch (err) {

            return {

                id: this.nextId++,

                title: "(Failed)",

                url,

                finalUrl: url,

                parent,

                children: [],

                depth,

                contentType: "Failed",

                statusCode,

                statusText,

                redirected: false,

                redirectTarget: null,

                crawlTime: Date.now() - started,

                internalLinks: [],

                externalLinks: [],

                imageCount: 0,

                pdfCount: 0,

                visited: false,

                error: err.message

            };

        }

    }

    async extractLinks() {

        const links = await this.page.$$eval(
            "a",
            anchors => anchors
                .map(anchor => anchor.href)
                .filter(Boolean)
        );

        return [...new Set(links)];

    }

    buildHierarchy() {

        for (const page of this.pages) {

            if (!page.parent) {
                continue;
            }

            const parent = this.pageMap.get(page.parent);

            if (parent) {

                parent.children.push(page);

            }

        }

    }

    buildIncomingLinks() {

    // Initialise
    for (const page of this.pages) {

        page.incomingLinks = [];
        page.incomingLinkCount = 0;
        page.outgoingLinkCount = page.internalLinks.length;

    }

    // Populate incoming links
    for (const page of this.pages) {

        for (const link of page.internalLinks) {

            const target = this.pageMap.get(link);

            if (!target) continue;

            target.incomingLinks.push(page.url);

        }

    }

    // Final counts
    for (const page of this.pages) {

        page.incomingLinks = [...new Set(page.incomingLinks)];
        page.incomingLinkCount = page.incomingLinks.length;
        page.orphan =
            page.incomingLinkCount === 0 &&
            page.parent === null;

    }

}

    printSummary(crawlDuration) {

        const successful = this.pages.filter(page => page.visited).length;

        const failed = this.pages.filter(page => !page.visited).length;

        const redirects = this.pages.filter(page => page.redirected).length;

        const orphanPages = this.pages.filter(page => page.orphan).length;

        const totalImages = this.pages.reduce(
            (total, page) => total + page.imageCount,
            0
        );

        const totalPDFs = this.pages.reduce(
            (total, page) => total + page.pdfCount,
            0
        );

        const totalInternalLinks = this.pages.reduce(
            (total, page) => total + page.internalLinks.length,
            0
        );

        const totalExternalLinks = this.pages.reduce(
            (total, page) => total + page.externalLinks.length,
            0
        );

        const averageLoad = this.pages.length
            ? Math.round(
                this.pages.reduce(
                    (total, page) => total + page.crawlTime,
                    0
                ) / this.pages.length
            )
            : 0;

        const crawlSummary = {
            
            website: config.startUrl,
            websiteName: new URL(config.startUrl).hostname,
            crawlDate: new Date().toISOString(),
            crawlDuration: crawlDuration,
            pagesDiscovered: this.pages.length,
            pagesSuccessful: successful,
            pagesFailed: failed,
            redirectsEncountered: redirects,
            orphanPages: orphanPages,
            imagesFound: totalImages,
            pdfLinksFound: totalPDFs,
            internalLinksFound: totalInternalLinks,
            externalLinksFound: totalExternalLinks,
            averageLoad: averageLoad
        };

        console.log("");
        console.log("========================================");
        console.log(" ClubHub Insight Crawl Statistics");
        console.log("========================================");
        console.log(`Pages Discovered           : ${crawlSummary.pagesDiscovered}`);
        console.log(`Pages Crawled Successfully : ${crawlSummary.pagesSuccessful}`);
        console.log(`Pages Failed to Crawl      : ${crawlSummary.pagesFailed}`);
        console.log(`Redirects Encountered      : ${crawlSummary.redirectsEncountered}`);
        console.log(`Images Found               : ${crawlSummary.imagesFound}`);
        console.log(`PDF Links Found            : ${crawlSummary.pdfLinksFound}`);
        console.log(`Internal Links Found       : ${crawlSummary.internalLinksFound}`);
        console.log(`External Links Found       : ${crawlSummary.externalLinksFound}`);
        console.log(`Average Page Load          : ${crawlSummary.averageLoad} ms`);
        console.log(`Crawl Duration             : ${Math.round(crawlSummary.crawlDuration / 1000)} seconds`);
        console.log("========================================");
        console.log("");

        return crawlSummary;

    }
    

}

module.exports = Crawler;