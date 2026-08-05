// ==========================================================
// Page Inspector
// ==========================================================

"use strict";

function getPageByUrl(url){

    return pages.find(page =>
        page.url.replace(/\/$/, "") === url.replace(/\/$/, "")
    );

}

function toggleList(id, link){

    const list = document.getElementById(id);

    if(!list) return;

    const expanded = list.style.display === "block";

    if(expanded){

        list.style.display = "none";
        link.innerHTML = "▼ Show all";

    }else{

        list.style.display = "block";
        link.innerHTML = "▲ Show fewer";

    }

}

// ----------------------------------------------------------
// Open Page
// ----------------------------------------------------------

function showPageByIndex(index){

    pageReturnView = currentView;

    showPage(filteredPages[index]);

}

// ----------------------------------------------------------
// Page Inspector
// ----------------------------------------------------------

function showPage(page){

    selectedPage = page;

    document.getElementById("contentPanel").innerHTML = `

        <button class="backButton" onclick="goBack()">
            ← Back to Inventory
        </button>

        <br><br>

        <div class="pageHeader">

            <div>

                <h2>📄 ${page.title}</h2>

                <div class="pageUrl">
                    ${page.url}
                </div>

            </div>

            <div class="pageActions">

                <a class="actionButton"
                href="${page.url}"
                target="_blank">
                    🌐 Open Page
                </a>

                <button class="actionButton"
                        onclick="navigator.clipboard.writeText('${page.url}')">
                    📋 Copy URL
                </button>

            </div>

        </div>

        <br>

        <div class="inspector">

    <div class="card">

    <h3>Overview</h3>

    <div class="infoList">

    <div class="infoRow">
        <span class="infoLabel">Content Type</span>
        <span class="infoValue">${page.contentType}</span>
    </div>

    <div class="infoRow">
        <span class="infoLabel">Status</span>
        <span class="infoValue">${page.statusCode ?? "-"}</span>
    </div>

    <div class="infoRow">
        <span class="infoLabel">WordPress Status</span>
        <span class="infoValue">${page.wordpressStatus ?? "-"}</span>
    </div>

    <div class="infoRow">
        <span class="infoLabel">Depth</span>
        <span class="infoValue">${page.depth ?? "-"}</span>
    </div>

    <div class="infoRow">
        <span class="infoLabel">Crawl Time</span>
        <span class="infoValue">${page.crawlTime ?? "-"} ms</span>
    </div>

</div>

</div>

    <div class="card">

    <h3>Hierarchy</h3>

    <div class="infoList">

        <div class="infoRow">
            <span class="infoLabel">Parent Page</span>
            <span class="infoValue">
                ${
                    page.parent
                        ? (() => {
                            const parent = getPageByUrl(page.parent);
                            return parent
                                ? `<a href="#" onclick="showPage(getPageByUrl('${page.parent}'));return false;">${parent.title}</a>`
                                : page.parent;
                        })()
                        : "-"
                }
            </span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Sub-Pages</span>
            <span class="infoValue">

                ${
                    (page.children ?? []).length
                        ? (page.children ?? []).map(childId => {

                            const child = pages.find(p => p.id === childId);

                            return child
                                ? `<div>
                                        <a href="#" onclick="showPage(getPageByUrl('${child.url}'));return false;">
                                            ${child.title}
                                        </a>
                                </div>`
                                : "";

                        }).join("")
                        : "None"
                }

            </span>
        </div>

    </div>

</div>

    <div class="card">

    <h3>Content</h3>

    <div class="infoList">

        <div class="infoRow">
            <span class="infoLabel">Images</span>
            <span class="infoValue">${page.imageCount ?? 0}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">PDF Links</span>
            <span class="infoValue">${page.pdfCount ?? 0}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Internal Links</span>
            <span class="infoValue">${(page.internalLinks ?? []).length}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">External Links</span>
            <span class="infoValue">${(page.externalLinks ?? []).length}</span>
        </div>

    </div>

</div>

    <div class="card">

    <h3>WordPress</h3>

    <div class="infoList">

        <div class="infoRow">
            <span class="infoLabel">Slug</span>
            <span class="infoValue">${page.slug ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Content Type</span>
            <span class="infoValue">${page.wordpressType ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Status</span>
            <span class="infoValue">${page.wordpressStatus ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Published</span>
            <span class="infoValue">${page.published ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Last Modified</span>
            <span class="infoValue">${page.lastModified ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Author ID</span>
            <span class="infoValue">${page.authorId ?? "-"}</span>
        </div>

    </div>

</div>

    <div class="card">

    <h3>Relationships</h3>

    <div class="infoList">

        <div class="infoRow">

    <span class="infoLabel">
        🔗 Incoming Links (${(page.incomingLinks ?? []).length})
    </span>

    <span class="infoValue">

        ${
            (page.incomingLinks ?? [])
                .slice(0,5)
                .map(link=>{
                    const p = getPageByUrl(link);
                    return p
                        ? `<div><a href="#" onclick="showPage(getPageByUrl('${link}'));return false;">${p.title}</a></div>`
                        : `<div style="color:#777;">${link} <em>(not crawled)</em></div>`;
                }).join("")
        }

        ${
            (page.incomingLinks ?? []).length > 5
                ? `
                <div id="incoming-${page.id}" style="display:none">

                    ${
                        (page.incomingLinks ?? [])
                            .slice(5)
                            .map(link=>{
                                const p = getPageByUrl(link);
                                return p
                                    ? `<div><a href="#" onclick="showPage(getPageByUrl('${link}'));return false;">${p.title}</a></div>`
                                    : `<div style="color:#777;">${link} <em>(not crawled)</em></div>`;
                            }).join("")
                    }

                </div>

                <a href="#"
                    onclick="toggleList('incoming-${page.id}',this);return false;">
                    ▼ Show all ${(page.incomingLinks ?? []).length} links
                </a>
                `
                : ""
        }

    </span>

</div>

        <div class="infoRow">

    <span class="infoLabel">
        ↗ Outgoing Links (${(page.internalLinks ?? []).length})
    </span>

    <span class="infoValue">

        ${
            (page.internalLinks ?? [])
                .slice(0,5)
                .map(link=>{
                    const p=getPageByUrl(link);
                    return p
                        ? `<div><a href="#" onclick="showPage(getPageByUrl('${link}'));return false;">${p.title}</a></div>`
                        : `<div style="color:#777;">${link} <em>(not crawled)</em></div>`;
                }).join("")
        }

        ${
            (page.internalLinks ?? []).length>5
                ? `
                <div id="outgoing-${page.id}" style="display:none">

                    ${
                        (page.internalLinks ?? [])
                            .slice(5)
                            .map(link=>{
                                const p=getPageByUrl(link);
                                return p
                                    ? `<div><a href="#" onclick="showPage(getPageByUrl('${link}'));return false;">${p.title}</a></div>`
                                    : `<div style="color:#777;">${link} <em>(not crawled)</em></div>`;
                            }).join("")
                    }

                </div>

                <a href="#"
                    onclick="toggleList('outgoing-${page.id}',this);return false;">
                    ▼ Show all ${(page.internalLinks ?? []).length} links
                </a>
                `
                : ""
        }

    </span>

</div>

        <div class="infoRow">

            <span class="infoLabel">
                Orphan Page
            </span>

            <span class="infoValue">
                ${page.orphan ? "✅ Yes" : "No"}
            </span>

        </div>

    </div>

</div>

    <div class="card">

    <h3>Technical</h3>

    <div class="infoList">

        <div class="infoRow">
            <span class="infoLabel">Status Code</span>
            <span class="infoValue">${page.statusCode ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Status Text</span>
            <span class="infoValue">${page.statusText ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Redirected</span>
            <span class="infoValue">${page.redirected ? "Yes" : "No"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Redirect Target</span>
            <span class="infoValue">${page.redirectTarget ?? "-"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Visited Successfully</span>
            <span class="infoValue">${page.visited ? "Yes" : "No"}</span>
        </div>

        <div class="infoRow">
            <span class="infoLabel">Error</span>
            <span class="infoValue">${page.error ?? "-"}</span>
        </div>

    </div>

</div>

</div>

    `;

}