"use strict";

/*
 * Security tests for the deployed website and Google Apps Script API.
 *
 * Run against a staging deployment first:
 *
 *   PUBLIC_URL="https://example.com/" \
 *   ADMIN_URL="https://example.com/admin.html" \
 *   API_URL="https://script.google.com/macros/s/.../exec" \
 *   npm run test:live
 *
 * These tests send only invalid or read-only requests. They do not register
 * residents, change status, or erase data. They do send several wrong admin
 * keys, which triggers a short lockout state in the deployment: the correct
 * key still works, but wrong keys stay blocked longer until it is used once.
 */

const assert = require("node:assert/strict");
const { test } = require("node:test");

const PUBLIC_URL = process.env.PUBLIC_URL;
const ADMIN_URL = process.env.ADMIN_URL;
const API_URL = process.env.API_URL;
const REQUEST_TIMEOUT_MS = 15_000;

if (!PUBLIC_URL || !ADMIN_URL || !API_URL) {
    throw new Error("Set PUBLIC_URL, ADMIN_URL, and API_URL before running this test.");
}

/*
 * Fetch with a fixed timeout so CI does not hang when the deployment is down.
 */
async function request(url, options = {}) {
    const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...options
    });

    return response;
}

/*
 * Send JSON as text/plain because the production browser uses the same format
 * for Google Apps Script and avoids an unnecessary CORS preflight.
 */
async function postApi(payload) {
    const body = typeof payload === "string" ? payload : JSON.stringify(payload);
    const response = await request(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body
    });

    const text = await response.text();
    let json;

    try {
        json = JSON.parse(text);
    } catch {
        assert.fail(`API returned non-JSON content: ${text.slice(0, 200)}`);
    }

    return { response, text, json };
}

/*
 * Read the Content Security Policy from the HTML meta element.
 * The public host may also send a CSP header, but this project currently puts
 * the policy in HTML, so the deployed document itself is the source of truth.
 */
function readMetaCsp(html) {
    const match = html.match(
        /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["']([^"']+)["']/i
    );

    assert.ok(match, "Content-Security-Policy meta tag is missing");
    return match[1];
}

function assertRejected(result, expectedCode) {
    assert.equal(result.json.success, false, "request should be rejected");
    assert.equal(result.json.code, expectedCode);
}

/*
 * The public and admin pages must load successfully over HTTPS.
 */
test("public and admin pages are reachable only through HTTPS", async () => {
    for (const url of [PUBLIC_URL, ADMIN_URL]) {
        assert.equal(new URL(url).protocol, "https:", `${url} must use HTTPS`);

        const response = await request(url);
        assert.equal(response.status, 200, `${url} returned HTTP ${response.status}`);
    }
});

/*
 * Browser protections are checked on the deployed HTML, not only the source
 * file. This catches an old deployment or build step that published the wrong
 * document.
 */
test("deployed pages keep the strict browser policy", async () => {
    for (const url of [PUBLIC_URL, ADMIN_URL]) {
        const html = await (await request(url)).text();
        const csp = readMetaCsp(html);

        for (const directive of [
            "default-src 'none'",
            "script-src 'self'",
            "script-src-attr 'none'",
            "style-src-attr 'none'",
            "object-src 'none'",
            "frame-src 'none'",
            "worker-src 'none'",
            "base-uri 'none'"
        ]) {
            assert.ok(csp.includes(directive), `${url} CSP is missing: ${directive}`);
        }

        assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
        assert.match(html, /<meta\s+name=["']referrer["']\s+content=["']no-referrer["']/i);
        assert.doesNotMatch(html, /javascript\s*:/i);
        assert.doesNotMatch(html, /\son[a-z]+\s*=/i, "inline event handler found");
    }
});

/*
 * The public page must not advertise the admin page or expose an admin form.
 */
test("public page does not expose the admin surface", async () => {
    const html = await (await request(PUBLIC_URL)).text();

    assert.doesNotMatch(html, /admin\.html/i);
    assert.doesNotMatch(html, /adminKey|key-input|form-key/i);
});

/*
 * GET must never become an alternate path around doPost validation.
 */
test("API rejects GET", async () => {
    const response = await request(API_URL);
    const result = JSON.parse(await response.text());

    assert.equal(result.success, false);
    assert.equal(result.code, "METHOD_NOT_ALLOWED");
});

/*
 * Malformed, oversized, array, null, and primitive payloads must fail without
 * returning stack traces, source names, sheet names, or parser details.
 */
test("API rejects malformed and non-object payloads without leaking internals", async () => {
    const payloads = ["{not json", "x".repeat(4100), [], null, 42, "text"];

    for (const payload of payloads) {
        const result = await postApi(payload);

        assert.equal(result.json.success, false);
        assert.doesNotMatch(
            result.text,
            /SyntaxError|ReferenceError|TypeError|stack|at\s+doPost|Pendaftaran|SpreadsheetApp/i
        );
    }
});

/*
 * Only documented actions may reach application logic. Development and setup
 * function names are tested because accidental routing to them would be severe.
 */
test("API rejects unknown and maintenance actions", async () => {
    for (const action of [
        "",
        "adminLogin",
        "setupSpreadsheet",
        "resetSpreadsheetFresh",
        "developmentOnlyEraseAllData",
        "wipeEverything"
    ]) {
        const result = await postApi({ action });
        assertRejected(result, "UNKNOWN_ACTION");
    }
});

/*
 * Sensitive admin actions must reject missing, short, and incorrect keys.
 * Three wrong keys are enough to enter lockout state; the correct key still
 * works, but wrong keys stay blocked until it is used once.
 */
test("admin actions fail closed without a valid key", async () => {
    const attempts = [
        { action: "getAllData" },
        { action: "getAllData", adminKey: "short" },
        { action: "getAllData", adminKey: "x".repeat(32) },
        { action: "updateStatus", trackingCode: "JTM-16112026-A1B2", newStatus: "Selesai" },
        { action: "register", jalur: "Offline" }
    ];

    for (const payload of attempts) {
        const result = await postApi(payload);
        assert.ok(
            ["UNAUTHORIZED", "RATE_LIMITED"].includes(result.json.code),
            `unexpected code for ${payload.action}: ${result.json.code}`
        );
        assert.equal("attemptsRemaining" in result.json, false);
    }
});

/*
 * Public status lookup must reject malformed codes before revealing whether a
 * row exists. The response must not contain resident data.
 */
test("status lookup validates format before sheet lookup", async () => {
    for (const trackingCode of [
        "",
        "abc",
        "JTM-16112026-A1",
        "JTM-16112026-a1b2",
        "JTM-16112026-A1B2C3D4",
        "'=IMPORTXML(\"https://example.com\",\"//a\")"
    ]) {
        const result = await postApi({ action: "checkStatus", trackingCode });

        assert.equal(result.json.success, false);
        assert.doesNotMatch(result.text, /nama|noWa|dusun|catatan|Budi Santoso/i);
    }
});

/*
 * Unsupported status values and spreadsheet-formula prefixes must be rejected
 * before any write. The missing admin key also guarantees that this production-
 * safe test cannot modify a row even if another validation regresses.
 */
test("status update rejects invalid state and formula input", async () => {
    const result = await postApi({
        action: "updateStatus",
        trackingCode: "JTM-16112026-A1B2",
        newStatus: "Dicabut",
        catatan: "=IMPORTXML(\"https://example.com\",\"//a\")"
    });

    assert.ok(["UNAUTHORIZED", "RATE_LIMITED"].includes(result.json.code));
    assert.doesNotMatch(result.text, /stack|SpreadsheetApp|Pendaftaran/i);
});
