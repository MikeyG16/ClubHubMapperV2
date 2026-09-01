const fs = require("fs");
const path = require("path");

const config = require("./config");

function copyDirectory(source, destination) {

    if (!fs.existsSync(source)) {
        return;
    }

    fs.mkdirSync(destination, { recursive: true });

    for (const file of fs.readdirSync(source)) {

        const sourceFile = path.join(source, file);
        const destinationFile = path.join(destination, file);

        fs.copyFileSync(sourceFile, destinationFile);

    }

}

function exportHTML(pages, summary, composition) {

    const templateFolder = path.join(__dirname, "templates");

    const templatePath = path.join(templateFolder, "insight.html");

    const outputPath = path.join(
        config.outputFolder,
        "ClubHubInsight.html"
    );

    let html = fs.readFileSync(templatePath, "utf8");

    html = html.replace(
        "__PAGE_DATA__",
        JSON.stringify(pages, null, 2)
    );

    html = html.replace(
        "__CRAWL_SUMMARY__",
        JSON.stringify(summary, null, 2)
    );

    html = html.replace(
        "__WEBSITE_COMPOSITION__",
        JSON.stringify(composition, null, 2)
    );

    fs.writeFileSync(
        outputPath,
        html,
        "utf8"
    );

    // Copy CSS
    copyDirectory(
        path.join(templateFolder, "css"),
        path.join(config.outputFolder, "css")
    );

    // Copy JavaScript
    copyDirectory(
        path.join(templateFolder, "js"),
        path.join(config.outputFolder, "js")
    );

    console.log("");
    console.log("========================================");
    console.log(" HTML Export Complete");
    console.log("========================================");
    console.log(`HTML : ${outputPath}`);
    console.log("");

}

module.exports = {
    exportHTML
};