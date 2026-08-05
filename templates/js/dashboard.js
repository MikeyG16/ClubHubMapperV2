// ==========================================================
// Dashboard
// ==========================================================

"use strict";

// ----------------------------------------------------------
// Dashboard
// ----------------------------------------------------------

function updateDashboard(){

    const dashboard = document.getElementById("dashboard");

    dashboard.innerHTML = "";

    const broken = pages.filter(p => p.statusCode >= 400).length;

    const redirects = pages.filter(p => p.redirected).length;

    const orphans = pages.filter(p => p.orphan).length;

    const images = crawlSummary.imagesFound;

    const pdfs = crawlSummary.pdfLinksFound;

    const internalLinks = crawlSummary.internalLinksFound;

    const externalLinks = crawlSummary.externalLinksFound;

    const averageLoad = crawlSummary.averageLoad;

    const cards = [

        { id:"dashboard", title:"📄 Pages", value:crawlSummary.pagesDiscovered },

        { id:"broken", title:"❌ Broken", value:broken },

        { id:"redirects", title:"↪ Redirects", value:redirects },

        { id:"orphans", title:"🌱 Orphans", value:orphans },

        { id:"media", title:"🖼️ Images", value:images },

        { id:"media", title:"📑 PDF Links", value:pdfs },

        { id:"links", title:"🔗 Internal Links", value:internalLinks },

        { id:"links", title:"🌐 External Links", value:externalLinks },


    ];

    cards.forEach(card=>{

        const element=document.createElement("div");

        element.className="card fade";

        element.innerHTML=`

            <h3>${card.title}</h3>

            <div class="value">

                ${card.value}

            </div>

        `;

        element.onclick = () => {

            const section = {

                id: card.id,

                title: card.title,

                icon: "📊"

            };

            currentView = card.id;

            buildNavigation();

            renderView(section);

        };

        dashboard.appendChild(element);

    });

}