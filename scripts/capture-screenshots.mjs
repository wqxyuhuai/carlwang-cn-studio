import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3001";
const outputDir = resolve("public/screenshots/current");

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
].filter(Boolean);

const executablePath = candidates.find((path) => existsSync(path));

if (!executablePath) {
  throw new Error("No local Chrome or Edge executable found. Set CHROME_PATH to capture screenshots.");
}

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true
});

async function capture({ file, path, viewport, fullPage = true, prepare, selector }) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1
  });

  await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "networkidle" });

  if (prepare) {
    await prepare(page);
  }

  const target = resolve(outputDir, file);
  if (selector) {
    await page.locator(selector).screenshot({ path: target });
  } else {
    await page.screenshot({ path: target, fullPage });
  }
  console.log(`${file}: ${target}`);
  await page.close();
}

const shots = [
  { file: "home-1280.png", path: "/", viewport: { width: 1280, height: 1200 } },
  { file: "works-grid-1280.png", path: "/works", viewport: { width: 1280, height: 1080 }, fullPage: false },
  {
    file: "works-list-1280.png",
    path: "/works",
    viewport: { width: 1280, height: 1080 },
    fullPage: false,
    prepare: async (page) => {
      await page.getByRole("button", { name: /List/ }).click();
      await page.waitForTimeout(120);
    }
  },
  { file: "work-detail-1280.png", path: "/works/studio-web-system", viewport: { width: 1280, height: 1080 }, fullPage: false },
  { file: "work-detail-1920.png", path: "/works/studio-web-system", viewport: { width: 1920, height: 1080 }, fullPage: false },
  { file: "work-detail-1440.png", path: "/works/studio-web-system", viewport: { width: 1440, height: 1080 }, fullPage: false },
  { file: "work-detail-375.png", path: "/works/studio-web-system", viewport: { width: 375, height: 1200 } },
  { file: "about-contact-1280.png", path: "/about", viewport: { width: 1280, height: 1200 } },
  { file: "about-contact-1920.png", path: "/about", viewport: { width: 1920, height: 1400 } },
  { file: "about-contact-375.png", path: "/about", viewport: { width: 375, height: 1200 } },
  { file: "about-direction-1920.png", path: "/about", viewport: { width: 1920, height: 1200 }, selector: ".pw-about-direction" },
  { file: "about-experience-1920.png", path: "/about", viewport: { width: 1920, height: 1200 }, selector: ".pw-about-experience" },
  {
    file: "about-experience-hover-1920.png",
    path: "/about",
    viewport: { width: 1920, height: 1200 },
    selector: ".pw-about-experience",
    prepare: async (page) => {
      await page.locator(".pw-experience-item").first().hover();
      await page.waitForTimeout(180);
    }
  },
  { file: "home-1920.png", path: "/", viewport: { width: 1920, height: 1400 } },
  { file: "home-1440.png", path: "/", viewport: { width: 1440, height: 1200 } },
  { file: "home-375.png", path: "/", viewport: { width: 375, height: 1200 } },
  { file: "works-grid-1920.png", path: "/works", viewport: { width: 1920, height: 1080 }, fullPage: false },
  { file: "works-grid-1440.png", path: "/works", viewport: { width: 1440, height: 1080 }, fullPage: false },
  { file: "works-grid-375.png", path: "/works", viewport: { width: 375, height: 1080 }, fullPage: false },
  {
    file: "works-list-1920.png",
    path: "/works",
    viewport: { width: 1920, height: 1080 },
    fullPage: false,
    prepare: async (page) => {
      await page.getByRole("button", { name: /List/ }).click();
      await page.waitForTimeout(120);
    }
  },
  {
    file: "works-list-1440.png",
    path: "/works",
    viewport: { width: 1440, height: 1080 },
    fullPage: false,
    prepare: async (page) => {
      await page.getByRole("button", { name: /List/ }).click();
      await page.waitForTimeout(120);
    }
  },
  {
    file: "works-list-375.png",
    path: "/works",
    viewport: { width: 375, height: 1080 },
    fullPage: false,
    prepare: async (page) => {
      await page.getByRole("button", { name: /List/ }).click();
      await page.waitForTimeout(120);
    }
  }
];

for (const shot of shots) {
  await capture(shot);
}

await browser.close();
