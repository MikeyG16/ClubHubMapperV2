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

    if (u.match(/\.(jpg|jpeg|png|gif|webp|svg)$/))
        return "Image";

    if (u.match(/\.(doc|docx|xls|xlsx|ppt|pptx|zip)$/))
        return "Download";

    // ---------- HOME ----------

    if (
        body.includes("home") ||
        u === "https://clubhub-resources.british-gymnastics.org" ||
        u === "https://clubhub-resources.british-gymnastics.org/"
    )
        return "Home";

    // ---------- TOOLKITS ----------

    if (
        body.includes("single-sfwd-courses") &&
        u.includes("/courses/toolkits/")
    )
        return "Toolkit Landing Page";

    if (
        body.includes("single-sfwd-lessons") &&
        u.includes("/courses/toolkits/")
    )
        return "Toolkit";

    // ---------- CLUBHUB CONTENT ----------

    if (body.includes("single-sfwd-courses"))
        return "Category";

    if (body.includes("tax-ld_lesson_category"))
        return "Topic Category";

    if (body.includes("single-sfwd-topic"))
        return "Topic";

    if (body.includes("single-sfwd-lessons"))
        return "Topic";

    // ---------- STANDARD WORDPRESS ----------

    if (body.includes("archive"))
        return "Archive";

    if (body.includes("search"))
        return "Search";

    if (body.includes("page"))
        return "Standard Page";

    // ---------- URL FALLBACKS ----------

    if (u.match(/\/page\/\d+\/?$/))
        return "Pagination";

    if (u.includes("/courses/toolkits/lessons/"))
        return "Toolkit";

    if (u.includes("/courses/toolkits/"))
        return "Toolkit Landing Page";

    if (u.includes("/lesson-category/"))
        return "Topic Category";

    if (u.includes("/courses/") && u.includes("/lessons/"))
        return "Topic";

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