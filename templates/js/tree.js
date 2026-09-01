// ==========================================================
// Site Explorer
// ==========================================================

"use strict";

function renderSiteExplorer(){

    const roots = pages.filter(page => page.parent === null);

    let html = `
        <h2>🌳 Site Explorer</h2>

        <p>
            ${pages.length} pages found
        </p>

        <div class="tree">
    `;

    roots.forEach(page => {

        html += renderTreeNode(page);

    });

    html += "</div>";

    document.getElementById("contentPanel").innerHTML = html;

}

// ----------------------------------------------------------
// Recursive Tree Builder
// ----------------------------------------------------------

function renderTreeNode(page){

    const hasChildren =
        Array.isArray(page.children) &&
        page.children.length > 0;

    let html = `

        <div class="treeNode">

            <span class="treeLabel">

                ${
                    hasChildren
                    ? `<span class="treeToggle"
                            onclick="toggleTree(${page.id},event)">
                            ▶
                    </span>`
                    : "📄"
                }

                <span onclick="showTreePage(${page.id})">

                    ${page.title}

                </span>

            </span>
    `;

    if(hasChildren){

        html += `

            <div class="treeChildren"
                 id="children-${page.id}">

        `;

        page.children.forEach(childId => {

            const child = pages.find(
                p => p.id === childId
            );

            if(child){

                html += renderTreeNode(child);

            }

        });

        html += `

            </div>

        `;

    }

    html += `

        </div>

    `;

    return html;

}

// ----------------------------------------------------------
// Open page from Site Explorer
// ----------------------------------------------------------

function showTreePage(id){

    pageReturnView = currentView;

    const page = pages.find(p => p.id === id);

    if(page){

        showPage(page);

    }

}

// ----------------------------------------------------------
// Expand / Collapse
// ----------------------------------------------------------

function toggleTree(id,event){

    event.stopPropagation();

    const children =
        document.getElementById(`children-${id}`);

    if(!children) return;

    const toggle =
        event.currentTarget;

    const isOpen =
        children.classList.toggle("open");

    toggle.textContent =
        isOpen ? "▼" : "▶";

}