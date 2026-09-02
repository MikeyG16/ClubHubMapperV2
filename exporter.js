const fs = require("fs");
const path = require("path");

const config = require("./config");
const { exportExcel } = require("./excelExporter");
const { exportHTML } = require("./htmlexporter");
const { calculateWebsiteComposition } = require("./utils");

async function exportData(pages, summary) {

    // Ensure output folder exists
    if (!fs.existsSync(config.outputFolder)) {
        fs.mkdirSync(config.outputFolder, { recursive: true });
    }

const exportPages = pages.map(page => ({

    id: page.id,
    title: page.title,
    url: page.url,
    finalUrl: page.finalUrl,

    parent: page.parent || null,
    children: page.children,

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
    await exportExcel(pages, summary, composition);

    // Export HTML
    exportHTML(exportPages, summary, composition);

}

module.exports = {
    exportData
};