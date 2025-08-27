const puppeteer = require("puppeteer");
const fs = require("fs");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeCoinLogos(totalPages = 1) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const logos = new Map();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        const url = `https://coinmarketcap.com/?page=${pageNumber}`;
        console.log(`📄 Navigating to ${url} ...`);
        await page.goto(url, { waitUntil: "networkidle2" });

        let previousCount = 0;
        while (true) {
            // Scroll down
            await page.evaluate(() => window.scrollBy(0, 2000));
            await sleep(1000);

            // Scrape currently loaded rows
            const newLogos = await page.evaluate(() => {
                const rows = document.querySelectorAll(".sc-db1da501-3.hvtTnJ.cmc-table tbody tr");
                return Array.from(rows).map(row => {
                    const tds = row.querySelectorAll("td");
                    const thirdTd = tds[2];
                    if (!thirdTd) return null;
                    const img = thirdTd.querySelector("img.coin-logo");
                    if (!img) return null;
                    const alt = img.getAttribute("alt") || "";
                    // Remove " logo" suffix to get coin name
                    const name = alt.replace(/ logo$/i, "").trim();
                    return {
                        url: img.getAttribute("src"),
                        name
                    };
                }).filter(Boolean);
            });

            // Add new logos to Map (key = url)
            newLogos.forEach(l => logos.set(l.url, l));

            console.log(`Page ${pageNumber} - Total logos collected so far: ${logos.size}`);

            if (logos.size === previousCount) {
                // No new rows loaded, done scrolling
                break;
            }
            previousCount = logos.size;
        }
    }

    // Save all logos to JSON
    fs.writeFileSync("coin-logos.json", JSON.stringify(Array.from(logos.values()), null, 2));
    console.log("✅ Saved all logos to coin-logos.json");

    await browser.close();
}

// Scrape 5 pages
scrapeCoinLogos(1);
