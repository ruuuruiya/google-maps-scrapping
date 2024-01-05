import * as cheerio from "cheerio";

// Puppeteer with Plugin Functionality
import puppeteerExtra from "puppeteer-extra";

// Puppeteer Plugin to prevent detection
import stealthPlugin from "puppeteer-extra-plugin-stealth";

async function getGoogleMapsData() {

    // Use plugin 
    puppeteerExtra.use(stealthPlugin());

    // Launch browser
    const browser = await puppeteerExtra.launch({ headless: false }); // headless false to show the window
    const page = await browser.newPage();
    const query = "coffee shop di jakarta";

    try {
  
        // Go to this page
        await page.goto(`https://www.google.com/maps/search/${query.split(" ").join("+")}`);

        // Scroll to Last
        async function autoScroll(page) {
            await page.evaluate(async () => {

                // Element Scrollable Area (List of Location)
                const wrapper = document.querySelector('div[role="feed"]');

                await new Promise((resolve, reject) => {
                    let totalHeight = 0;
                    let distance = 1000;
                    let scrollDelay = 3000;

                    let timer = setInterval(async () => {
                        let scrollHeightBefore = wrapper.scrollHeight;
                        wrapper.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeightBefore) {
                            // Reset totalHeight
                            totalHeight = 0;

                            // Wait for 3 seconds
                            await new Promise((resolve) => setTimeout(resolve, scrollDelay));

                            // Calculate scrollHeight after waiting
                            let scrollHeightAfter = wrapper.scrollHeight;

                            // If no more, stop scrolling
                            if (scrollHeightAfter <= scrollHeightBefore) {
                                clearInterval(timer);
                                resolve();
                            };
                        }
                    }, 200);
                });
            });
        };        

        await autoScroll(page);

        const html = await page.content();

        // Take all <a> parent where <a> href includes /maps/place/
        const $ = cheerio.load(html);
        const aTags = $("a");
        const parents = [];
        aTags.each((i, el) => {
            const href = $(el).attr("href");
            if (href?.includes("/maps/place/")) parents.push($(el).parent());
        });

        const business = [];

        parents.forEach((parent) => {
            // https://www.google.com/maps/place/...
            const googleUrl = parent.find("a").attr("href");
            // Get <a> where data-value="Situs Web" (data-value can be "Website" or "Situs Web")
            const website = parent.find('a[data-value="Situs Web"]').attr("href");
            // Find <div> that has class fontHeadlineSmall
            const name = parent.find("div.fontHeadlineSmall").text();
            // find span that includes class fontBodyMedium
            const ratingText = parent.find("span.fontBodyMedium > span").attr("aria-label");

            // <div> includes the class fontBodyMedium
            const bodyDiv = parent.find("div.fontBodyMedium").first();
            const children = bodyDiv.children();
            const lastChild = children.last();
            const firstOfLast = lastChild.children().first();
            const lastOfLast = lastChild.children().last();

            business.push({
                name,
                website,
                category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
                address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
                phone: lastOfLast?.text()?.split("·")?.[1]?.trim(),
                googleUrl,
                ratingText,
            });
        });

        console.log(business);
        return business;
    } catch (error) {
        console.log("Something went wrong!");
    } finally {
        await browser.close();
    };
}

getGoogleMapsData();