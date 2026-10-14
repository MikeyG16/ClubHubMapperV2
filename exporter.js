const fs = require("fs");
const path = require("path");

const config = require("./config");
const { exportExcel } = require("./excelExporter");
const { exportHTML } = require("./htmlexporter");
const { calculateWebsiteComposition } = require("./utils");

async function exportData(
    pages,
    summary,
    resources = [],
    crawlCoverage = {},
    unmatchedLinks = [],
    structuralAnomalies = [],
    contentSimilarity = {}
) {

    // Ensure output folder exists
    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder, { recursive: true });
    }

const exportPages = pages.map(page => ({

    id: page.id,
    title: page.title,
    contentText: page.contentText,
    url: page.url,
    finalUrl: page.finalUrl,

    parent: page.parent || null,
    parentStatus: page.parentStatus,
    children: page.children,

    // Observed crawl relationship
    crawlParent: page.crawlParent,
    crawlDepth: page.crawlDepth,

    depth: page.depth,
    contentType: page.contentType,

    statusCode: page.statusCode,
    statusText: page.statusText,

    redirected: page.redirected,
    redirectTarget: page.redirectTarget,

    wordpressStatus: page.wordpressStatus,
    published: page.published,
    lastModified: page.lastModified,
    authorId: page.authorId,
    metadataSource: page.metadataSource,

    imageCount: page.imageCount,
    pdfCount: page.pdfCount,

    htmlSize: page.htmlSize,

    internalLinks: page.internalLinks,
    externalLinks: page.externalLinks,

    incomingLinks: page.incomingLinks,
    incomingLinkCount: page.incomingLinkCount,
    outgoingLinkCount: page.outgoingLinkCount,

    orphan: page.orphan,

    crawlTime: page.crawlTime,
    visited: page.visited,
    error: page.error

}));

    // ==========================================================
    // Website Composition
    // ==========================================================

    const composition =
        calculateWebsiteComposition(pages);
    
 
    // Save JSON
    
    const jsonFile = path.join(config.outputFolder, "sitemap.json");

    fs.writeFileSync(
        jsonFile,
        JSON.stringify(
            {
                summary,
                composition,
                resources,
                crawlCoverage,
                unmatchedLinks,
                structuralAnomalies,
                pages: exportPages
            },
            null,
            2
        ),
        "utf8"
    );

    console.log("");
    console.log("========================================");
    console.log(" JSON Export Complete");
    console.log("========================================");
    console.log(`JSON : ${jsonFile}`);
    console.log("");


    // Export Excel
    await exportExcel(
        exportPages,
        summary,
        composition,
        resources,
        crawlCoverage,
        unmatchedLinks,
        contentSimilarity
    );

    // Export HTML
    exportHTML(
        exportPages,
        summary,
        composition,
        resources,
        crawlCoverage,
        unmatchedLinks,
        contentSimilarity
    );

}

module.exports = {
    exportData
};