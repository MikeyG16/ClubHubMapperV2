const fs = require("fs");
const path = require("path");

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

module.exports = {
    ensureDirectory,
    saveJSON,
    normaliseUrl,
    isInternal,
    shouldIgnore,
    pageType,
    calculateWebsiteComposition
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