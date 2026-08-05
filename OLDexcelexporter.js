const ExcelJS = require("exceljs");
const path = require("path");
const config = require("./config");

function formatDate(dateString) {

    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-GB");

}

function formatTime(dateString) {

    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleTimeString("en-GB", {
        hour12: false
    });

}

function getPageAge(dateString) {

    if (!dateString) return "Unknown";

    const updated = new Date(dateString);
    const today = new Date();

    const months =
        (today.getFullYear() - updated.getFullYear()) * 12 +
        (today.getMonth() - updated.getMonth());

    if (months < 12) {
        return `${months} months`;
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    return `${years}y ${remainingMonths}m`;

}

async function exportExcel(pages) {

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "ClubHub Insight v1.0";
    workbook.created = new Date();

    const overview = workbook.addWorksheet("Overview");

    overview.columns = [
        { header: "Metric", key: "metric", width: 35 },
        { header: "Value", key: "value", width: 18 }
    ];

    const totalPages = pages.length;

    const pagesCount = pages.filter(p => p.type === "Page").length;
    const coursesCount = pages.filter(p => p.type === "Course").length;

    const redirects = pages.filter(p => p.redirected).length;

    const brokenPages = pages.filter(p => p.statusCode >= 400).length;

    const orphanPages = pages.filter(p => p.orphan).length;

    const totalImages = pages.reduce((sum, p) => sum + (p.imageCount || 0), 0);

    const totalPDFs = pages.reduce((sum, p) => sum + (p.pdfCount || 0), 0);

    const totalInternalLinks = pages.reduce((sum, p) => sum + (p.outgoingLinkCount || 0), 0);

    const averageCrawlTime =
        Math.round(
            pages.reduce((sum, p) => sum + (p.crawlTime || 0), 0)
            / totalPages
        );
    
    overview.getCell("A1").value = "ClubHub Insight Website Audit";
    overview.getCell("A2").value = "Website";
    overview.getCell("B2").value = config.baseUrl;

    overview.getCell("A3").value = "Report Generated";
    overview.getCell("B3").value = new Date().toLocaleString("en-GB");

    overview.getCell("A4").value = "Version";
    overview.getCell("B4").value = "ClubHub Insight v1.0";

    overview.getCell("A6").value = "Audit Summary";

    const summary = [
    ["Total Pages Crawled", totalPages],
    ["Pages", pagesCount],
    ["Courses", coursesCount],
    ["Broken Pages", brokenPages],
    ["Redirects", redirects],
    ["Orphan Pages", orphanPages],
    ["Images Found", totalImages],
    ["PDFs Found", totalPDFs],
    ["Internal Links", totalInternalLinks],
    ["Average Crawl Time (ms)", averageCrawlTime]
];

summary.forEach((item, index) => {
    const row = 7 + index;

    overview.getCell(`A${row}`).value = item[0];
    overview.getCell(`B${row}`).value = item[1];
});

    overview.mergeCells("A1:B1");
    overview.getRow(1).height = 32;

    overview.getCell("A1").font = {
        name: "Calibri",
        size: 20,
        bold: true,
        color: {
            argb: "FFFFFFFF"
        }
};

    overview.getCell("A1").alignment = {
        horizontal: "center",
        vertical: "middle"
    };

    overview.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0057B8" }
    };

    ["A2", "A3", "A4"].forEach(cell => {

    overview.getCell(cell).font = {
        bold: true
    };

    overview.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFEFEFEF"
        }
    };

});

    overview.getCell("A6").font = {
        bold: true,
        color: {
            argb: "FFFFFFFF"
        }
    };

    overview.getCell("A6").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FF0057B8"
        }
    };

    overview.views = [
        {
            state: "frozen",
            ySplit: 1
        }
];





for (let row = 7; row <= 16; row++) {

    ["A", "B"].forEach(col => {

        const cell = overview.getCell(`${col}${row}`);

        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        };

        if (row % 2 === 0) {

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: "FFF8F8F8"
                }
            };

        }

    });

}

for (let row = 7; row <= 16; row++) {

    const cell = overview.getCell(`B${row}`);

    cell.alignment = {
        horizontal: "right"
    };

    cell.font = {
        bold: true
    };

    cell.numFmt = "#,##0";

}

overview.getRow(6).height = 22;

for (let row = 7; row <= 16; row++) {

    overview.getRow(row).height = 20;

}

overview.pageSetup = {

    orientation: "portrait",

    fitToPage: true,

    fitToWidth: 1

};

    const sheet = workbook.addWorksheet("Content Inventory");

    sheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Title", key: "title", width: 45 },
        { header: "URL", key: "url", width: 70 },
        { header: "Parent", key: "parent", width: 50 },
        { header: "Depth", key: "depth", width: 8 },
        { header: "Type", key: "type", width: 15 },
        { header: "WP Type", key: "wordpressType", width: 15 },
        { header: "Status Code", key: "statusCode", width: 12 },
        { header: "WP Status", key: "wordpressStatus", width: 15 },
        { header: "Redirect", key: "redirected", width: 10 },
        { header: "Incoming Links", key: "incomingLinkCount", width: 16 },
        { header: "Outgoing Links", key: "outgoingLinkCount", width: 16 },
        { header: "Images", key: "imageCount", width: 10 },
        { header: "PDFs", key: "pdfCount", width: 10 },
        { header: "Published Date", key: "publishedDate", width: 15 },
        { header: "Published Time", key: "publishedTime", width: 12 },
        { header: "Last Updated", key: "lastUpdatedDate", width: 15 },
        { header: "Page Age", key: "pageAge", width: 14 },
        { header: "Updated Time", key: "lastUpdatedTime", width: 12 },
        { header: "Crawl Time (ms)", key: "crawlTime", width: 16 },
        { header: "Metadata", key: "metadata", width: 14 },
        { header: "Content Score", key: "contentScore", width: 14 },
        { header: "Review Priority", key: "reviewPriority", width: 18 }
];

const COL = {
    ID: 1,
    TITLE: 2,
    URL: 3,
    PARENT: 4,
    DEPTH: 5,
    TYPE: 6,
    WP_TYPE: 7,
    STATUS: 8,
    WP_STATUS: 9,
    REDIRECT: 10,
    INCOMING: 11,
    OUTGOING: 12,
    IMAGES: 13,
    PDFS: 14,
    PUBLISHED_DATE: 15,
    PUBLISHED_TIME: 16,
    LAST_UPDATED: 17,
    PAGE_AGE: 18,
    UPDATED_TIME: 19,
    CRAWL_TIME: 20,
    METADATA: 21,
    CONTENT_SCORE: 22,
    REVIEW_PRIORITY: 23
};

    pages.forEach(page => {

        const row = sheet.addRow({

            id: page.id,
            title: page.title,
            url: page.url,
            parent: page.parent || "",
            depth: page.depth,
            type: page.type,
            wordpressType: page.wordpressType || "",
            statusCode: page.statusCode,
            wordpressStatus: page.wordpressStatus || "",
            redirected: page.redirected ? "Yes" : "",
            incomingLinkCount: page.incomingLinkCount || 0,
            outgoingLinkCount: page.outgoingLinkCount || 0,
            imageCount: page.imageCount || 0,
            pdfCount: page.pdfCount || 0,
            publishedDate: formatDate(page.published),
            publishedTime: formatTime(page.published),
            lastUpdatedDate: formatDate(page.lastModified),
            pageAge: getPageAge(page.lastModified),
            lastUpdatedTime: formatTime(page.lastModified),
            crawlTime: page.crawlTime,
            metadata:
    (
        page.title &&
        page.lastModified &&
        page.published &&
        page.wordpressStatus
    )
        ? "Complete"
        : "Incomplete",

contentScore: "",

reviewPriority: ""
        });

        const ageCell = row.getCell(COL.PAGE_AGE);

        const ageMonths =
            page.lastModified
                ? ((new Date().getFullYear() - new Date(page.lastModified).getFullYear()) * 12)
                + (new Date().getMonth() - new Date(page.lastModified).getMonth())
                : -1;

        if (ageMonths === -1) {

            ageCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD9D9D9" }
            };

            ageCell.font = {
                italic: true,
                bold: true
            };

        }
        else if (ageMonths <= 6) {

            ageCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFC6EFCE" }
            };

        }
        else if (ageMonths >= 36) {

            ageCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFFC7CE" }
            };

            ageCell.font = {
                bold: true
            };

}



    const statusCell = row.getCell(COL.STATUS);

    if (page.statusCode >= 200 && page.statusCode < 300) {

    statusCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFC6EFCE"
        }
    };

}
    else if (page.statusCode >= 300 && page.statusCode < 400) {

        statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFFFEB9C"
            }
        };

}
    else if (page.statusCode >= 400) {

        statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFFFC7CE"
            }
        };

}


    const redirectCell = row.getCell(COL.REDIRECT);

    if (page.redirected) {

        redirectCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFFFEB9C"
            }
        };

        redirectCell.font = {
            bold: true
        };

    }

    const crawlCell = row.getCell(COL.CRAWL_TIME);

if (page.crawlTime < 500) {

    crawlCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFC6EFCE"
        }
    };

}
else if (page.crawlTime < 1000) {

    crawlCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFEB9C"
        }
    };

}
else {

    crawlCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFC7CE"
        }
    };

}

crawlCell.alignment = {
    horizontal: "right"
};

crawlCell.numFmt = "#,##0";

const pdfCell = row.getCell(COL.PDFS);

if (page.pdfCount > 0) {

    pdfCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFDDEBF7"
        }
    };

    pdfCell.font = {
        bold: true
    };

}

const imageCell = row.getCell(COL.IMAGES);

if (page.imageCount === 0) {

    imageCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFF2F2F2"
        }
    };

    imageCell.font = {
        italic: true
    };

}
else if (page.imageCount > 20) {

    imageCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFCE4D6"
        }
    };

    imageCell.font = {
        bold: true
    };

}

const incomingCell = row.getCell(COL.INCOMING);

if (page.incomingLinkCount === 0) {

    incomingCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFC7CE"
        }
    };

    incomingCell.font = {
        bold: true
    };

}

const outgoingCell = row.getCell(COL.OUTGOING);

if (page.outgoingLinkCount === 0) {

    outgoingCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFEB9C"
        }
    };

    outgoingCell.font = {
        bold: true
    };

}

const metadataCell = row.getCell(COL.METADATA);

if (metadataCell.value === "Complete") {

    metadataCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFC6EFCE"
        }
    };

}
else {

    metadataCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFC7CE"
        }
    };

    metadataCell.font = {
        bold: true
    };

}

const scoreCell = row.getCell(COL.CONTENT_SCORE);

const priorityCell = row.getCell(COL.REVIEW_PRIORITY);

// Calculate Content Score
let score = 100;

// Broken pages
if ((page.statusCode || 0) >= 400) score -= 40;

// Redirects
if (page.redirected) score -= 5;

// No images
if (page.type === "Page" && (page.imageCount || 0) === 0)
    score -= 5;

// No outgoing links
if ((page.outgoingLinkCount || page.outgoingLinks || 0) === 0) score -= 10;

// No incoming links
if ((page.incomingLinkCount || page.incomingLinks || 0) === 0) score -= 10;

// Incomplete metadata
if (metadataCell.value === "Incomplete") score -= 15;

// Old content
if (ageMonths >= 36) score -= 15;

// Unknown age
if (ageMonths === -1) score -= 10;

// Slow crawl
if ((page.crawlTime || 0) > 1000) score -= 10;

// Prevent negative scores
score = Math.max(score, 0);

// Write score
scoreCell.value = score;

if (score >= 90) {

    scoreCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFC6EFCE"
        }
    };

}
else if (score >= 70) {

    scoreCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFEB9C"
        }
    };

}
else {

    scoreCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFC7CE"
        }
    };

    scoreCell.font = {
        bold: true
    };

}

if (score >= 90) {

    priorityCell.value = "Excellent";

}
else if (score >= 70) {

    priorityCell.value = "Good";

}
else if (score >= 50) {

    priorityCell.value = "Review";

}
else if (score >= 30) {

    priorityCell.value = "High Priority";

}
else {

    priorityCell.value = "Critical";

}

switch (priorityCell.value) {

    case "Excellent":

        priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFC6EFCE"
            }
        };

        break;

    case "Good":

        priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFDDEBF7"
            }
        };

        break;

    case "Review":

        priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFFFEB9C"
            }
        };

        break;

    default:

        priorityCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFFFC7CE"
            }
        };

        priorityCell.font = {
            bold: true
        };

}

const urlCell = row.getCell(COL.URL);

urlCell.value = {
    text: page.url,
    hyperlink: page.url
};

urlCell.font = {
    color: { argb: "FF0563C1" },
    underline: true
};

row.getCell(COL.ID).alignment = { horizontal: "center" };
row.getCell(COL.DEPTH).alignment = { horizontal: "center" };
row.getCell(COL.STATUS).alignment = { horizontal: "center" };
row.getCell(COL.WP_STATUS).alignment = { horizontal: "center" };
row.getCell(COL.REDIRECT).alignment = { horizontal: "center" };

row.getCell(COL.INCOMING).alignment = { horizontal: "right" };
row.getCell(COL.OUTGOING).alignment = { horizontal: "right" };
row.getCell(COL.IMAGES).alignment = { horizontal: "right" };
row.getCell(COL.PDFS).alignment = { horizontal: "right" };
row.getCell(COL.CRAWL_TIME).alignment = { horizontal: "right" };

row.getCell(COL.PUBLISHED_DATE).alignment = { horizontal: "center" };
row.getCell(COL.PUBLISHED_TIME).alignment = { horizontal: "center" };
row.getCell(COL.LAST_UPDATED).alignment = { horizontal: "center" };
row.getCell(COL.PAGE_AGE).alignment = { horizontal: "center" };
row.getCell(COL.UPDATED_TIME).alignment = { horizontal: "center" };

row.getCell(COL.METADATA).alignment = { horizontal: "center" };
row.getCell(COL.CONTENT_SCORE).alignment = { horizontal: "center" };
row.getCell(COL.REVIEW_PRIORITY).alignment = { horizontal: "center" };

row.getCell(COL.INCOMING).numFmt = "#,##0";
row.getCell(COL.OUTGOING).numFmt = "#,##0";
row.getCell(COL.IMAGES).numFmt = "#,##0";
row.getCell(COL.PDFS).numFmt = "#,##0";
row.getCell(COL.CONTENT_SCORE).numFmt = "0";

});

    sheet.getRow(1).font = {
        bold: true
    };
    sheet.getRow(1).height = 24;

    sheet.getRow(1).alignment = {
        horizontal: "center",
        vertical: "middle"
    };

    sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FF0057B8"
        }
    };

    sheet.getRow(1).font = {
        bold: true,
        color: {
            argb: "FFFFFFFF"
        }
    };

    sheet.getRow(1).eachCell(cell => {

        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        };

});

    sheet.views = [
        {
            state: "frozen",
            ySplit: 1
        }
    ];

    sheet.autoFilter = {
        from: "A1",
        to: "W1"
    }; 

    sheet.getColumn(2).width = 40;   // Title
    sheet.getColumn(3).width = 65;   // URL
    sheet.getColumn(4).width = 40;   // Parent

    sheet.getColumn(1).width = 8;
    sheet.getColumn(5).width = 8;
    sheet.getColumn(6).width = 15;
    sheet.getColumn(7).width = 15;
    sheet.getColumn(8).width = 12;
    sheet.getColumn(9).width = 15;
    sheet.getColumn(10).width = 10;
    sheet.getColumn(11).width = 16;
    sheet.getColumn(12).width = 16;
    sheet.getColumn(13).width = 10;
    sheet.getColumn(14).width = 10;
    sheet.getColumn(15).width = 15;
    sheet.getColumn(16).width = 12;
    sheet.getColumn(17).width = 15;
    sheet.getColumn(18).width = 14;
    sheet.getColumn(19).width = 12;
    sheet.getColumn(20).width = 16;
    sheet.getColumn(21).width = 14;
    sheet.getColumn(22).width = 14;
    sheet.getColumn(23).width = 18;

    sheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1
    };

    sheet.properties.defaultRowHeight = 20;

    workbook.views = [
        {
            activeTab: 1
        }
    ];

    const filename = path.join(
        config.outputFolder,
        config.excelFile
    );

    await workbook.xlsx.writeFile(filename);

    console.log("");
    console.log("========================================");
    console.log(" Excel Export Complete");
    console.log("========================================");
    console.log(`Excel : ${filename}`);
    console.log("========================================");
    console.log("");

}

module.exports = {
    exportExcel
};