class WordPress {

    constructor(page) {

        this.page = page;

        this.pages = new Map();

    }

    async initialise() {

        console.log("");
        console.log("Loading WordPress pages...");

            await this.loadContentType("pages", "Pages");
            await this.loadContentType("sfwd-courses", "Courses");
            await this.loadContentType("sfwd-lessons", "Lessons");
            await this.loadContentType("sfwd-topic", "Topics");

        console.log(
            `WordPress cache contains ${this.pages.size} items.`
        );
        console.log("");


    }

    async loadContentType(restBase, label) {

        let pageNumber = 1;

        while (true) {

            const apiUrl =
                `https://clubhub-resources.british-gymnastics.org/wp-json/wp/v2/${restBase}?per_page=100&page=${pageNumber}`;

            const response = await this.page.request.get(apiUrl);

            if (!response.ok()) {
                break;
            }

            const data = await response.json();

            if (data.length === 0) {
                break;
            }

            for (const item of data) {

                this.pages.set(
                    this.normalise(item.link),
                    item
                );

            }

            console.log(
                `Loaded ${data.length} ${label} (page ${pageNumber})`
            );

            pageNumber++;

        }

    }

    async getPageData(url) {

        return this.pages.get(this.normalise(url)) || null;

    }

    normalise(url) {

        return url
            .replace(/\/$/, "")
            .toLowerCase();

    }

}

module.exports = WordPress;