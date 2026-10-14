
const utils = require("./utils");

const home = "https://clubhub-resources.british-gymnastics.org";
const pageA = `${home}/page-a`;
const pageB = `${home}/page-b`;

const makePage = (overrides = {}) => ({
    id: 1,
    url: pageA,
    title: "Test page",
    contentType: "Standard Page",
    visited: true,
    statusCode: 200,
    incomingLinkCount: 1,
    parent: home,
    parentStatus: "has-parent",
    children: [],
    depth: 1,
    ...overrides
});

const cases = [
    {
        name: "No incoming links",
        pages: [
            makePage({ incomingLinkCount: 0 })
        ],
        expected: "No incoming links"
    },
    {
        name: "Parent resource not crawled",
        pages: [
            makePage({ parent: pageB })
        ],
        expected: "Parent resource not crawled"
    },
    {
        name: "Parent-child inconsistency",
        pages: [
            makePage({
                id: 1,
                url: home,
                parent: null,
                parentStatus: "root",
                children: []
            }),
            makePage({
                id: 2,
                url: pageA,
                parent: home
            })
        ],
        expected: "Parent-child inconsistency"
    },
    {
        name: "Missing hierarchy depth",
        pages: [
            makePage({ depth: null })
        ],
        expected: "Not connected to home hierarchy"
    }
];

let failures = 0;

for (const test of cases) {
    const findings = utils.detectStructuralAnomalies(test.pages);
    const passed = findings.some(item => item.type === test.expected);

    console.log(
        `${passed ? "PASS" : "FAIL"}: ${test.name}`,
        findings.map(item => item.type)
    );

    if (!passed) failures++;
}

console.log(`\n${cases.length - failures}/${cases.length} tests passed.`);
process.exitCode = failures ? 1 : 0;
