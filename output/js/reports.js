// ==========================================================
// Reports
// ==========================================================

"use strict";

// ----------------------------------------------------------
// Broken Pages
// ----------------------------------------------------------

function renderBrokenPages(){

    const broken = pages.filter(page =>
        page.statusCode >= 400 || page.error
    );

    let html = `

        <h2>❌ Broken Pages</h2>

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Status</th>
                    <th>Title</th>
                    <th>URL</th>
                    <th>Error</th>
                    <th>Incoming</th>

                </tr>

            </thead>

            <tbody>

    `;

    broken.forEach(page=>{

        html += `

            <tr onclick="showPageById(${page.id})">

                <td>${page.statusCode ?? "-"}</td>

                <td>${page.title}</td>

                <td>${page.url}</td>

                <td>${page.error ?? "-"}</td>

                <td>${page.incomingLinks?.length ?? 0}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Redirects
// ----------------------------------------------------------

function renderRedirects(){

    const redirects = pages.filter(page => page.redirected);

    let html = `

        <h2>↪ Redirects</h2>

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Status</th>
                    <th>Title</th>
                    <th>Original URL</th>
                    <th>Redirects To</th>

                </tr>

            </thead>

            <tbody>

    `;

    redirects.forEach(page=>{

        html += `

            <tr onclick="showPageById(${page.id})">

                <td>${page.statusCode}</td>

                <td>${page.title}</td>

                <td>${page.url}</td>

                <td>${page.redirectTarget || "-"}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Orphan Pages
// ----------------------------------------------------------

function renderOrphanPages(){

    const orphans = pages.filter(page => page.orphan);

    let html = `

        <h2>🌱 Orphan Pages</h2>

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Title</th>
                    <th>URL</th>
                    <th>Content Type</th>
                    <th>Last Modified</th>

                </tr>

            </thead>

            <tbody>

    `;

    orphans.forEach(page=>{

        html += `

            <tr onclick="showPageById(${page.id})">

                <td>${page.title}</td>

                <td>${page.url}</td>

                <td>${page.contentType}</td>

                <td>${page.lastModified || "-"}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Freshness
// ----------------------------------------------------------

function renderFreshnessReport(){

    const sorted = [...pages].sort((a,b)=>{

        const dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
        const dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);

        return dateA - dateB;

    });

    let html = `

        <h2>🕒 Content Freshness</h2>

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Last Modified</th>
                    <th>Title</th>
                    <th>Content Type</th>

                </tr>

            </thead>

            <tbody>

    `;

    sorted.forEach(page=>{

        html += `

            <tr onclick="showPageById(${page.id})">

                <td>${
                    page.lastModified
                        ? new Date(page.lastModified).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        })
                        : "-"
                }</td>

                <td>${page.title}</td>

                <td>${page.contentType}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Internal Links
// ----------------------------------------------------------

function renderInternalLinks(){

    const sorted = [...pages].sort((a,b)=>
        (b.outgoingLinkCount || 0) - (a.outgoingLinkCount || 0)
    );

    let html = `

        <h2>🔗 Internal Links</h2>

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Title</th>
                    <th>Incoming</th>
                    <th>Outgoing</th>
                    <th>External</th>

                </tr>

            </thead>

            <tbody>

    `;

    sorted.forEach(page=>{

        html += `

            <tr onclick="showPageById(${page.id})">

                <td>${page.title}</td>

                <td>${page.incomingLinkCount || 0}</td>

                <td>${page.outgoingLinkCount || 0}</td>

                <td>${page.externalLinks?.length || 0}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Media
// ----------------------------------------------------------

function renderMediaInventory(){

    const sorted = [...pages].sort((a,b)=>

        ((b.imageCount || 0) + (b.pdfCount || 0)) -

        ((a.imageCount || 0) + (a.pdfCount || 0))

    );

    let html = `

        <h2>🖼 Media Inventory</h2>

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Title</th>
                    <th>Images</th>
                    <th>PDFs</th>
                    <th>Total</th>

                </tr>

            </thead>

            <tbody>

    `;

    sorted.forEach(page=>{

        const total = (page.imageCount || 0) + (page.pdfCount || 0);

        html += `

            <tr onclick="showPageById(${page.id})">

                <td>${page.title}</td>

                <td>${page.imageCount || 0}</td>

                <td>${page.pdfCount || 0}</td>

                <td>${total}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Generic Report Renderer
// ----------------------------------------------------------

function renderSimpleReport(title,data){

    let html = `

        <h2>${title}</h2>

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Title</th>

                    <th>Content Type</th>

                    <th>Status</th>

                </tr>

            </thead>

            <tbody>

    `;

    data.forEach(page=>{

        html += `

            <tr onclick="showPageById('${page.id}')">

                <td>${page.title}</td>

                <td>${page.contentType}</td>

                <td>${page.statusCode}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Open page
// ----------------------------------------------------------

function showPageById(id){

    pageReturnView = currentView;

    const page = pages.find(p => p.id === Number(id));

    if(page){

        showPage(page);

    }

}