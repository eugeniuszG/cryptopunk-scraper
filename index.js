const {Builder, By, Key, until, WebElement, Actions} = require('selenium-webdriver');
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

async function getItems($){
    let result = []
	
    $('.flex.flex-row.flex-wrap.justify-start').find('div.mb-2.border.transition-all').each(function (index, element) {
        let urlPartialView =  $(this).find('.overflow-hidden.rounded-md').find('a').attr('href');
        result.push(urlPartialView)
    })
    return result;
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
        await driver.get(urls.male);
        await sleep(3000);
        let htmlBody = await driver.getPageSource();

        
        let $ = cheerio.load(htmlBody);

        // Get partial url of each item
        let partialUrlsArray = []
        
        // Try to figure out is there is the pagination exist;
        let numberOfPages = $('div.flex:nth-child(5) > div:nth-child(1) > div:nth-child(1)').text().replace(/\s/g, '').split('of')[1]
        
        console.log(chalk.green(`------------ Number of pages: ${numberOfPages} ------------`));

        if (numberOfPages > 1) {

            console.log(chalk.green(`------------ Pagination exist!!! ------------`));
            const getAllItems = async _ => {
                for (let index = 1; index <= numberOfPages; index++) {
                    
                    console.log(index);
                    await sleep(1500);

                    let pagination = await driver.getPageSource();
                    let pagination$ = cheerio.load(pagination);

                    let result = await getItems(pagination$)
                    partialUrlsArray.push(...result)

                    if (index >= 2) {
                        await driver.executeScript( async function(){
                            await document.querySelectorAll('.smallBtn')[4].click()
                        })
                    }
                    else{
                        await driver.executeScript( async function(){
                            await document.querySelectorAll('.smallBtn')[3].click()
                        })
                    }

                    await sleep(1500)
                    console.log(partialUrlsArray.length + " current length \n");
                    
                }
            }
            await getAllItems();
        }
        else {
            await getItems()
        }


        // async function for retrieve the details data from every single Partial View
        console.log(chalk.magenta('-------- Starting to retrieve data from each single item --------'));
        console.log(chalk.magenta(`-------- Number of items: ${partialUrlsArray.length} --------`));

        //let startFromCrash = partialUrlsArray.indexOf('/cryptopunks/view/1721?filters=%24Punk%2520Type%242%3Atrue')

        const asyncLoop = async _ => {
            for (let index = 2000; index < partialUrlsArray.length; index++) {
                let start = Date.now();

                let itemDetails = {};
                const url = partialUrlsArray[index];


                if (!url) {
                    console.log(url);
                    continue;
                }
                await driver.get(`${rootUrl}${url}`)
                await sleep(3000);
                let htmlPartialView = await driver.getPageSource();

                let view$ = cheerio.load(htmlPartialView);
                
                // get Rarity Rank Number
                itemDetails.rarityRank = view$('span.font-bold:nth-child(1)').text().replace(/\s/g, '');

                // define separate folder for each item
                if (fs.existsSync(`./data/female/${itemDetails.rarityRank}`)) {
                    console.log('folder exist \n');
                    continue;
                } 


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
                
                
                fs.mkdir(`./data/female/${itemDetails.rarityRank}ID:${itemDetails.id}`, function(err) {
                    if (err) {
                    console.log(err)
                    } else {
                    console.log(`New directory with name: ${itemDetails.rarityRank}ID:${itemDetails.id} successfully created.`)
                    }
                })
                
                const path_dir = path.resolve(__dirname, `./data/female/${itemDetails.rarityRank}ID:${itemDetails.id}`, `${itemDetails.rarityRank}.png`)
                await downloadImage(imgUrl, path_dir)

                
                fs.writeFile(`./data/female/${itemDetails.rarityRank}ID:${itemDetails.id}/${itemDetails.rarityRank}.json`, JSON.stringify(itemDetails), (err) => {
                    if (err) {
                        throw err;
                    }
                    console.log("JSON data is saved.");
                    console.log(`---- Item number ${index} of ${partialUrlsArray.length} saved in ${(Date.now() - start)/1000} seconds ---- \n`);
                });
            }
        }

        asyncLoop();
    } 
    catch (error) {
        console.log(chalk.red(`-------- CRASH! ---------`));
        console.log(error)
        //await driver.close();
    }
})
();