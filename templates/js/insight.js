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
            id: "links",
            icon: "🔗",
            title: "Internal Links"
        },

        {
            id: "media",
            icon: "🖼",
            title: "Media Inventory"
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