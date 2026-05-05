import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

  console.log('Navigating...');
  await page.goto('https://frontend-roan-one-suwo5dr71s.vercel.app', { waitUntil: 'networkidle' });
  console.log('Done.');
  
  await browser.close();
})();
