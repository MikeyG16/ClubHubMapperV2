module.exports = {

    // Website
    startUrl: "https://clubhub-resources.british-gymnastics.org/",
    loginUrl: "https://clubhub-resources.british-gymnastics.org/wp-login.php",
    domain: "clubhub-resources.british-gymnastics.org",

    // Browser
    headless: false,
    slowMo: 100,
    timeout: 30000,

    // Crawler
    maxPages: 5000,
    maxDepth: 20,
    concurrentPages: 4,
    delayBetweenRequests: 250,

    // Output
    outputFolder: "./output",

    // File names
    jsonFile: "sitemap.json",
    excelFile: "ClubHubInsight.xlsx",
    htmlFile: "sitemap.html"

};