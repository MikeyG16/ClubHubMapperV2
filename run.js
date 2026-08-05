const { createBrowser, closeBrowser } = require("./browser");
const login = require("./login");
const Crawler = require("./crawler");
const { exportData } = require("./exporter");

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

        await exportData(result.pages, result.summary);

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