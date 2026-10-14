
const assert = require("node:assert/strict");
const { detectContentSimilarity } = require("./utils");

function makeText(prefix, count = 120) {
    return Array.from(
        { length: count },
        (_, i) => `${prefix}${String(i).padStart(3, "0")}`
    ).join(" ");
}

const baseText = makeText("clubresourceword");
const nearBaseText = makeText("gymnasticsguidanceword");
const unrelatedText = makeText("swimmingfacilitytopic");
const sharedBoilerplate = makeText("clubhubsharedboilerplate", 80);

// Change just one word to create a strong near-duplicate.
const nearDuplicateText = nearBaseText.replace(
    "gymnasticsguidanceword020",
    "updatedguidanceword020"
);

const pages = [
    {
        url: "https://example.com/a",
        canonicalResourceId: "resource-a",
        isCanonicalOccurrence: true,
        title: "Resource A",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: baseText
    },
    {
        url: "https://example.com/b",
        canonicalResourceId: "resource-b",
        isCanonicalOccurrence: true,
        title: "Resource B",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: baseText
    },
    {
        url: "https://example.com/c",
        canonicalResourceId: "resource-c",
        isCanonicalOccurrence: true,
        title: "Resource C",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: nearBaseText
    },
    {
        url: "https://example.com/d",
        canonicalResourceId: "resource-d",
        isCanonicalOccurrence: true,
        title: "Resource D",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: nearDuplicateText
    },
    {
        url: "https://example.com/e",
        canonicalResourceId: "resource-e",
        isCanonicalOccurrence: true,
        title: "Resource E",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: unrelatedText
    },
        {
        url: "https://example.com/f",
        canonicalResourceId: "resource-f",
        isCanonicalOccurrence: true,
        title: "Resource F",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: `${sharedBoilerplate} ${makeText("uniquecontentalpha")}`
    },
    {
        url: "https://example.com/g",
        canonicalResourceId: "resource-g",
        isCanonicalOccurrence: true,
        title: "Resource G",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: `${sharedBoilerplate} ${makeText("uniquecontentbeta")}`
    },
    {
        url: "https://example.com/h",
        canonicalResourceId: "resource-h",
        isCanonicalOccurrence: true,
        title: "Resource H",
        contentType: "Standard Page",
        statusCode: 200,
        visited: true,
        contentText: `${sharedBoilerplate} ${makeText("uniquecontentgamma")}`
    },
    {
    url: "https://example.com/a-alternate",
    canonicalResourceId: "resource-a",
    isCanonicalOccurrence: false,
    title: "Resource A - Alternate Occurrence",
    contentType: "Standard Page",
    statusCode: 200,
    visited: true,
    contentText: baseText
}
];

const result = detectContentSimilarity(pages);

console.log(JSON.stringify({
    resourcesCompared: result.resourcesCompared,
    exactMatchCount: result.exactMatchCount,
    nearDuplicateCount: result.nearDuplicateCount,
    matches: result.matches.map(match => ({
        matchType: match.matchType,
        similarity: match.similarity,
        resourceA: match.resourceA.title,
        resourceB: match.resourceB.title
    }))
}, null, 2));

assert.equal(result.resourcesCompared, 8);
assert.ok(
    !result.matches.some(
        match =>
            match.resourceA.title === "Resource A - Alternate Occurrence" ||
            match.resourceB.title === "Resource A - Alternate Occurrence"
    ),
    "Non-canonical occurrences should not appear in similarity matches"
);
assert.equal(result.exactMatchCount, 1);
assert.equal(result.nearDuplicateCount, 1);

const nearMatch = result.matches.find(
    match => match.matchType === "Near-duplicate"
);

assert.ok(nearMatch, "Expected a near-duplicate match");
assert.ok(
    nearMatch.similarity >= 0.85,
    "Near-duplicate similarity should meet the configured threshold"
);

console.log("\nAll S3-08 tests passed.");
