const { createBrowser, closeBrowser } = require("./browser");
const login = require("./login");
const Crawler = require("./crawler");
const { exportData } = require("./exporter");
const { detectContentSimilarity } = require("./utils");

(async () => {

    console.clear();

    console.log("");
    console.log("========================================");
    console.log("     ClubHub Insight v2");
    console.log("========================================");
    console.log("");

    let browser;

    try {

        const session = await createBrowser();

        browser = session.browser;
        const page = session.page;

        await login(page);

        console.log("");
        console.log("========================================");
        console.log(" Login Complete");
        console.log("========================================");

        const crawler = new Crawler(page);

        const result = await crawler.crawl();

        // S3-08 — Content Similarity Evidence
        const contentSimilarity = detectContentSimilarity(result.pages);

        const diagnosticSimilarity = detectContentSimilarity(
            result.pages,
            { nearDuplicateThreshold: 0.65 }
        );

        console.log(
            `Diagnostic near-duplicate pairs at 65%: ${diagnosticSimilarity.nearDuplicateCount}`
        );

        console.log(
            "Diagnostic matches:",
            JSON.stringify(diagnosticSimilarity.matches, null, 2)
        );

        console.log("");
        console.log("S3-08 — Content Similarity Evidence");
        console.log(`Resources compared: ${contentSimilarity.resourcesCompared}`);
        console.log(`Exact-match pairs: ${contentSimilarity.exactMatchCount}`);
        console.log(`Near-duplicate pairs: ${contentSimilarity.nearDuplicateCount}`);

        await exportData(
            result.pages,
            result.summary,
            result.resources,
            result.crawlCoverage,
            result.unmatchedLinks,
            result.structuralAnomalies,
            contentSimilarity
        );

        console.log("");
        console.log("========================================");
        console.log(" Crawl Complete");
        console.log("========================================");
        console.log("");

        console.log(`Pages discovered : ${result.summary.pagesDiscovered}`);
        console.log("");

    }
    catch (err) {

        console.error("");
        console.error("========================================");
        console.error(" ERROR");
        console.error("========================================");
        console.error("");
        console.error(err);

    }
    finally {

        await closeBrowser(browser);

    }

})();