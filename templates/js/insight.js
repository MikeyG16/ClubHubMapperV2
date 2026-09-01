// ==========================================================
// ClubHub Insight
// ==========================================================

"use strict";

// ----------------------------------------------------------
// Application State
// ----------------------------------------------------------

let filteredPages = [...pages];

let inventorySource = [...pages];

let selectedPage = null;

let currentView = "dashboard";

let pageReturnView = "inventory";

let navigationSections = [];

// ----------------------------------------------------------
// Initialisation
// ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    initialise();

});

function initialise(){

    updateDashboard();

    buildNavigation();

    showWelcome();

    updateStatus(`Loaded ${pages.length} pages`);
    
    const search = document.getElementById("search");

        if (search) {

            search.addEventListener("keydown", e => {

                if (e.key === "Enter") {

                    performGlobalSearch();

                }

            });

        }

}


// ----------------------------------------------------------
// Navigation
// ----------------------------------------------------------

function buildNavigation(){

    const nav = document.getElementById("navigation");

    const sections = [

        {
            id: "dashboard",
            icon: "🏠",
            title: "Dashboard"
        },

        {
            id: "inventory",
            icon: "📄",
            title: "Content Inventory"
        },

        {
            id: "freshness",
            icon: "🕒",
            title: "Content Freshness"
        },

        {
            id: "broken",
            icon: "❌",
            title: "Broken Pages"
        },

        {
            id: "redirects",
            icon: "↪",
            title: "Redirects"
        },

        {
            id: "orphans",
            icon: "🌱",
            title: "Orphan Pages"
        },

        {
            id: "media",
            icon: "🖼",
            title: "Media Inventory"
        },

        {
            id: "composition",
            icon: "📊",
            title: "Website Composition"
        },

        {
            id: "tree",
            icon: "🌳",
            title: "Site Tree"
        }

    ]
    
    navigationSections = sections;

    nav.innerHTML = "";

    sections.forEach(section => {

        const item = document.createElement("button");

        item.className = "navButton";

        if(currentView === section.id){

            item.classList.add("activeNav");

        }

        item.innerHTML = `

            <span>${section.icon}</span>

            <span>${section.title}</span>

        `;

        item.onclick = () => {

            currentView = section.id;

            buildNavigation();

            renderView(section);

        };

        nav.appendChild(item);

    });

}

// ----------------------------------------------------------
// View Renderer
// ----------------------------------------------------------

function renderView(section){

    updateStatus(section.title);

    switch(section.id){

        case "dashboard":

            showWelcome();

            break;

        case "inventory":

            renderContentInventory();

            break;

        case "tree":

            renderSiteExplorer();

            break;

        case "freshness":

            renderFreshnessReport();

            break;

        case "broken":

            renderBrokenPages();

            break;

        case "redirects":

            renderRedirects();

            break;

        case "orphans":

            renderOrphanPages();

            break;

        case "links":

            renderInternalLinks();

            break;

        case "media":

            renderMediaInventory();

            break;

        case "composition":

            renderWebsiteComposition();

            break;

        default:

            document.getElementById("contentPanel").innerHTML = `

                <h2>${section.icon} ${section.title}</h2>

                <p>

                    This section will be developed next.

                </p>

            `;

    }

}


// ----------------------------------------------------------
// Welcome Panel
// ----------------------------------------------------------

function showWelcome(){

    const broken = pages.filter(p => p.statusCode >= 400).length;

    const redirects = pages.filter(p => p.redirected).length;

    const orphans = crawlSummary.orphanPages;

    document.getElementById("contentPanel").innerHTML = `

        <h2>Welcome to ClubHub Insight</h2>

        <p>
            ClubHub Insight provides an interactive audit of your website,
            helping you understand its structure, content quality and overall
            health.
        </p>

        <div class="summaryGrid">

            <div class="summaryCard reportCard">

                <h3>📋 Report Information</h3>

                <p><strong>Website:</strong><br>${crawlSummary.websiteName ?? crawlSummary.website ?? "-"}</p>

                <p><strong>Crawl Date:</strong><br>${new Date(crawlSummary.crawlDate).toLocaleString()}</p>

                <p><strong>Pages Crawled:</strong><br>${formatNumber(crawlSummary.pagesDiscovered)}</p>

                <p><strong>Version:</strong><br>ClubHub Insight v1.0</p>

            </div>

            <div class="summaryCard overviewCard">

                <h3>📄 Website Overview</h3>

                <p><strong>Pages:</strong> ${formatNumber(crawlSummary.pagesDiscovered)}</p>

                <p><strong>Images:</strong> ${formatNumber(crawlSummary.imagesFound)}</p>

                <p><strong>PDF Links:</strong> ${formatNumber(crawlSummary.pdfLinksFound)}</p>

                <p><strong>Internal Links:</strong> ${formatNumber(crawlSummary.internalLinksFound)}</p>

                <p><strong>External Links:</strong> ${formatNumber(crawlSummary.externalLinksFound)}</p>

            </div>

            <div class="summaryCard healthCard">

                <h3>❤️ Website Health</h3>

                <p><strong>Broken Pages:</strong> ${broken}</p>

                <p><strong>Redirects:</strong> ${redirects}</p>

                <p><strong>Orphan Pages:</strong> ${orphans}</p>

            </div>

            <div class="summaryCard performanceCard">

                <h3>⚡ Performance</h3>

                <p><strong>Crawl Duration:</strong> ${formatDuration(crawlSummary.crawlDuration)}</p>

                <p><strong>Average Load:</strong> ${formatNumber(crawlSummary.averageLoad)} ms</p>

                <p><strong>Pages Failed:</strong> ${crawlSummary.pagesFailed}</p>

            </div>

        </div>

    `;

}

// ----------------------------------------------------------
// Status Bar
// ----------------------------------------------------------

function updateStatus(message){

    document.getElementById("status").textContent = message;

}

// ----------------------------------------------------------
// Back Navigation
// ----------------------------------------------------------

function goBack(){

    const section = navigationSections.find(
        s => s.id === pageReturnView
    );

    if(section){

        currentView = pageReturnView;

        buildNavigation();

        renderView(section);

    }

}

function performGlobalSearch() {

    const searchBox = document.getElementById("search");

    if (!searchBox) return;

    currentView = "inventory";

    pageReturnView = "inventory";

    buildNavigation();

    renderContentInventory();

    const inventorySearch = document.getElementById("inventorySearch");

    if (inventorySearch) {

        inventorySearch.value = searchBox.value;

        filterInventory();

        inventorySearch.focus();

    }

}

// ----------------------------------------------------------
// Website Composition
// ----------------------------------------------------------

// ----------------------------------------------------------
// Website Composition
// ----------------------------------------------------------

function renderWebsiteComposition(){

    const composition = websiteComposition;

    if (!composition) {

        document.getElementById("contentPanel").innerHTML = `

            <h2>📊 Website Composition</h2>

            <p>
                Website composition data is not available.
            </p>

        `;

        return;

    }

    const totalPages =
        Number(composition.totalPages) || 0;

    const contentTypes =
        Object.entries(composition.contentTypes || {});

    const areas =
        Object.entries(composition.areas || {});

    const depths =
        Object.entries(composition.depths || {});


    function percentage(value){

        if (!totalPages) return "0%";

        return `${Math.round((value / totalPages) * 100)}%`;

    }


    function renderCompositionRows(items, labelFormatter){

        return items.map(([key, value]) => {

            const count = Number(value) || 0;

            return `

                <tr>

                    <td>

                        ${labelFormatter(key)}

                    </td>

                    <td class="compositionNumber">

                        ${formatNumber(count)}

                    </td>

                    <td class="compositionPercentage">

                        ${percentage(count)}

                    </td>

                </tr>

            `;

        }).join("");

    }


    document.getElementById("contentPanel").innerHTML = `

        <div class="compositionHeader">

            <h2>📊 Website Composition</h2>

            <p>

                A high-level view of what the website is made of,
                including content, structure, media and links.

            </p>

        </div>


        <!-- ==================================================
             Headline Metrics
             ================================================== -->

        <div class="summaryGrid compositionMetrics">


            <div class="summaryCard compositionMetricCard">

                <div class="compositionMetricIcon">📄</div>

                <div>

                    <div class="compositionMetricLabel">
                        TOTAL PAGES
                    </div>

                    <div class="compositionMetricValue">
                        ${formatNumber(totalPages)}
                    </div>

                    <div class="compositionMetricDescription">
                        Pages included in the crawl
                    </div>

                </div>

            </div>


            <div class="summaryCard compositionMetricCard">

                <div class="compositionMetricIcon">🖼</div>

                <div>

                    <div class="compositionMetricLabel">
                        MEDIA
                    </div>

                    <div class="compositionMetricValue">
                        ${formatNumber(composition.media.images)}
                    </div>

                    <div class="compositionMetricDescription">
                        Images
                    </div>

                    <div class="compositionMetricSecondary">
                        ${formatNumber(composition.media.pdfs)} PDFs
                    </div>

                </div>

            </div>


            <div class="summaryCard compositionMetricCard">

                <div class="compositionMetricIcon">🔗</div>

                <div>

                    <div class="compositionMetricLabel">
                        LINKS
                    </div>

                    <div class="compositionMetricValue">
                        ${formatNumber(composition.links.internal)}
                    </div>

                    <div class="compositionMetricDescription">
                        Internal links
                    </div>

                    <div class="compositionMetricSecondary">
                        ${formatNumber(composition.links.external)} external
                    </div>

                </div>

            </div>


        </div>


        <!-- ==================================================
             Content Type Distribution
             ================================================== -->

        <div class="reportSection compositionSection">

            <div class="compositionSectionHeader">

                <div>

                    <h3>📚 Content Type Distribution</h3>

                    <p>
                        How the crawled pages are classified by content type.
                    </p>

                </div>

                <span class="compositionSectionTotal">
                    ${formatNumber(totalPages)} pages
                </span>

            </div>


            <div class="compositionTableWrapper">

                <table class="reportTable compositionTable">

                    <thead>

                        <tr>

                            <th>Content Type</th>

                            <th class="numberColumn">Pages</th>

                            <th class="numberColumn">Share</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${renderCompositionRows(
                            contentTypes,
                            key => key
                        )}

                    </tbody>

                </table>

            </div>

        </div>


        <!-- ==================================================
             ClubHub Areas
             ================================================== -->

        <div class="reportSection compositionSection">

            <div class="compositionSectionHeader">

                <div>

                    <h3>🗂 ClubHub Areas</h3>

                    <p>
                        Distribution of pages across the main ClubHub areas.
                    </p>

                </div>

                <span class="compositionSectionTotal">
                    ${formatNumber(
                        areas.reduce(
                            (total, [, count]) =>
                                total + (Number(count) || 0),
                            0
                        )
                    )} assigned
                </span>

            </div>


            <div class="compositionTableWrapper">

                <table class="reportTable compositionTable">

                    <thead>

                        <tr>

                            <th>ClubHub Area</th>

                            <th class="numberColumn">Pages</th>

                            <th class="numberColumn">Share</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${renderCompositionRows(
                            areas,
                            key => key.replace(
                                " – British Gymnastics Club Hub Resources",
                                ""
                            )
                        )}

                    </tbody>

                </table>

            </div>

        </div>


        <!-- ==================================================
             Site Depth Distribution
             ================================================== -->

        <div class="reportSection compositionSection">

            <div class="compositionSectionHeader">

                <div>

                    <h3>🌳 Site Depth Distribution</h3>

                    <p>
                        How many pages sit at each level of the site hierarchy.
                    </p>

                </div>

            </div>


            <div class="compositionTableWrapper">

                <table class="reportTable compositionTable">

                    <thead>

                        <tr>

                            <th>Site Depth</th>

                            <th class="numberColumn">Pages</th>

                            <th class="numberColumn">Share</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${renderCompositionRows(
                            depths,
                            key => `Depth ${key}`
                        )}

                    </tbody>

                </table>

            </div>

        </div>


        <!-- ==================================================
             Media Composition
             ================================================== -->

        <div class="reportSection compositionSection">

            <div class="compositionSectionHeader">

                <div>

                    <h3>🖼 Media Composition</h3>

                    <p>
                        Media resources identified across the crawled pages.
                    </p>

                </div>

            </div>


            <div class="compositionMiniGrid">

                <div class="compositionMiniCard">

                    <span class="compositionMiniIcon">🖼</span>

                    <div>

                        <strong>
                            ${formatNumber(composition.media.images)}
                        </strong>

                        <span>
                            Images
                        </span>

                    </div>

                </div>


                <div class="compositionMiniCard">

                    <span class="compositionMiniIcon">📑</span>

                    <div>

                        <strong>
                            ${formatNumber(composition.media.pdfs)}
                        </strong>

                        <span>
                            PDFs
                        </span>

                    </div>

                </div>

            </div>

        </div>


        <!-- ==================================================
             Link Composition
             ================================================== -->

        <div class="reportSection compositionSection">

            <div class="compositionSectionHeader">

                <div>

                    <h3>🔗 Link Composition</h3>

                    <p>
                        Links identified across the crawled pages.
                    </p>

                </div>

            </div>


            <div class="compositionMiniGrid">

                <div class="compositionMiniCard">

                    <span class="compositionMiniIcon">↗</span>

                    <div>

                        <strong>
                            ${formatNumber(composition.links.internal)}
                        </strong>

                        <span>
                            Internal links
                        </span>

                    </div>

                </div>


                <div class="compositionMiniCard">

                    <span class="compositionMiniIcon">↗</span>

                    <div>

                        <strong>
                            ${formatNumber(composition.links.external)}
                        </strong>

                        <span>
                            External links
                        </span>

                    </div>

                </div>

            </div>

        </div>

    `;

}