const puppeteer = require('puppeteer')

async function screenshot(){
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('https://facebook.com/marketplace')
  await page.screenshot({ path: 'marketplace.png' })

  await browser.close()
}

screenshot()