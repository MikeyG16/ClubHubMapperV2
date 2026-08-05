const fs = require("fs");
const path = require("path");

const config = require("./config");

const { exportData } = require("./exporter");
const { exportHTML } = require("./htmlExporter");

async function buildReports() {

    const sitemapFile = path.join(
        config.outputFolder,
        "sitemap.json"
    );

    if (!fs.existsSync(sitemapFile)) {

        console.log("sitemap.json not found.");
        process.exit(1);

    }

    const pages = JSON.parse(
        fs.readFileSync(sitemapFile, "utf8")
    );

    console.log("");
    console.log("========================================");
    console.log(` Loaded ${pages.length} pages.`);
    console.log("========================================");
    console.log("");

    console.log("Page Types Found:");
    console.log(
        [...new Set(pages.map(p => p.contentType))]
            .sort()
    );
    console.log("");

    await exportData(pages);

    exportHTML(pages);

    console.log("");
    console.log("========================================");
    console.log(" Reports Complete");
    console.log("========================================");
    console.log("");

}

buildReports().catch(err => {

    console.error(err);
    process.exit(1);

});