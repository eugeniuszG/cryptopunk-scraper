const {Builder, By, Key, until} = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const chalk = require('chalk');
const cheerio = require('cheerio');

const fs = require('fs')  
const path = require('path')  
const axios = require('axios')

// global variables
let driver;


// helper functions 

async function sleep(time) {
  await driver.sleep(time);
}

async function downloadImage (url, path) {  
    // const url = 'https://unsplash.com/photos/AaEQmoufHLk/download?force=true'
    // const path = Path.resolve(__dirname, 'images', 'code.jpg')
    const writer = fs.createWriteStream(path)
  
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })
  
    response.data.pipe(writer)
  
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }
  


(async () => {

  try {
    console.log(chalk.green("-------- Starting browser ---------"));

    const rootUrl = 'https://rarity.tools';

    const urls = {
        aliens: 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%240%3Atrue',
        ape: 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%241%3Atrue',
        zombie: 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%244%3Atrue',
        female: 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%242%3Atrue',
        male: 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%243%3Atrue'
    }



    // Options for headless mode

    // options = new firefox.Options();
    // options = options.headless();
    
    // Pass Options object for the Selenium-Webdriver

    // driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
    driver = await new Builder().forBrowser('firefox').build();
    await driver.get(urls.zombie);
    await sleep(3000);
    let htmlBody = await driver.getPageSource();

    
    let $ = cheerio.load(htmlBody);

    // Get partial url of each item
    let partialUrlsArray = []
    // Try to figure out is there is the pagination exist;
    let numberOfPages = $('div.justify-center:nth-child(4) > div:nth-child(1) > div:nth-child(1)').text().replace(/\s/g, '').split('of')[1]
    
    console.log(chalk.green(`------------ Number of pages: ${numberOfPages} ------------`));

    if (numberOfPages > 1) {

        console.log(chalk.green(`------------ Pagination exist!!! ------------`));
        const getAllItems = async _ => {
            for (let index = 1; index < numberOfPages; index++) {
                let paginationBtn = $('div.justify-center:nth-child(4) > div:nth-child(1) > div:nth-child(2)').text();
                console.log(paginationBtn);

                await driver.findElement(By.css('div.justify-center:nth-child(4) > div:nth-child(1) > div:nth-child(2)')).click();

                $('.flex.flex-row.flex-wrap.justify-start').find('div.mb-2.border.transition-all').each(  function(index, element){
                    let urlPartialView =  $(this).find('.overflow-hidden.rounded-md').find('a').attr('href');
                    partialUrlsArray.push(urlPartialView)
                })
            }
        }
        await getAllItems();
    }
    else {
        $('.flex.flex-row.flex-wrap.justify-start').find('div.mb-2.border.transition-all').each(  function(index, element){
            let urlPartialView =  $(this).find('.overflow-hidden.rounded-md').find('a').attr('href');
            partialUrlsArray.push(urlPartialView)
        })
    }


    // async function for retrieve the details data from every single Partial View
    console.log(chalk.magenta('-------- Starting to retrieve data from each single item --------'));
    console.log(chalk.magenta(`-------- Number of items: ${partialUrlsArray.length} --------`));

    const asyncLoop = async _ => {
        for (let index = 0; index < partialUrlsArray.length; index++) {

            let itemDetails = {};
            const url = partialUrlsArray[index];

            await driver.get(`${rootUrl}${url}`)
            await sleep(3000);
            let htmlPartialView = await driver.getPageSource();

            let view$ = cheerio.load(htmlPartialView);
            
            // get Rarity Rank Number
            itemDetails.rarityRank = view$('span.font-bold:nth-child(1)').text().replace(/\s/g, '');
            

            // get Type and Id
            let typeAndId =  view$('.text-left').text().replace(/\s/g, '').split('#');
            itemDetails.type = typeAndId[0];
            itemDetails.id = typeAndId[1];

            // get Rarity and Owner Name
            let rarityScrore = view$('div.px-2:nth-child(2)').text().replace(/\s/g, '');
            let owner = view$('a.block:nth-child(3)').text().replace(/\s/g, '');
            itemDetails.rarityScrore = rarityScrore;
            itemDetails.owner = owner.split(':')[1];

            // get traits
            let traits = []
            view$('.pb-4 > div').each(function(index, element){
                itemObj = {};

                let itemTitleAndNumbers = view$(this).find('.flex.flex-row.items-baseline').text().replace(/\s/g, '').split('+');
                itemObj[itemTitleAndNumbers[0]] = `+${itemTitleAndNumbers[1]}`;

                let underTitle = view$(this).find('div.flex.flex-row:nth-child(2)').find('div:nth-child(1)').text().replace(/\s/g, '')
                let underValue = view$(this).find('div.flex.flex-row:nth-child(2)').find('div:nth-child(2)').text().replace(/\s/g, '')
                itemObj[underTitle] = underValue;

                if (itemTitleAndNumbers && underTitle != '') {
                    traits.push(itemObj);
                }
            })

            itemDetails.traits = traits;

            // save picture if it is exist

            let imageLink = view$('a.flex').attr('href');
            await driver.get(imageLink);
            await sleep(2000);
            let htmlWithImage = await driver.getPageSource();

            image$ = cheerio.load(htmlWithImage);
            let imgUrl = image$('div.AssetMediareact__DivContainer-sc-1vbfbdi-0:nth-child(1) > div:nth-child(1) > div:nth-child(1) > img:nth-child(1)').attr('src');
            

            // define separate folder for each item
            fs.mkdir(`./data/ape/${itemDetails.rarityRank}`, function(err) {
                if (err) {
                  console.log(err)
                } else {
                  console.log("New directory successfully created.")
                }
            })


            const path_dir = path.resolve(__dirname, `./data/ape/${itemDetails.rarityRank}`, `${itemDetails.rarityRank}.png`)
            await downloadImage(imgUrl, path_dir)

            
            fs.writeFile(`./data/ape/${itemDetails.rarityRank}/${itemDetails.rarityRank}.json`, JSON.stringify(itemDetails), (err) => {
                if (err) {
                    throw err;
                }
                console.log("JSON data is saved.");
            });
        }
    }

    asyncLoop();

} catch (error) {
    console.log(chalk.red(`-------- CRASH! ---------`));
    console.log(error)
    //await driver.close();
}
})();