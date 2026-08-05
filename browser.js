const { chromium } = require("playwright");
const config = require("./config");

async function createBrowser() {

    console.log("✓ Launching Chromium...");

    const browser = await chromium.launch({
        headless: config.headless,
        slowMo: config.slowMo
    });

    const context = await browser.newContext({
        viewport: {
            width: 1600,
            height: 900
        }
    });

    const page = await context.newPage();

    page.setDefaultTimeout(config.timeout);

    return {
        browser,
        context,
        page
    };

}

async function closeBrowser(browser) {

    if (browser) {
        await browser.close();
    }

}

module.exports = {
    createBrowser,
    closeBrowser
};