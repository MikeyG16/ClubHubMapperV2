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
        while (this.queue.length > 0 && this.pages.length < 100) {

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

            console.log(
                "DEBUG technicalParent:",
                pageData.title,
                pageData.technicalParent
            );

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

        this.buildIncomingLinks();
        this.buildHierarchy();

        console.log(
            "DEBUG FINAL PARENT:",
            this.pages.find(page =>
                page.url.includes("/topic/syllabus")
            )?.parent
        );

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

                technicalParent: parent,

                contentType:
                    statusCode === 200
                        ? this.classifyClubHubPage(finalUrl, bodyClass)
                        : "Failed",

                slug: wp?.slug || null,
                wordpressStatus: wp?.status || null,
                lastModified: wp?.modified || null,
                published: wp?.date || null,
                authorId: wp?.author || null,
                wordpressType: wp?.type || null,
                metadataSource: wp ? "WordPress API" : "Not available",

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

    classifyClubHubPage(url, bodyClass = "") {

        const baseType = utils.pageType(url, bodyClass);

        const normalisedUrl = utils.normaliseUrl(url);

        // ----------------------------------------------
        // CLUBHUB TOOLKIT LANDING PAGES
        //
        // Source of truth: ClubHub Information
        // Architecture workbook
        // ----------------------------------------------

        const toolkitLandingUrls = new Set([

            "https://clubhub-resources.british-gymnastics.org/courses/toolkits",

            "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/facility-toolkit",

            "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/health-and-safety-toolkit",

            "https://clubhub-resources.british-gymnastics.org/courses/health-and-safety/lessons/securing-your-premises-for-a-closure-or-opening-after-a-closure",

            "https://clubhub-resources.british-gymnastics.org/courses/policies-and-procedures/lessons/standards-of-conduct-coaches-instructors-officials",

            "https://clubhub-resources.british-gymnastics.org/courses/policies-and-procedures/lessons/membership-rules",

            "https://clubhub-resources.british-gymnastics.org/courses/policies-and-procedures/lessons/prevention-of-competition-manipulation-policy",

            "https://clubhub-resources.british-gymnastics.org/courses/policies-and-procedures/lessons/affiliated-associations-policy",

            "https://clubhub-resources.british-gymnastics.org/courses/policies-and-procedures/lessons/flexibility-training",

            "https://clubhub-resources.british-gymnastics.org/courses/policies-and-procedures/lessons/health-safety-and-welfare-guidance-safe-participation",

            "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/assistant-foundation-foundation-coach-hub"

        ]);

        if (toolkitLandingUrls.has(normalisedUrl)) {

            return "Toolkit Landing";

        }

            // ----------------------------------------------
            // CLUBHUB TOOLKIT PAGES
            //
            // Source of truth: ClubHub Information
            // Architecture workbook
            // ----------------------------------------------

            const toolkitUrls = new Set([

                "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/club-operations-toolkit",

                "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/recreational-gymnastics-judging-toolkit",

                "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/financial-toolkit",

                "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/be-the-change-toolkit",

                "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/strengthening-your-gymnastics-club",

                "https://clubhub-resources.british-gymnastics.org/courses/toolkits/lessons/recruitment-and-selection-toolkit"

            ]);

            if (toolkitUrls.has(normalisedUrl)) {

                return "Toolkit";

            }

        // ----------------------------------------------
        // OTHERWISE KEEP THE EXISTING CLASSIFICATION
        // ----------------------------------------------

        return baseType;

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

    // Clear existing hierarchy
    for (const page of this.pages) {

        page.children = [];

        // Parent will be determined from the ClubHub URL structure
        page.parent = null;

    }

    // Preserve the original crawl relationship separately
    for (const page of this.pages) {

        if (page.technicalParent === undefined) {

            page.technicalParent = null;

        }

    }


    // Build a normalised page lookup
    const pageLookup = new Map();

    for (const page of this.pages) {

        pageLookup.set(
            utils.normaliseUrl(page.url),
            page
        );

    }


    // --------------------------------------------------
    // CLUBHUB PRIMARY PARENT DETECTION
    // --------------------------------------------------

    for (const page of this.pages) {

        const url = utils.normaliseUrl(page.url);


        // HOME
        if (
            page.contentType === "Home"
        ) {
            page.parent = null;
            continue;
        }


        // ----------------------------------------------
        // TOOLKIT TOPIC
        // /courses/toolkits/lessons/[toolkit]/topic/[topic]
        // ----------------------------------------------

        const toolkitTopicMatch = url.match(
            /\/courses\/toolkits\/lessons\/([^/]+)\/topic\/[^/]+\/?$/
        );

        if (toolkitTopicMatch) {

            const toolkitSlug = toolkitTopicMatch[1];

            const parentUrl =
                "https://clubhub-resources.british-gymnastics.org" +
                "/courses/toolkits/lessons/" +
                toolkitSlug;

            const parent = pageLookup.get(
                utils.normaliseUrl(parentUrl)
            );

            if (parent) {

                page.parent = parent.url;

            }

            continue;

        }


        // ----------------------------------------------
        // TOOLKIT
        // /courses/toolkits/lessons/[toolkit]
        // ----------------------------------------------

        const toolkitMatch = url.match(
            /\/courses\/toolkits\/lessons\/([^/]+)\/?$/
        );

        if (
            toolkitMatch &&
            page.contentType === "Toolkit"
        ) {

            const parentUrl =
                "https://clubhub-resources.british-gymnastics.org/courses/toolkits";

            const parent = pageLookup.get(
                utils.normaliseUrl(parentUrl)
            );

            if (parent) {

                page.parent = parent.url;

            }

            continue;

        }


        // ----------------------------------------------
        // TOOLKIT LANDING
        // /courses/toolkits
        // ----------------------------------------------

        if (
            page.contentType === "Toolkit Landing" ||
            url.endsWith("/courses/toolkits")
        ) {

            const home = pageLookup.get(
                "https://clubhub-resources.british-gymnastics.org/"
            );

            if (home) {

                page.parent = home.url;

            }

            continue;

        }


        // ----------------------------------------------
        // CATEGORY
        // /courses/[category]
        // ----------------------------------------------

        const categoryMatch = url.match(
            /\/courses\/([^/]+)\/?$/
        );

        if (
            categoryMatch &&
            page.contentType === "Category"
        ) {

            const home = pageLookup.get(
                utils.normaliseUrl("https://clubhub-resources.british-gymnastics.org")
            );

            if (home) {
                page.parent = home.url;

            }

            continue;

        }


        // ----------------------------------------------
        // TOPIC
        // /courses/[category]/lessons/[topic]
        // ----------------------------------------------

        const topicMatch = url.match(
            /\/courses\/([^/]+)\/lessons\/([^/]+)\/?$/
        );

        if (
            topicMatch &&
            page.contentType === "Topic"
        ) {

            const categorySlug = topicMatch[1];

            const parentUrl =
                "https://clubhub-resources.british-gymnastics.org" +
                "/courses/" +
                categorySlug;

            const parent = pageLookup.get(
                utils.normaliseUrl(parentUrl)
            );

            if (parent) {

                page.parent = parent.url;

            }

            continue;

        }


        // ----------------------------------------------
        // TOPIC CATEGORY
        // /lesson-category/[category]
        //
        // Topic Categories sit underneath the relevant
        // ClubHub Category where the URL/content provides
        // a clear structural relationship.
        // ----------------------------------------------

        if (page.contentType === "Topic Category") {

            const topicCategorySlug = url.match(
                /\/lesson-category\/([^/]+)\/?$/
            );

            if (topicCategorySlug) {

                const slug = topicCategorySlug[1];

                // Known ClubHub Category relationships
                const categoryMap = {

                    "risk-and-compliance": "health-and-safety",
                    "facility": "health-and-safety",
                    "people": "health-and-safety",
                    "finance": "governance",
                    "legislation": "governance",
                    "operating-your-club": "club-development",
                    "about-your-facility": "club-development",
                    "marketing": "club-development",
                    "programmes": "club-development",
                    "developing-your-workforce": "people-development",
                    "club-roles": "people-development",
                    "volunteering": "people-development"
                };

                const categorySlug = categoryMap[slug];

                if (categorySlug) {

                    const parentUrl =
                        "https://clubhub-resources.british-gymnastics.org/courses/" +
                        categorySlug;

                    const parent = pageLookup.get(
                        utils.normaliseUrl(parentUrl)
                    );

                    if (parent) {

                        page.parent = parent.url;

                    }

                }

            }

            continue;
        }

    }


    // --------------------------------------------------
    // BUILD CHILDREN FROM PRIMARY PARENTS
    // --------------------------------------------------

    for (const page of this.pages) {

        if (!page.parent) {
            continue;
        }

        const parent = pageLookup.get(
            utils.normaliseUrl(page.parent)
        );

        if (!parent) {
            continue;
        }

        if (!parent.children.some(child => child.id === page.id)) {

            parent.children.push(page);

        }

    }


    // --------------------------------------------------
    // RECALCULATE DEPTH FROM PRIMARY HIERARCHY
    // --------------------------------------------------

    const home = this.pages.find(
        page => page.contentType === "Home"
    );

    if (!home) {
        return;
    }


    home.depth = 0;


    const visited = new Set();

    function assignDepth(page, depth) {

        if (visited.has(page.id)) {
            return;
        }

        visited.add(page.id);

        page.depth = depth;

        for (const child of page.children) {

            assignDepth(child, depth + 1);

        }

    }

    assignDepth(home, 0);

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