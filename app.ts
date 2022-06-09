import { chromium } from "playwright";
import { writeFileSync, readFileSync } from "fs";

async function main() {
  const prevData = JSON.parse(readFileSync("data.json", "utf8"));

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--no-zygote", "--single-process"],
  });

  const context = await browser.newContext({
    viewport: {
      width: 1920,
      height: 1080,
    },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  await page.goto("https://store.epicgames.com/en-US/collection/top-sellers");
  await delay(5000);

  await page.screenshot({ path: "screenshot.png" });

  const cards = await page.$$('[data-component="DiscoverCardLayout"]');

  console.log(`Found ${cards.length} games...`);

  const games = await Promise.all(
    cards.map(async (card, index) => {
      const title = await card
        .$('[data-testid="offer-title-info-title"]')
        .then((el) => el.innerText());
      const rawPrice = await card.$('[data-component="PriceLayout"]');

      const price = async () => {
        try {
          const hasSpan = await rawPrice?.$$("span").catch((err) => {
            throw new Error(err);
          });

          if (hasSpan) {
            const hasDiscount = await rawPrice.$('[data-component="BaseTag"]');

            if (hasDiscount) {
              const basePrice = await hasSpan[1]
                .$("div")
                .then((el) => el.innerText());

              return basePrice;
            }

            return await hasSpan[0].$("div").then((el) => el.innerText());
          } else {
            const el_1 = await rawPrice.$("div");
            console.log(`${title} No tiene "span"`);
            return await el_1.innerText();
          }
        } catch (err) {
          return "Unknown";
        }
      };
      const parsedPrice = (await price()) || "";
      const url = await card.$("a").then((el) => el.getAttribute("href"));
      const image = await card
        .$('[data-component="Picture"]')
        .then((el) => el.$("img").then((el) => el.getAttribute("data-image")));

      const diff =
        prevData.find((el) => el.title === title).position - 1 - index;

      return {
        position: index + 1,
        diff,
        title,
        price: parsedPrice,
        url,
        image,
      };
    })
  );

  await browser.close();
  console.log(`${games.length} games saved... ✅`);
  writeFileSync("data.json", JSON.stringify(games, null, 2));
}

main().catch((err) => console.error(err));

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
