function buildTree(pages) {

    const lookup = new Map();

    // Clone every page and add a children array
    pages.forEach(page => {

        lookup.set(page.url, {
            ...page,
            children: []
        });

    });

    const roots = [];

    pages.forEach(page => {

        const current = lookup.get(page.url);

        if (page.parent && lookup.has(page.parent)) {

            lookup.get(page.parent).children.push(current);

        }
        else {

            roots.push(current);

        }

    });

    return roots;

}

module.exports = {
    buildTree
};