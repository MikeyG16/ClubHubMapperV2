// ----------------------------------------------------------
// Content Inventory
// ----------------------------------------------------------

function renderInventory(title, pageList){
    inventorySource = [...pageList];

    filteredPages = [...pageList];

    const html = `

        <h2>${title}</h2>

        <div class="inventoryToolbar">

            <input
                id="inventorySearch"
                type="text"
                placeholder="Search pages..."
                onkeyup="filterInventory()"
            >

        </div>

        <br>

       <div id="inventoryTableContainer"></div>

    `;

    document.getElementById("contentPanel").innerHTML = html;

    renderInventoryTable(filteredPages);

}

// ----------------------------------------------------------
// Inventory Table
// ----------------------------------------------------------

function renderInventoryTable(pageList){

    document.getElementById("inventoryTableContainer").innerHTML = `

        <table class="inventoryTable">

            <thead>

                <tr>

                    <th>Title</th>

                    <th>Content Type</th>

                    <th>Status</th>

                    <th>Depth</th>

                </tr>

            </thead>

            <tbody>

                ${pageList.map((page,index)=>`

                    <tr onclick="showPageByIndex(${index})">

                        <td>${page.title}</td>

                        <td>${page.contentType}</td>

                        <td>${page.statusCode ?? "-"}</td>

                        <td>${page.depth}</td>

                    </tr>

                `).join("")}

            </tbody>

        </table>

    `;

}

function renderContentInventory(){

    renderInventory(

        "📄 Content Inventory",

        pages

    );

}

// ----------------------------------------------------------
// Inventory Search
// ----------------------------------------------------------

function filterInventory(){

    const search = document
        .getElementById("inventorySearch")
        .value
        .toLowerCase();

    filteredPages = inventorySource.filter(page =>

        page.title.toLowerCase().includes(search)

        ||

        page.url.toLowerCase().includes(search)

    );

    renderInventoryTable(filteredPages);

}