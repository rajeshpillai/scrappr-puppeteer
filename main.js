const puppeteer = require("puppeteer");
const chalk = require("chalk");
var fs = require("fs");

// MY OCD of colorful console.logs for debugging... IT HELPS
const error = chalk.bold.red;
const success = chalk.keyword("green");

let searchField = "span.total";
let searchValue = "3:";

let runCount = 0;


let args = process.argv.slice(2);
console.log("ARGUMENTS: ", args);

searchField = args[0] || "span.total";
searchValue = args[1] || "3:";

// Extract scrolling items

function extractItems() {
  let anchors = [...document.querySelectorAll("a.name")];
  let spans = [...document.querySelectorAll("span.total")];
  let items = anchors.map((anchor,i) => {
    return {
      title: anchor.textContent,
      link: anchor.getAttribute("href"),
      duration: spans[i]?.textContent
    }
  });
  return items;
}


// Build HTML and save to disk
function buildHTML(items) {
  let body = items.map(item => {
    return `
      <li>
        <a href="${item.link}">${item.title}</a>
        <span>${item.duration}</span>
      </li>
    `
  }).join("");

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width">
        <title>JS Bin</title>
      </head>
      <body>
      <ul>
        ${body}
      </ul>
      </body>
    </html>
  `;


  fs.writeFile("index.html", html, function(err) {
    if (err) throw err;
    console.log("Saved!");
  });
}

// Setup Infinite scroll handler
async function scrapeInfiniteScrollItems(
  page,
  extractItems,
  itemTargetCount,
  scrollDelay = 1000,
) {
  let items = [];
  try {
    let previousHeight;
    while (items.length < itemTargetCount || runCount < 10) {
      items = await page.evaluate(extractItems);
      items = items.filter(itm => itm.duration.startsWith(searchValue));
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
      await page.waitForTimeout(scrollDelay);
      runCount++;
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
    page.setViewport({ width: 1280, height: 926 });

    //page.setUserAgent(`'User-Agent','Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1941.0 Safari/537.36`);
    await page.goto('https://pixabay.com/music'); //, {waitUntil: 'networkidle2'});


    const items = await scrapeInfiniteScrollItems(page, extractItems, 10);
    
    console.log({items});

    await browser.close();

    console.log(success("Browser Closed"));
    console.log(`Run count: ${runCount}`);

    // Build HTML
    buildHTML(items);

  } catch (err) {
    // Catch and display errors
    console.log(error(err));
    await browser.close();
    console.log(error("Browser Closed"));
  }
  
})();