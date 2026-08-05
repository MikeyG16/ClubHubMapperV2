const config = require("./config");
const credentials = require("./credentials");

async function login(page) {

    console.log("✓ Opening login page...");

    await page.goto(config.loginUrl, {
        waitUntil: "domcontentloaded"
    });

    console.log("✓ Checking login form...");

    await page.waitForSelector("#user_login");
    await page.waitForSelector("#user_pass");
    await page.waitForSelector("#wp-submit");

    console.log("✓ Entering credentials...");

    await page.fill("#user_login", credentials.username);
    await page.fill("#user_pass", credentials.password);

    console.log("✓ Signing in...");

    await Promise.all([
        page.waitForLoadState("networkidle"),
        page.click("#wp-submit")
    ]);

    const currentUrl = page.url();

    if (
        currentUrl.includes("/wp-login.php") ||
        currentUrl.includes("action=login")
    ) {
        throw new Error(
            "Login failed. Please check your username or password."
        );
    }

    console.log("✓ Login successful");

}

module.exports = login;