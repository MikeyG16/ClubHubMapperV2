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

        this.canonicalResources = [];

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

        // Group all observed crawl records into canonical resources.
        // Individual occurrences remain intact as evidence.
        this.canonicalResources = utils.buildCanonicalResources(this.pages);

        this.buildIncomingLinks();
        this.buildUnmatchedLinks();
        this.buildHierarchy();

        // Rebuild after hierarchy has been established so the canonical
        // resource record contains the final parent/depth evidence.
        this.canonicalResources = utils.buildCanonicalResources(this.pages);

        // S3-07 — Structural Anomaly Evidence
        this.structuralAnomalies =
            utils.detectStructuralAnomalies(this.pages);

        console.log(
            `Structural anomalies identified: ${this.structuralAnomalies.length}`
        );

        console.log(
            "DEBUG FINAL PARENT:",
            this.pages.find(page =>
                page.url.includes("/topic/syllabus")
            )?.parent
        );

        const crawlDuration = Date.now() - crawlStarted;
        
        const crawlCoverage = {
            completed: this.queue.length === 0,
            stoppedAtPageLimit: this.pages.length >= 50 && this.queue.length > 0,
            pageLimit: 50,
            pagesCrawled: this.pages.length,
            queuedUrlsRemaining: this.queue.length
        };

        const crawlSummary = this.printSummary(crawlDuration);

        return {
            pages: this.pages,
            resources: this.canonicalResources,
            summary: crawlSummary,
            crawlCoverage,
            unmatchedLinks: this.unmatchedLinks,
            structuralAnomalies: this.structuralAnomalies
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

            console.log("WORDPRESS DATA DIAGNOSTIC:", JSON.stringify({
                keys: wp ? Object.keys(wp) : [],
                title: wp?.title,
                contentType: typeof wp?.content,
                contentLength: typeof wp?.content === "string" ? wp.content.length : null,
                contentPreview: typeof wp?.content === "string" ? wp.content.slice(0, 300) : null
            }, null, 2));

            const bodyClass = await this.page.evaluate(() => document.body.className);

            const contentSelectors = await this.page.evaluate(() => {
                const selectors = [
                    "main",
                    "article",
                    "[role='main']",
                    ".entry-content",
                    ".lesson-content",
                    ".course-content",
                    ".content-area"
                ];

                return selectors.map(selector => {
                    const elements = [...document.querySelectorAll(selector)];

                    return {
                        selector,
                        count: elements.length,
                        details: elements.slice(0, 3).map(el => ({
                            tag: el.tagName,
                            className: el.className,
                            textLength: (el.innerText || "").length,
                            preview: (el.innerText || "")
                                .replace(/\s+/g, " ")
                                .trim()
                                .slice(0, 160)
                        }))
                    };
                });
            });

            console.log(
                "CONTENT SELECTOR DIAGNOSTIC:",
                JSON.stringify(contentSelectors, null, 2)
            );

            const contentText = await this.page.evaluate(() => {
                const clone = document.body.cloneNode(true);

                clone.querySelectorAll(`
                    script,
                    style,
                    noscript,
                    nav,
                    header,
                    footer,
                    aside,
                    iframe,
                    form,
                    button,
                    input,
                    select,
                    textarea,
                    [role="navigation"],
                    [role="dialog"],
                    [aria-label*="cookie" i],
                    [class*="cookie" i],
                    [id*="cookie" i]
                `).forEach(el => el.remove());

                return clone.innerText
                    .replace(/\s+/g, " ")
                    .trim();
            });



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

            const htmlSize = (await this.page.content()).length;

            return {

                id: this.nextId++,

                requestedUrl: url,

                title: title || "(Untitled)",

                contentText,

                url: finalUrl,

                finalUrl,

                canonicalUrl: finalUrl,

                crawlParent: parent,
                crawlDepth: depth,

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

                htmlSize,

                visited: true,

                error: null

            };

        } catch (err) {

            return {

                id: this.nextId++,

                requestedUrl: url,

                title: "(Failed)",

                url,

                finalUrl: url,

                canonicalUrl: url,

                crawlParent: parent,
                crawlDepth: depth,

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

        // Track whether this is a genuine root or has a parent.
        // Do not attempt to distinguish uncrawled parents here.
        page.parentStatus = "unknown";

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
            page.parentStatus = "root";
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
                page.parentStatus = "has-parent";

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
                page.parentStatus = "has-parent";

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
                page.parentStatus = "has-parent";

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
                page.parentStatus = "has-parent";

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
                page.parentStatus = "has-parent";

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
                        page.parentStatus = "has-parent";

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

        if (!parent.children.includes(page.id)) {

            parent.children.push(page.id);

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

        if (!page || visited.has(page.id)) {
            return;
        }

        visited.add(page.id);

        page.depth = depth;

        for (const childId of page.children) {

            const child = [...pageLookup.values()].find(
                candidate => candidate.id === childId
            );

            if (child) {

                assignDepth(child, depth + 1);

            }

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

            if (target.id !== page.id) {
                target.incomingLinks.push(page.url);
            }

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


    buildUnmatchedLinks() {

        const unmatched = new Map();

        for (const page of this.pages) {

            for (const link of page.internalLinks) {

                const target = this.pageMap.get(
                    utils.normaliseUrl(link)
                );

                if (target) continue;

                if (!unmatched.has(link)) {
                    unmatched.set(link, {
                        url: link,
                        sourcePages: []
                    });
                }

                unmatched.get(link).sourcePages.push(page.url);

            }

        }

        this.unmatchedLinks = [...unmatched.values()].map(item => {
            const sourcePages = [...new Set(item.sourcePages)];

            return {
                url: item.url,
                sourcePages,
                referenceCount: sourcePages.length
            };
        });

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