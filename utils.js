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

    // Home
    if (body.includes("home"))
        return "Home";

    // Pagination
    if (u.match(/\/page\/\d+\/?$/))
        return "Pagination";

    // Category pages
    if (body.includes("tax-ld_lesson_category"))
        return "Category";

    // Category (LearnDash Course)
    if (body.includes("single-sfwd-courses"))
        return "Category";

    // Topic
    if (body.includes("single-sfwd-topic"))
        return "Topic";
    
    // Toolkit
    if (body.includes("single-sfwd-lessons"))
        return "Toolkit";

    // Standard Pages
    if (body.includes("page"))
        return "Standard Page";

    // ---------- URL FALLBACKS ----------

    if (
        u === "https://clubhub-resources.british-gymnastics.org" ||
        u === "https://clubhub-resources.british-gymnastics.org/"
    )
        return "Home";

    if (u.includes("/topic/"))
        return "Topic";

    if (u.includes("/lessons/"))
        return "Toolkit";

    if (
        u.includes("/lesson-category/") ||
        u.includes("/category/")
    )
        return "Category";

    if (u.endsWith(".pdf"))
        return "PDF";

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