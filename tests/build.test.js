"use strict";

/*
 * Offline checks. Tidak butuh deployment:
 *
 *   npm test
 *
 * Test live terpisah di tests/security.test.js (npm run test:live).
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/*
 * Apps Script menjalankan semua file .gs dalam satu lingkup global, dan
 * browser menjalankan semua <script> dalam satu lingkup global juga.
 * Menggabungkan sumbernya lalu meng-compile menangkap deklarasi ganda
 * (let/const) dan fungsi yang tertimpa diam-diam.
 */
function compileCombined(sources, filename, label) {
    const seen = new Map();

    for (const [name, source] of sources) {
        for (const match of source.matchAll(/^(?:function|let|const|var)\s+([A-Za-z0-9_$]+)/gm)) {
            assert.ok(
                !seen.has(match[1]),
                `${label}: ${match[1]} dideklarasikan dua kali (${seen.get(match[1])} dan ${name})`
            );
            seen.set(match[1], name);
        }
    }

    new vm.Script(sources.map(([, source]) => source).join("\n"), { filename });
}

test("semua file .gs ter-compile sebagai satu program", () => {
    const files = fs.readdirSync(ROOT).filter((file) => file.endsWith(".gs")).sort();
    compileCombined(files.map((file) => [file, read(file)]), "combined.gs", ".gs");

    // Kuota publik tidak boleh menghalangi loket: pendaftaran walk-in yang
    // lolos kunci admin harus lewat tanpa menghitung kuota harian.
    assert.match(
        read("WebApi.gs"),
        /action === "checkStatus" \|\| \(action === "register" && !kunciAdminDiterima\)/,
        "pendaftaran walk-in admin harus bebas kuota publik"
    );
});

for (const page of ["index.html", "admin.html"]) {
    test(`${page}: script ter-compile sesuai urutan pemuatan`, () => {
        const sources = [...read(page).matchAll(/<script src="([^"]+)"><\/script>/g)]
            .map((match) => [match[1], read(match[1])]);

        assert.ok(sources.length > 0, `${page} tidak memuat script apa pun`);
        compileCombined(sources, page, page);
    });
}

test("halaman memuat stylesheet yang sudah dibangun", () => {
    for (const page of ["index.html", "admin.html"]) {
        assert.match(read(page), /href="styles\/styles\.css"/);
    }
    assert.ok(fs.existsSync(path.join(ROOT, "styles", "styles.css")), "jalankan npm run build");
});
