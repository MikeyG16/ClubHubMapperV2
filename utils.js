const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function ensureDirectory(dir) {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

}

function saveJSON(filename, data) {

    fs.writeFileSync(
        filename,
        JSON.stringify(data, null, 2),
        "utf8"
    );

}

function normaliseUrl(url) {

    if (!url) return null;

    try {

        const u = new URL(url);

        u.search = "";
        u.hash = "";

        let result = u.toString();

        if (
            result.endsWith("/") &&
            result.length > "https://x/".length
        ) {
            result = result.slice(0, -1);
        }

        return result;

    }
    catch {

        return null;

    }

}

function isInternal(url) {

    if (!url) return false;

    try {

        return (
            new URL(url).hostname ===
            "clubhub-resources.british-gymnastics.org"
        );

    }
    catch {

        return false;

    }

}

function shouldIgnore(url) {

    if (!url) return true;

    const lower = url.toLowerCase();

    return (

        lower.startsWith("mailto:") ||
        lower.startsWith("tel:") ||
        lower.startsWith("javascript:") ||

        lower.includes("/wp-login") ||
        lower.includes("/wp-admin") ||
        lower.includes("/logout") ||

        lower.match(/\.(jpg|jpeg|png|gif|svg|webp)$/) ||
        lower.match(/\.(css|js|doc|docx|xls|xlsx|ppt|pptx)$/)

    );

}

function pageType(url, bodyClass = "") {

    if (!url) return "Unknown";

    const u = url.toLowerCase();
    const body = bodyClass.toLowerCase();

    // ---------- FILES ----------

    if (u.endsWith(".pdf"))
        return "PDF";

    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u))
        return "Image";

    if (/\.(doc|docx|xls|xlsx|ppt|pptx|zip)$/i.test(u))
        return "Download";


    // ---------- HOME ----------

    if (
        body.includes("home") ||
        u === "https://clubhub-resources.british-gymnastics.org" ||
        u === "https://clubhub-resources.british-gymnastics.org/"
    )
        return "Home";


    // ---------- TOOLKITS ----------

    // Toolkit landing page
    if (
        u === "https://clubhub-resources.british-gymnastics.org/courses/toolkits/" ||
        (
            body.includes("single-sfwd-courses") &&
            u.includes("/courses/toolkits/")
        )
    )
        return "Toolkit Landing";


    // Topic within a Toolkit
    if (
        u.includes("/courses/toolkits/lessons/") &&
        u.includes("/topic/")
    )
        return "Topic";


    // Toolkit itself
    if (
        body.includes("single-sfwd-lessons") &&
        u.includes("/courses/toolkits/lessons/")
    )
        return "Toolkit";


    // ---------- CLUBHUB CATEGORIES ----------

    // Category
    if (
        body.includes("single-sfwd-courses") &&
        u.includes("/courses/")
    )
        return "Category";


    // ---------- TOPIC CATEGORIES ----------

    if (
        body.includes("tax-ld_lesson_category") ||
        u.includes("/lesson-category/")
    )
        return "Topic Category";


    // ---------- TOPICS ----------

    if (body.includes("single-sfwd-topic"))
        return "Topic";


    // Standard LearnDash lessons outside Toolkits
    if (
        body.includes("single-sfwd-lessons") &&
        u.includes("/courses/") &&
        u.includes("/lessons/")
    )
        return "Topic";


    // ---------- STANDARD WORDPRESS ----------

    if (body.includes("archive"))
        return "Archive";

    if (body.includes("search"))
        return "Search";

    if (body.includes("page"))
        return "Standard Page";


    // ---------- URL FALLBACKS ----------

    // Pagination
    if (/\/page\/\d+\/?$/.test(u))
        return "Pagination";


    // Toolkit topic
    if (
        u.includes("/courses/toolkits/lessons/") &&
        u.includes("/topic/")
    )
        return "Topic";


    // Toolkit
    if (u.includes("/courses/toolkits/lessons/"))
        return "Toolkit";


    // Toolkit landing
    if (u.includes("/courses/toolkits/"))
        return "Toolkit Landing";


    // Topic category
    if (u.includes("/lesson-category/"))
        return "Topic Category";


    // Topic
    if (
        u.includes("/courses/") &&
        u.includes("/lessons/")
    )
        return "Topic";


    // Category
    if (u.includes("/courses/"))
        return "Category";


    return "Standard Page";
}

// ==========================================================
// Canonical Resources / Duplicate Occurrences
// ==========================================================

function buildCanonicalResources(pages) {

    const groups = new Map();

    for (const page of pages) {

        const canonicalUrl = normaliseUrl(
            page.canonicalUrl || page.finalUrl || page.url
        );

        if (!canonicalUrl) {
            continue;
        }

        if (!groups.has(canonicalUrl)) {
            groups.set(canonicalUrl, []);
        }

        groups.get(canonicalUrl).push(page);

    }

    const resources = [];

    for (const [canonicalUrl, occurrences] of groups) {

        // Prefer a successfully crawled, non-redirect occurrence
        // as the representative canonical occurrence.
        const canonicalPage =
            occurrences.find(
                page => page.visited !== false && !page.redirected
            ) ||
            occurrences.find(
                page => page.visited !== false
            ) ||
            occurrences[0];

        const resourceId =
            "resource-" +
            crypto
                .createHash("sha1")
                .update(canonicalUrl)
                .digest("hex")
                .slice(0, 12);

        const parents = [
            ...new Set(
                occurrences
                    .map(page => normaliseUrl(page.parent))
                    .filter(Boolean)
            )
        ];

        const depths = [
            ...new Set(
                occurrences
                    .map(page => Number(page.depth))
                    .filter(Number.isFinite)
            )
        ].sort((a, b) => a - b);

        const crawlDepths = [
            ...new Set(
                occurrences
                    .map(page => Number(page.crawlDepth))
                    .filter(Number.isFinite)
            )
        ].sort((a, b) => a - b);

        const crawlParents = [
            ...new Set(
                occurrences
                    .map(
                        page =>
                            normaliseUrl(
                                page.technicalParent ||
                                page.crawlParent
                            )
                    )
                    .filter(Boolean)
            )
        ];

        const occurrenceData = occurrences.map(page => ({
            id: page.id,
            requestedUrl: page.requestedUrl || page.url,
            url: page.url,
            canonicalUrl,

            parent: page.parent || null,
            technicalParent: page.technicalParent || null,

            depth:
                Number.isFinite(page.depth)
                    ? page.depth
                    : null,

            crawlDepth:
                Number.isFinite(page.crawlDepth)
                    ? page.crawlDepth
                    : null,

            redirected: !!page.redirected,
            redirectTarget: page.redirectTarget || null,

            statusCode: page.statusCode ?? null,
            visited: page.visited !== false,
            title: page.title || "(Untitled)"
        }));

        const resource = {

            id: resourceId,

            canonicalUrl,

            canonicalOccurrenceId: canonicalPage.id,

            title:
                canonicalPage.title ||
                "(Untitled)",

            contentType:
                canonicalPage.contentType ||
                "Unknown",

            statusCode:
                canonicalPage.statusCode ?? null,

            occurrenceCount:
                occurrences.length,

            duplicate:
                occurrences.length > 1,

            duplicateOccurrenceCount:
                Math.max(0, occurrences.length - 1),

            redirectedOccurrenceCount:
                occurrences.filter(
                    page => page.redirected
                ).length,

            depths,

            parents,

            crawlDepths,

            crawlParents,

            occurrences:
                occurrenceData
        };

        // Add canonical-resource evidence back onto every
        // individual crawl occurrence.
        for (const page of occurrences) {

            page.canonicalUrl = canonicalUrl;

            page.canonicalResourceId = resourceId;

            page.canonicalOccurrenceId =
                canonicalPage.id;

            page.isCanonicalOccurrence =
                page.id === canonicalPage.id;

            page.duplicateOccurrence =
                occurrences.length > 1 &&
                page.id !== canonicalPage.id;

            page.resourceOccurrenceCount =
                occurrences.length;

        }

        resources.push(resource);

    }

    resources.sort(
        (a, b) =>
            a.canonicalUrl.localeCompare(
                b.canonicalUrl
            )
    );

    return resources;
}

function getCanonicalPages(pages) {

    return pages.filter(
        page =>
            page.isCanonicalOccurrence !== false
    );

}


/**
 * S3-08 — Content Similarity Evidence
 *
 * Identifies exact and strong near-duplicate content between
 * distinct canonical resources. Findings require human review.
 */
function detectContentSimilarity(pages, options = {}) {

    const settings = {
        minCharacters: options.minCharacters ?? 300,
        minWords: options.minWords ?? 50,
        shingleSize: options.shingleSize ?? 5,
        nearDuplicateThreshold: options.nearDuplicateThreshold ?? 0.85,
        minLengthRatio: options.minLengthRatio ?? 0.80
    };

    const excludedTypes = new Set([
        "Home",
        "Archive",
        "Search",
        "Pagination",
        "Failed",
        "PDF",
        "Image",
        "Download"
    ]);

    const normaliseText = text =>
        String(text || "")
            .normalize("NFKC")
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim()
            .replace(/\s+/g, " ");

    const makeShingles = tokens => {
        const shingles = new Set();

        for (
            let i = 0;
            i <= tokens.length - settings.shingleSize;
            i++
        ) {
            shingles.add(
                tokens
                    .slice(i, i + settings.shingleSize)
                    .join(" ")
            );
        }

        return shingles;
    };

    const recordsByResource = new Map();

    for (const page of pages || []) {

        if (
            page.visited === false ||
            page.error ||
            (Number(page.statusCode) >= 400) ||
            excludedTypes.has(page.contentType)
        ) {
            continue;
        }

        const url = normaliseUrl(
            page.canonicalUrl || page.finalUrl || page.url
        );

        if (!url) continue;

        // Prefer the canonical occurrence where available.
        if (page.isCanonicalOccurrence === false) continue;

        const resourceId =
            page.canonicalResourceId || url;

        // Only one representative per canonical resource.
        if (recordsByResource.has(resourceId)) continue;

        const text = normaliseText(page.contentText);
        const tokens = text ? text.split(" ") : [];

        if (
            text.length < settings.minCharacters ||
            tokens.length < settings.minWords
        ) {
            continue;
        }

        recordsByResource.set(resourceId, {
            resourceId,
            title: page.title || "(Untitled)",
            url,
            contentType: page.contentType || "Unknown",
            text,
            tokens,
            textLength: text.length,
            exactHash: crypto
                .createHash("sha256")
                .update(text)
                .digest("hex"),
            shingles: makeShingles(tokens)
        });
    }

    const records = [...recordsByResource.values()];
    const matches = [];

    const addMatch = (a, b, matchType, similarity) => {
        matches.push({
            matchType,
            similarity: Number(similarity.toFixed(4)),

            resourceA: {
                id: a.resourceId,
                title: a.title,
                url: a.url,
                contentType: a.contentType,
                textLength: a.textLength
            },

            resourceB: {
                id: b.resourceId,
                title: b.title,
                url: b.url,
                contentType: b.contentType,
                textLength: b.textLength
            }
        });
    };

    // 1. Exact matches: group by hash, then confirm text equality.
    const exactGroups = new Map();

    for (const record of records) {
        if (!exactGroups.has(record.exactHash)) {
            exactGroups.set(record.exactHash, []);
        }

        exactGroups.get(record.exactHash).push(record);
    }

    const exactResourcePairs = new Set();

    for (const group of exactGroups.values()) {
        if (group.length < 2) continue;

        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {

                const a = group[i];
                const b = group[j];

                if (a.text !== b.text) continue;

                const pairKey = [a.resourceId, b.resourceId]
                    .sort()
                    .join("|||");

                exactResourcePairs.add(pairKey);
                addMatch(a, b, "Exact match", 1);
            }
        }
    }

    // 2. Build an index of five-word shingles.
    // Very common shingles are skipped to reduce boilerplate matches.
    const shingleIndex = new Map();

    for (let i = 0; i < records.length; i++) {
        for (const shingle of records[i].shingles) {

            if (!shingleIndex.has(shingle)) {
                shingleIndex.set(shingle, []);
            }

            shingleIndex.get(shingle).push(i);
        }
    }

    const commonShingleLimit = Math.max(
        2,
        Math.ceil(records.length * 0.20)
    );

    
    // Identify shingles that appear across too many resources.
    // These are less useful for distinguishing substantive content.
    const commonShingles = new Set(
        [...shingleIndex.entries()]
            .filter(([, indexes]) =>
                indexes.length > commonShingleLimit
            )
            .map(([shingle]) => shingle)
    );


    const candidatePairs = new Set();

    for (const [shingle, indexes] of shingleIndex) {

        if (indexes.length > commonShingleLimit) continue;

        for (let i = 0; i < indexes.length; i++) {
            for (let j = i + 1; j < indexes.length; j++) {
                candidatePairs.add(`${indexes[i]}:${indexes[j]}`);
            }
        }
    }

    // 3. Calculate Jaccard similarity for candidate pairs.
    for (const candidate of candidatePairs) {

        const [i, j] = candidate.split(":").map(Number);
        const a = records[i];
        const b = records[j];

        const pairKey = [a.resourceId, b.resourceId]
            .sort()
            .join("|||");

        // Exact matches are already reported separately.
        if (exactResourcePairs.has(pairKey)) continue;

        const shorter = Math.min(a.tokens.length, b.tokens.length);
        const longer = Math.max(a.tokens.length, b.tokens.length);

        const lengthRatio = shorter / longer;

        if (lengthRatio < settings.minLengthRatio) continue;


        // Exclude common shingles from the score as well as
        // from candidate discovery, reducing boilerplate influence.
        const aShingles = new Set(
            [...a.shingles].filter(
                shingle => !commonShingles.has(shingle)
            )
        );

        const bShingles = new Set(
            [...b.shingles].filter(
                shingle => !commonShingles.has(shingle)
            )
        );

        let intersection = 0;

        for (const shingle of aShingles) {
            if (bShingles.has(shingle)) {
                intersection++;
            }
        }

        const union =
            aShingles.size +
            bShingles.size -
            intersection;

        const similarity =
            union > 0 ? intersection / union : 0;


        if (similarity >= settings.nearDuplicateThreshold) {
            addMatch(a, b, "Near-duplicate", similarity);
        }
    }

    matches.sort((a, b) => {
        if (a.matchType !== b.matchType) {
            return a.matchType === "Exact match" ? -1 : 1;
        }

        return b.similarity - a.similarity;
    });

    return {
        settings,
        resourcesCompared: records.length,
        exactMatchCount: matches.filter(
            match => match.matchType === "Exact match"
        ).length,
        nearDuplicateCount: matches.filter(
            match => match.matchType === "Near-duplicate"
        ).length,
        matches
    };
}


module.exports = {
    ensureDirectory,
    saveJSON,
    normaliseUrl,
    isInternal,
    shouldIgnore,
    pageType,
    calculateWebsiteComposition,
    buildCanonicalResources,
    getCanonicalPages,
    getMostReferencedPages,
    getLargestPages,
    detectStructuralAnomalies,
    detectContentSimilarity
};

// ==========================================================
// Website Composition
// ==========================================================

function calculateWebsiteComposition(pages){

    const composition = {

        totalPages: pages.length,

        contentTypes: {},

        depths: {},

        media: {
            images: 0,
            pdfs: 0
        },

        links: {
            internal: 0,
            external: 0
        }

    };

    pages.forEach(page => {

        // --------------------------------------------------
        // Content Type
        // --------------------------------------------------

        const type =
            page.contentType || "Unknown";

        if(!composition.contentTypes[type]){
            composition.contentTypes[type] = 0;
        }

        composition.contentTypes[type]++;

        // --------------------------------------------------
        // Depth
        // --------------------------------------------------

        const depth =
            Number.isFinite(page.depth)
                ? page.depth
                : 0;

        if(!composition.depths[depth]){
            composition.depths[depth] = 0;
        }

        composition.depths[depth]++;

        // --------------------------------------------------
        // Media
        // --------------------------------------------------

        composition.media.images +=
            Number(page.imageCount) || 0;

        composition.media.pdfs +=
            Number(page.pdfCount) || 0;

        // --------------------------------------------------
        // Links
        // --------------------------------------------------

        composition.links.internal +=
            Array.isArray(page.internalLinks)
                ? page.internalLinks.length
                : 0;

        composition.links.external +=
            Array.isArray(page.externalLinks)
                ? page.externalLinks.length
                : 0;

    });

    // --------------------------------------------------
    // ClubHub Areas
    // --------------------------------------------------

    composition.areas = {};

    const pageById = new Map();

    pages.forEach(page => {

        pageById.set(
            page.id,
            page
        );

    });

    const home = pages.find(
        page => page.contentType === "Home"
    );

    if (home && Array.isArray(home.children)) {

        const areaIds = home.children;

        // Create the top-level ClubHub areas
        areaIds.forEach(areaId => {

            const areaPage = pageById.get(areaId);

            if (areaPage) {

                composition.areas[areaPage.title] = 0;

            }

        });


        // Count every page according to its top-level area
        pages.forEach(page => {

            let current = page;
            let safetyCounter = 0;

            while (
                current &&
                current.parent &&
                safetyCounter < pages.length
            ) {

                const parent = pages.find(
                    candidate =>
                        normaliseUrl(candidate.url) ===
                        normaliseUrl(current.parent)
                );

                if (!parent) {
                    break;
                }

                // If the parent is one of the seven
                // top-level areas, this page belongs to it.
                if (areaIds.includes(parent.id)) {

                    composition.areas[parent.title]++;

                    break;

                }

                current = parent;

                safetyCounter++;

            }

        });

    }

    return composition;

}

// ======================================================
// Most Referenced Pages
// ======================================================

function getMostReferencedPages(pages, limit = 20) {

    return [...pages]
        .filter(page => page.visited !== false)
        .sort(
            (a, b) =>
                (Number(b.incomingLinkCount) || 0) -
                (Number(a.incomingLinkCount) || 0)
        )
        .slice(0, limit);

}

// ======================================================
// Largest Pages / Resources
// ======================================================

function getLargestPages(pages, limit = 20) {

    return [...pages]
        .filter(page => page.visited !== false)
        .sort(
            (a, b) =>
                (Number(b.htmlSize) || 0) -
                (Number(a.htmlSize) || 0)
        )
        .slice(0, limit);

}


/**
 * S3-07 — Structural Anomaly Evidence
 *
 * Identifies potential structural anomalies from observed crawl data.
 * Findings are evidence for review, not confirmed errors.
 */

function detectStructuralAnomalies(pages) {
    const anomalies = [];

    if (!Array.isArray(pages) || pages.length === 0) {
        return anomalies;
    }

    const normalise = url => normaliseUrl(url);

        // Aggregate incoming links across all crawl records
        // using their normalised destination URLs.
        const incomingSourcesByUrl = new Map();

        for (const source of pages) {
            if (!Array.isArray(source.internalLinks)) continue;

            const sourceUrl = normalise(source.url);

            for (const link of source.internalLinks) {
                const targetUrl = normalise(link);

                if (!targetUrl || targetUrl === sourceUrl) continue;

                if (!incomingSourcesByUrl.has(targetUrl)) {
                    incomingSourcesByUrl.set(targetUrl, new Set());
                }

                incomingSourcesByUrl.get(targetUrl).add(sourceUrl);
            }
        }


    
    const pageByUrl = new Map();

    for (const page of pages) {
        const url = normalise(page.url);

        if (!url) continue;

        const existing = pageByUrl.get(url);

        if (!existing) {
            pageByUrl.set(url, {
                ...page,
                children: [...new Set(
                    Array.isArray(page.children) ? page.children : []
                )],
                incomingLinkCount:
                    incomingSourcesByUrl.get(url)?.size || 0
            });
            continue;
        }

        const existingChildren = Array.isArray(existing.children)
            ? existing.children
            : [];

        const incomingChildren = Array.isArray(page.children)
            ? page.children
            : [];

        // Preserve the original resource ID, but retain the most
        // informative page properties and merge hierarchy evidence.
        const preferred =
            incomingChildren.length > existingChildren.length
                ? page
                : existing;

        pageByUrl.set(url, {
            ...existing,
            ...preferred,
            id: existing.id,
            contentType:
                existing.contentType === "Home" ||
                preferred.contentType === "Home"
                    ? "Home"
                    : preferred.contentType || existing.contentType,
            parent: existing.parent || preferred.parent || null,
            parentStatus:
                existing.parentStatus === "root"
                    ? "root"
                    : preferred.parentStatus || existing.parentStatus,
            children: [...new Set([
                ...existingChildren,
                ...incomingChildren
            ])],
            incomingLinkCount:
                incomingSourcesByUrl.get(url)?.size || 0
        });
    }

    const uniquePages = [...pageByUrl.values()];


    const addAnomaly = ({
        type,
        page,
        evidence,
        relatedUrl = null
    }) => {
        anomalies.push({
            type,
            url: page.url,
            title: page.title || "(Untitled)",
            contentType: page.contentType || "Unknown",
            evidence,
            relatedUrl
        });
    };

    for (const page of uniquePages) {
        const url = normalise(page.url);

        if (!url) continue;

        // Failed page records are handled separately.
        if (
            page.visited === false ||
            page.contentType === "Failed" ||
            (page.statusCode !== null &&
             page.statusCode !== undefined &&
             page.statusCode >= 400)
        ) {
            continue;
        }

        // 1. No incoming internal links.
        // Keep this distinct from the hierarchy orphan flag.
        if (Number(page.incomingLinkCount) === 0) {
            addAnomaly({
                type: "No incoming links",
                page,
                evidence:
                    "No incoming internal links were recorded " +
                    "for this resource. Incomplete crawl coverage " +
                    "may affect this finding."
            });
        }

        // 2. A parent is assigned, but the parent record is absent.
        const hierarchyParent = normalise(page.parent);

        if (
            hierarchyParent &&
            !pageByUrl.has(hierarchyParent)
        ) {
            addAnomaly({
                type: "Parent resource not crawled",
                page,
                evidence:
                    "A primary hierarchy parent is recorded, " +
                    "but no matching page record exists in this crawl.",
                relatedUrl: hierarchyParent
            });
        }

        // 3. Check parent-child consistency.
        if (
            hierarchyParent &&
            pageByUrl.has(hierarchyParent)
        ) {
            const parentPage = pageByUrl.get(hierarchyParent);
            const children = Array.isArray(parentPage.children)
                ? parentPage.children
                : [];

            if (!children.includes(page.id)) {
                addAnomaly({
                    type: "Parent-child inconsistency",
                    page,
                    evidence:
                        "The resource identifies a primary parent, " +
                        "but its ID is not listed among that parent's children.",
                    relatedUrl: hierarchyParent
                });
            }
        }

        
                // 4. Check whether the resource is connected to the home hierarchy.
        // Use canonical URLs rather than page IDs because duplicate
        // crawl records can have different IDs for the same resource.
        if (page.parentStatus === "has-parent") {
            const homePage = uniquePages.find(
                candidate => candidate.contentType === "Home"
            );

            if (homePage) {
                const reachableUrls = new Set();
                const pending = [normalise(homePage.url)];

                const childrenByParentUrl = new Map();

                for (const candidate of uniquePages) {
                    const parentUrl = normalise(candidate.parent);

                    if (!parentUrl) continue;

                    if (!childrenByParentUrl.has(parentUrl)) {
                        childrenByParentUrl.set(parentUrl, new Set());
                    }

                    childrenByParentUrl.get(parentUrl).add(
                        normalise(candidate.url)
                    );
                }

                // Include recorded child references from all original
                // occurrences, including failed duplicate records.
                const originalPageById = new Map(
                    pages.map(candidate => [candidate.id, candidate])
                );

                for (const candidate of pages) {
                    const parentUrl = normalise(candidate.url);
                    const children = Array.isArray(candidate.children)
                        ? candidate.children
                        : [];

                    for (const childId of children) {
                        const originalChild = originalPageById.get(childId);

                        if (!originalChild) continue;

                        if (!childrenByParentUrl.has(parentUrl)) {
                            childrenByParentUrl.set(parentUrl, new Set());
                        }

                        childrenByParentUrl.get(parentUrl).add(
                            normalise(originalChild.url)
                        );
                    }
                }

                while (pending.length > 0) {
                    const currentUrl = pending.pop();

                    if (!currentUrl || reachableUrls.has(currentUrl)) {
                        continue;
                    }

                    reachableUrls.add(currentUrl);

                    const childUrls =
                        childrenByParentUrl.get(currentUrl) || new Set();

                    for (const childUrl of childUrls) {
                        if (childUrl && !reachableUrls.has(childUrl)) {
                            pending.push(childUrl);
                        }
                    }
                }


                if (!reachableUrls.has(normalise(page.url))) {
                    addAnomaly({
                        type: "Not connected to home hierarchy",
                        page,
                        evidence:
                            "A primary parent is recorded, but this " +
                            "resource is not reachable from the home " +
                            "page through the recorded hierarchy."
                    });
                }
            } else if (!Number.isFinite(page.depth)) {
                addAnomaly({
                    type: "Not connected to home hierarchy",
                    page,
                    evidence:
                        "A primary parent is recorded, but no finite " +
                        "hierarchy depth was assigned and no home page " +
                        "was available to verify connectivity."
                });
            }
        }
    }


    return anomalies;

}