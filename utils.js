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
    pageType
};

