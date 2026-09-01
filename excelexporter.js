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

function formatDuration(milliseconds) {

    if (!milliseconds) return "";

    const totalSeconds = Math.round(milliseconds / 1000);

    const minutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;

    return `${minutes}m ${seconds}s`;

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

// ======================================================
// Helper Functions
// ======================================================

function getAgeMonths(lastModified) {

    if (!lastModified) return -1;

    const updated = new Date(lastModified);
    const today = new Date();

    return (
        (today.getFullYear() - updated.getFullYear()) * 12 +
        (today.getMonth() - updated.getMonth())
    );

}

function isMetadataComplete(page) {

    return !!(
        page.title &&
        page.lastModified &&
        page.published &&
        page.wordpressStatus
    );

}

function calculateContentScore(page, ageMonths, metadataComplete) {

    let score = 100;

    if ((page.statusCode || 0) >= 400) score -= 40;

    if (page.redirected) score -= 5;

    if (page.contentType === "Standard Page" && (page.imageCount || 0) === 0)
        score -= 5;

    if ((page.outgoingLinkCount || page.outgoingLinks || 0) === 0)
        score -= 10;

    if ((page.incomingLinkCount || page.incomingLinks || 0) === 0)
        score -= 10;

    if (!metadataComplete)
        score -= 15;

    if (ageMonths >= 36)
        score -= 15;

    if (ageMonths === -1)
        score -= 10;

    if ((page.crawlTime || 0) > 1000)
        score -= 10;

    return Math.max(score, 0);

}

function getReviewPriority(score) {

    if (score >= 90) return "Excellent";

    if (score >= 70) return "Good";

    if (score >= 50) return "Review";

    if (score >= 30) return "High Priority";

    return "Critical";

}

// ======================================================
// Cell Formatting Helpers
// ======================================================

function fillCell(cell, colour) {

    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: colour }
    };

}

function bold(cell) {

    cell.font = {
        ...(cell.font || {}),
        bold: true
    };

}

function italic(cell) {

    cell.font = {
        ...(cell.font || {}),
        italic: true
    };

}

function formatAgeCell(cell, ageMonths) {

    if (ageMonths === -1) {

        fillCell(cell, "FFD9D9D9");
        bold(cell);
        italic(cell);
        return;

    }

    if (ageMonths <= 6) {

        fillCell(cell, "FFC6EFCE");
        return;

    }

    if (ageMonths >= 36) {

        fillCell(cell, "FFFFC7CE");
        bold(cell);

    }

}

function formatStatusCell(cell, statusCode) {

    if (statusCode >= 200 && statusCode < 300) {

        fillCell(cell, "FFC6EFCE");

    }
    else if (statusCode >= 300 && statusCode < 400) {

        fillCell(cell, "FFFFEB9C");

    }
    else if (statusCode >= 400) {

        fillCell(cell, "FFFFC7CE");

    }

}

function formatRedirectCell(cell, redirected) {

    if (!redirected) return;

    fillCell(cell, "FFFFEB9C");
    bold(cell);

}

function formatCrawlCell(cell, crawlTime) {

    if (crawlTime < 500) {

        fillCell(cell, "FFC6EFCE");

    }
    else if (crawlTime < 1000) {

        fillCell(cell, "FFFFEB9C");

    }
    else {

        fillCell(cell, "FFFFC7CE");

    }

    cell.alignment = {
        horizontal: "right"
    };

    cell.numFmt = "#,##0";

}

function formatImageCell(cell, imageCount) {

    if (imageCount === 0) {

        fillCell(cell, "FFF2F2F2");
        italic(cell);

    }
    else if (imageCount > 20) {

        fillCell(cell, "FFFCE4D6");
        bold(cell);

    }

}

function formatPdfCell(cell, pdfCount) {

    if (pdfCount > 0) {

        fillCell(cell, "FFDDEBF7");
        bold(cell);

    }

}

function formatIncomingCell(cell, incomingLinks) {

    if (incomingLinks === 0) {

        fillCell(cell, "FFFFC7CE");
        bold(cell);

    }

}

function formatOutgoingCell(cell, outgoingLinks) {

    if (outgoingLinks === 0) {

        fillCell(cell, "FFFFEB9C");
        bold(cell);

    }

}

function formatMetadataCell(cell, complete) {

    if (complete) {

        fillCell(cell, "FFC6EFCE");

    }
    else {

        fillCell(cell, "FFFFC7CE");
        bold(cell);

    }

}

function formatScoreCell(cell, score) {

    if (score >= 90) {

        fillCell(cell, "FFC6EFCE");

    }
    else if (score >= 70) {

        fillCell(cell, "FFFFEB9C");

    }
    else {

        fillCell(cell, "FFFFC7CE");
        bold(cell);

    }

}

function formatPriorityCell(cell, priority) {

    switch (priority) {

        case "Excellent":

            fillCell(cell, "FFC6EFCE");
            break;

        case "Good":

            fillCell(cell, "FFDDEBF7");
            break;

        case "Review":

            fillCell(cell, "FFFFEB9C");
            break;

        default:

            fillCell(cell, "FFFFC7CE");
            bold(cell);

    }

}

async function exportExcel(pages, summary) {

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "ClubHub Insight v1.0";
    workbook.created = new Date();

const brokenPages = pages.filter(p => p.statusCode >= 400).length;

const orphanPages = pages.filter(p => p.orphan).length;

const standardPagesCount = pages.filter(p => p.contentType === "Standard Page").length;

const categoryCount = pages.filter(p => p.contentType === "Category").length;

const toolkitCount = pages.filter(p => p.contentType === "Toolkit").length;

const topicCount = pages.filter(p => p.contentType === "Topic").length;

    // ======================================================
// README
// ======================================================

const readme = workbook.addWorksheet("README");

readme.columns = [
    { width: 30 },
    { width: 80 }
];

// ------------------------------------------------------
// Title
// ------------------------------------------------------

readme.mergeCells("A1:B1");

readme.getCell("A1").value = "ClubHub Insight";

readme.getCell("A1").font = {
    name: "Calibri",
    size: 22,
    bold: true,
    color: { argb: "FFFFFFFF" }
};

readme.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle"
};

readme.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0057B8" }
};

readme.getRow(1).height = 32;

// ------------------------------------------------------
// Purpose
// ------------------------------------------------------

readme.getCell("A3").value = "Purpose";
readme.getCell("A3").font = { bold: true, size: 14 };

readme.mergeCells("A4:B5");

readme.getCell("A4").value =
    "ClubHub Insight helps you understand, review and improve large websites by providing a complete view of their structure, content and quality.";

readme.getCell("A4").alignment = {
    wrapText: true,
    vertical: "middle",
    horizontal: "left"
};

readme.getRow(4).height = 24;
readme.getRow(5).height = 24;

// ------------------------------------------------------
// What it Helps You Do
// ------------------------------------------------------

readme.getCell("A6").value = "It enables you to:";
readme.getCell("A6").font = { bold: true };

const bullets = [
    "Understand how the website is organised.",
    "Identify outdated, duplicate and orphaned content.",
    "Explore relationships between pages.",
    "Prioritise content reviews and improvements.",
    "Make evidence-based decisions rather than relying on guesswork."
];

bullets.forEach((item, index) => {
    readme.getCell(`B${7 + index}`).value = "• " + item;
});

// ------------------------------------------------------
// Goal
// ------------------------------------------------------

readme.getCell("A14").value = "Our Goal";
readme.getCell("A14").font = { bold: true, size: 14 };

readme.mergeCells("A15:B15");

readme.getCell("A15").value =
    'Every report is designed to help answer one simple question:\n\n"What should we do next?"';

readme.getCell("A15").alignment = {
    wrapText: true,
    horizontal: "center"
};

readme.getCell("A15").font = {
    italic: true,
    size: 13
};

readme.getRow(15).height = 48;

// ------------------------------------------------------
// Tagline
// ------------------------------------------------------

readme.mergeCells("A18:B18");

readme.getCell("A18").value =
    "Understand • Review • Improve";

readme.getCell("A18").font = {
    bold: true,
    italic: true,
    size: 12
};

readme.getCell("A18").alignment = {
    horizontal: "center"
};

// ------------------------------------------------------
// Sheet Settings
// ------------------------------------------------------

readme.views = [
    {
        state: "frozen",
        ySplit: 1
    }
];

readme.pageSetup = {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1
};

    const overview = workbook.addWorksheet("Overview");

    overview.columns = [
        { header: "Metric", key: "metric", width: 35 },
        { header: "Value", key: "value", width: 18 }
    ];

   
    
    overview.getCell("A1").value = "ClubHub Insight Overview";
    overview.getCell("A2").value = "";
    overview.getCell("B2").value = "";

    overview.getCell("A3").value = "";
    overview.getCell("B3").value = "";

    overview.mergeCells("A4:B4");

    overview.getCell("A4").value =
        "ClubHub Insight v1.0";

    overview.getCell("A4").alignment = {
        horizontal: "center"
    };

    overview.getCell("A4").font = {
        bold: true,
        italic: true
    };

    overview.getCell("A6").value = "Executive Summary";

    const overviewSummary = [

        // ===========================
        // Report Information
        // ===========================

        ["Website", config.baseUrl],

        [
            "Crawl Date",
            new Date(summary.crawlDate).toLocaleString("en-GB")
        ],

        [
            "Crawl Duration",
            formatDuration(summary.crawlDuration)
        ],

        ["Version", "ClubHub Insight v1.0"],

        ["", ""],

        // ===========================
        // Crawl Statistics
        // ===========================

        ["Pages Discovered", summary.pagesDiscovered],

        ["Pages Crawled Successfully", summary.pagesSuccessful],

        ["Pages Failed to Crawl", summary.pagesFailed],

        ["", ""],

        // ===========================
        // Website Inventory
        // ===========================

        ["Standard Pages", standardPagesCount],

        ["Categories", categoryCount],

        ["Toolkits", toolkitCount],

        ["Topics", topicCount],

        ["Images Found", summary.imagesFound],

        ["PDF Links Found", summary.pdfLinksFound],

        ["", ""],

        // ===========================
        // Website Health
        // ===========================

        ["Broken Pages", brokenPages],

        ["Redirects Encountered", summary.redirectsEncountered],

        ["Orphan Pages", orphanPages],

        ["", ""],

        // ===========================
        // Link Analysis
        // ===========================

        ["Internal Links Found", summary.internalLinksFound],

        ["External Links Found", summary.externalLinksFound],

        ["", ""],

        // ===========================
        // Performance
        // ===========================

        [
            "Average Page Load (ms)",
            `${summary.averageLoad} ms`
        ]

    ];

overviewSummary.forEach((item, index) => {
    const row = 7 + index;

    overview.getCell(`A${row}`).value = item[0];
    overview.getCell(`B${row}`).value = item[1];
});

    const overviewLastRow = 6 + overviewSummary.length;

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





for (let row = 7; row <= overviewLastRow; row++) {

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

for (let row = 7; row <= overviewLastRow; row++) {

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

for (let row = 7; row <= overviewLastRow; row++) {

    overview.getRow(row).height = 20;

}

overview.pageSetup = {

    orientation: "portrait",

    fitToPage: true,

    fitToWidth: 1

};

// ======================================================
// Site Tree
// ======================================================

const treeSheet = workbook.addWorksheet("Site Tree");

treeSheet.columns = [
    { header: "Site Structure", key: "tree", width: 120 }
];

function addTreeNode(page, prefix = "", isLast = true) {

    const hasChildren = page.children.length > 0;

    const icon = hasChildren ? "📁" : "📄";

    const connector = prefix
        ? (isLast ? "└── " : "├── ")
        : "";

    const label = hasChildren
        ? `${icon} ${page.title} (${page.children.length})`
        : `${icon} ${page.title}`;

    treeSheet.addRow({

        tree: `${prefix}${connector}${label}`

    });

    const row = treeSheet.lastRow;

    if (hasChildren) {

        row.getCell(1).font = {

            bold: true

        };

    }

    page.children.forEach((child, index) => {

        const lastChild = index === page.children.length - 1;

        addTreeNode(

            child,

            prefix + (isLast ? "    " : "│   "),

            lastChild

        );

    });

}

pages
    .filter(page => page.parent === null)
    .forEach(page => addTreeNode(page));

treeSheet.getRow(1).font = {
    bold: true,
    color: { argb: "FFFFFFFF" }
};

treeSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0057B8" }
};

treeSheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle"
};

treeSheet.views = [{
    state: "frozen",
    ySplit: 1
}];

treeSheet.autoFilter = {
    from: "A1",
    to: "A1"
};

treeSheet.pageSetup = {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1
};

treeSheet.properties.defaultRowHeight = 20;


// ======================================================
// Content Inventory
// ======================================================
    const sheet = workbook.addWorksheet("Content Inventory");

    sheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Title", key: "title", width: 45 },
        { header: "URL", key: "url", width: 70 },
        { header: "Parent", key: "parent", width: 50 },
        { header: "Depth", key: "depth", width: 8 },
        { header: "Content Type", key: "contentType", width: 18 },
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
        contentType: page.contentType,
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

        metadata: "",

        contentScore: "",

        reviewPriority: ""
    });

        const ageMonths = getAgeMonths(page.lastModified);

        const metadataComplete = isMetadataComplete(page);

        const score = calculateContentScore(
            page,
            ageMonths,
            metadataComplete
        );

        const priority = getReviewPriority(score);

        const ageCell = row.getCell(COL.PAGE_AGE);
        const statusCell = row.getCell(COL.STATUS);
        const redirectCell = row.getCell(COL.REDIRECT);
        const crawlCell = row.getCell(COL.CRAWL_TIME);
        const imageCell = row.getCell(COL.IMAGES);
        const pdfCell = row.getCell(COL.PDFS);
        const incomingCell = row.getCell(COL.INCOMING);
        const outgoingCell = row.getCell(COL.OUTGOING);
        const metadataCell = row.getCell(COL.METADATA);
        const scoreCell = row.getCell(COL.CONTENT_SCORE);
        const priorityCell = row.getCell(COL.REVIEW_PRIORITY);
        const urlCell = row.getCell(COL.URL);

    // Apply formatting

    formatAgeCell(
        ageCell,
        ageMonths
    );

    formatStatusCell(
        statusCell,
        page.statusCode
    );

    formatRedirectCell(
        redirectCell,
        page.redirected
    );

    formatCrawlCell(
        crawlCell,
        page.crawlTime
    );

    formatImageCell(
        imageCell,
        page.imageCount || 0
    );

    formatPdfCell(
        pdfCell,
        page.pdfCount || 0
    );

    formatIncomingCell(
        incomingCell,
        page.incomingLinkCount || 0
    );

    formatOutgoingCell(
        outgoingCell,
        page.outgoingLinkCount || 0
    );

    let metadataStatus = "Incomplete";

    if (!page.wordpressType) {
        metadataStatus = "Not Available";
    }
    else if (metadataComplete) {
        metadataStatus = "Complete";
    }

    metadataCell.value = metadataStatus;

    formatMetadataCell(
        metadataCell,
        metadataComplete
    );

    scoreCell.value = score;

    formatScoreCell(
        scoreCell,
        score
    );

    priorityCell.value = priority;

    formatPriorityCell(
        priorityCell,
        priority
    );

        // Hyperlink

    urlCell.value = {
        text: page.url,
        hyperlink: page.url
    };

    urlCell.font = {
        color: {
            argb: "FF0563C1"
        },
        underline: true
    };

        // Alignment

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

    // Number formats

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

// ======================================================
// Content Freshness
// ======================================================

const freshnessSheet = workbook.addWorksheet("Content Freshness");

freshnessSheet.columns = [
    { header: "Title", key: "title", width: 45 },
    { header: "Last Updated", key: "updated", width: 18 },
    { header: "Page Age", key: "age", width: 15 },
    { header: "Review Status", key: "status", width: 18 },
    { header: "Priority", key: "priority", width: 18 }
];

pages.forEach(page => {

    const ageMonths = getAgeMonths(page.lastModified);

    let reviewStatus = "Current";

    if (ageMonths >= 36) {

        reviewStatus = "Overdue";

    }
    else if (ageMonths >= 12) {

        reviewStatus = "Review";

    }

    const priority = getReviewPriority(
        calculateContentScore(
            page,
            ageMonths,
            isMetadataComplete(page)
        )
    );

    freshnessSheet.addRow({

        title: page.title,
        updated: formatDate(page.lastModified),
        age: getPageAge(page.lastModified),
        status: reviewStatus,
        priority

    });

    const row = freshnessSheet.lastRow;

    if (reviewStatus === "Current") {

    fillCell(row.getCell(4), "FFC6EFCE");

}
else if (reviewStatus === "Review") {

    fillCell(row.getCell(4), "FFFFEB9C");
    bold(row.getCell(4));

}
else {

    fillCell(row.getCell(4), "FFFFC7CE");
    bold(row.getCell(4));

}

formatPriorityCell(
    row.getCell(5),
    priority
);

});

freshnessSheet.getRow(1).font = {
    bold: true,
    color: {
        argb: "FFFFFFFF"
    }
};

freshnessSheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle"
};

freshnessSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: "FF0057B8"
    }
};

freshnessSheet.getRow(1).height = 24;

freshnessSheet.views = [
    {
        state: "frozen",
        ySplit: 1
    }
];

freshnessSheet.autoFilter = {
    from: "A1",
    to: "E1"
};

freshnessSheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1
};

freshnessSheet.properties.defaultRowHeight = 20;


// ======================================================
// Broken Pages
// ======================================================

const brokenSheet = workbook.addWorksheet("Broken Pages");

brokenSheet.columns = [
    { header: "Status", key: "status", width: 12 },
    { header: "Title", key: "title", width: 45 },
    { header: "URL", key: "url", width: 70 },
    { header: "Parent", key: "parent", width: 40 },
    { header: "Content Type", key: "contentType", width: 18 },
    { header: "Last Updated", key: "lastUpdated", width: 16 }
];

pages
    .filter(page => page.statusCode >= 400)
    .forEach(page => {

        brokenSheet.addRow({
            status: page.statusCode,
            title: page.title,
            url: page.url,
            parent: page.parent || "",
            contentType: page.contentType,
            lastUpdated: formatDate(page.lastModified)
        });

    });

    brokenSheet.getRow(1).font = {
    bold: true,
    color: {
        argb: "FFFFFFFF"
    }
};

brokenSheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle"
};

brokenSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: "FF0057B8"
    }
};

brokenSheet.getRow(1).height = 24;

brokenSheet.views = [
    {
        state: "frozen",
        ySplit: 1
    }
];

brokenSheet.autoFilter = {
    from: "A1",
    to: "F1"
};

brokenSheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1
};

brokenSheet.properties.defaultRowHeight = 20;

// ======================================================
// Redirects
// ======================================================

const redirectSheet = workbook.addWorksheet("Redirects");

redirectSheet.columns = [
    { header: "Title", key: "title", width: 45 },
    { header: "URL", key: "url", width: 70 },
    { header: "Status", key: "status", width: 12 },
    { header: "Redirect", key: "redirect", width: 12 },
    { header: "Redirect Target", key: "redirectTarget", width: 70 },
    { header: "Parent", key: "parent", width: 40 },
    { header: "Last Updated", key: "lastUpdated", width: 16 }
];

pages
    .filter(page => page.redirected)
    .forEach(page => {

        redirectSheet.addRow({
            title: page.title,
            url: page.url,
            status: page.statusCode,
            redirect: "Yes",
            redirectTarget: page.redirectTarget || "",
            parent: page.parent || "",
            lastUpdated: formatDate(page.lastModified)
        });

    });

    redirectSheet.getRow(1).font = {
    bold: true,
    color: {
        argb: "FFFFFFFF"
    }
};

redirectSheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle"
};

redirectSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: "FF0057B8"
    }
};

redirectSheet.getRow(1).height = 24;

redirectSheet.views = [
    {
        state: "frozen",
        ySplit: 1
    }
];

redirectSheet.autoFilter = {
    from: "A1",
    to: "F1"
};

redirectSheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1
};

redirectSheet.properties.defaultRowHeight = 20;

// ======================================================
// Orphan Pages
// ======================================================

const orphanSheet = workbook.addWorksheet("Orphan Pages");

orphanSheet.columns = [
    { header: "Title", key: "title", width: 45 },
    { header: "URL", key: "url", width: 70 },
    { header: "Content Type", key: "contentType", width: 18 },
    { header: "Depth", key: "depth", width: 10 },
    { header: "Last Updated", key: "lastUpdated", width: 16 }
];

pages
    .filter(page => page.orphan)
    .forEach(page => {

        orphanSheet.addRow({
            title: page.title,
            url: page.url,
            contentType: page.contentType,
            depth: page.depth,
            lastUpdated: formatDate(page.lastModified)
        });

    });

   orphanSheet.getRow(1).font = {
    bold: true,
    color: {
        argb: "FFFFFFFF"
    }
};

orphanSheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle"
};

orphanSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: "FF0057B8"
    }
};

orphanSheet.getRow(1).height = 24;

orphanSheet.views = [
    {
        state: "frozen",
        ySplit: 1
    }
];

orphanSheet.autoFilter = {
    from: "A1",
    to: "E1"
};

orphanSheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1
};

orphanSheet.properties.defaultRowHeight = 20; 

// ======================================================
// Internal Links
// ======================================================

const linksSheet = workbook.addWorksheet("Internal Links");

linksSheet.columns = [
    { header: "Title", key: "title", width: 45 },
    { header: "URL", key: "url", width: 70 },
    { header: "Incoming Links", key: "incoming", width: 18 },
    { header: "Outgoing Links", key: "outgoing", width: 18 },
    { header: "Link Health", key: "health", width: 18 }
];

pages
    .forEach(page => {

        let health = "Good";

        if (page.incomingLinkCount === 0) {

            health = "Orphan";

        }
        else if (page.outgoingLinkCount === 0) {

            health = "Dead End";

        }

        linksSheet.addRow({

            title: page.title,
            url: page.url,
            incoming: page.incomingLinkCount || 0,
            outgoing: page.outgoingLinkCount || 0,
            health

        });

        const row = linksSheet.lastRow;

if (health === "Good") {

    fillCell(row.getCell(5), "FFC6EFCE");

}
else if (health === "Dead End") {

    fillCell(row.getCell(5), "FFFFEB9C");
    bold(row.getCell(5));

}
else {

    fillCell(row.getCell(5), "FFFFC7CE");
    bold(row.getCell(5));

}

    });

    linksSheet.getRow(1).font = {
    bold: true,
    color: {
        argb: "FFFFFFFF"
    }
};

linksSheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle"
};

linksSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: "FF0057B8"
    }
};

linksSheet.getRow(1).height = 24;

linksSheet.views = [
    {
        state: "frozen",
        ySplit: 1
    }
];

linksSheet.autoFilter = {
    from: "A1",
    to: "E1"
};

linksSheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1
};

linksSheet.properties.defaultRowHeight = 20;

// ======================================================
// Media Inventory
// ======================================================

const mediaSheet = workbook.addWorksheet("Media Inventory");

mediaSheet.columns = [
    { header: "Title", key: "title", width: 45 },
    { header: "URL", key: "url", width: 65 },
    { header: "Images", key: "images", width: 12 },
    { header: "PDFs", key: "pdfs", width: 12 },
    { header: "Total Assets", key: "total", width: 15 },
    { header: "Status", key: "status", width: 18 }
];

pages.forEach(page => {

    const images = page.imageCount || 0;
    const pdfs = page.pdfCount || 0;

    const total = images + pdfs;

    let status = "OK";

    if (total === 0) {

        status = "No Media";

    }
    else if (total >= 25) {

        status = "Heavy Page";

    }

    mediaSheet.addRow({

        title: page.title,
        url: page.url,
        images,
        pdfs,
        total,
        status

    });

    const row = mediaSheet.lastRow;

    if (status === "OK") {

    fillCell(row.getCell(6), "FFC6EFCE");

}
else if (status === "Heavy Page") {

    fillCell(row.getCell(6), "FFFFEB9C");
    bold(row.getCell(6));

}
else {

    fillCell(row.getCell(6), "FFD9EAD3");
}

});

mediaSheet.getRow(1).font = {
    bold: true,
    color: {
        argb: "FFFFFFFF"
    }
};

mediaSheet.getRow(1).alignment = {
    horizontal: "center",
    vertical: "middle"
};

mediaSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
        argb: "FF0057B8"
    }
};

mediaSheet.getRow(1).height = 24;

mediaSheet.views = [{
    state: "frozen",
    ySplit: 1
}];

mediaSheet.autoFilter = {
    from: "A1",
    to: "F1"
};

mediaSheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1
};

mediaSheet.properties.defaultRowHeight = 20;

    workbook.views = [
        {
            activeTab: 0
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