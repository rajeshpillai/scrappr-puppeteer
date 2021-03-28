const puppeteer = require("puppeteer");
const chalk = require("chalk");
var fs = require("fs");

// MY OCD of colorful console.logs for debugging... IT HELPS
const error = chalk.bold.red;
const success = chalk.keyword("green");


function extractItems() {
  let anchors = [...document.querySelectorAll("a.name")];
  let spans = [...document.querySelectorAll("span.total")];
  const items = anchors.map((anchor,i) => {
    return {
      title: anchor.textContent,
      link: anchor.getAttribute("href"),
      duration: spans[i]?.textContent
    }
  });

  return items;
}

async function scrapeInfiniteScrollItems(
  page,
  extractItems,
  itemTargetCount,
  scrollDelay = 1000,
) {
  let items = [];
  try {
    let previousHeight;
    while (items.length < itemTargetCount) {
      items = await page.evaluate(extractItems);
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
      await page.waitFor(scrollDelay);
    }
  } catch(e) { }
  return items;
}


(async () => {
  try {
    // open the headless browser
    var browser = await puppeteer.launch({ headless: false });
    // open a new page
    var page = await browser.newPage();
    // enter url in page
    // https://pixabay.com/music
    // https://news.ycombinator.com/news

    //page.setUserAgent(`'User-Agent','Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1941.0 Safari/537.36`);
    await page.goto('https://pixabay.com/music'); //, {waitUntil: 'networkidle2'});

    // await page.waitForNavigation({
    //   waitUntil: 'networkidle0',
    // });
    
    // var data = await page.evaluate(() => {
    //   let anchors = [...document.querySelectorAll("a.name")];
    //   let spans = [...document.querySelectorAll("span.total")];
    //   return anchors.map((anchor,i) => {
    //     return {
    //       title: anchor.textContent,
    //       link: anchor.getAttribute("href"),
    //       duration: spans[i]?.textContent
    //     }
    //   });
    // })

    const items = await scrapeInfiniteScrollItems(page, extractItems, 100);
    
    console.log({items});

    await browser.close();
    // Writing the news inside a json file
    fs.writeFile("pixabay.json", JSON.stringify(items), function(err) {
      if (err) throw err;
      console.log("Saved!");
    });
    console.log(success("Browser Closed"));
  } catch (err) {
    // Catch and display errors
    console.log(error(err));
    await browser.close();
    console.log(error("Browser Closed"));
  }
  
})();