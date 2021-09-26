require('dotenv').config();

const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TOKEN;
const url_tools = process.env.URL_TOOLS || 'https://pvuextratools.com';
const bot = new TelegramBot(token, { polling: true });
const puppeteer = require('puppeteer');

const plant_types = [
  'dark',
  'electro',
  'fire',
  'ice',
  'light',
  'metal',
  'parasite',
  'water',
  'wind'
];

const probability_text = (text) =>  {
  let translate = [
      {
        name: 'use', 
        value: `\n\n*Se recomienda usar invernadero para mañana.`
      },
      {
        name: 'not use', 
        value: `\n\n*No se recomienda usar invernadero para mañana.`
      }
  ]

  return translate.filter(t => t.name == text)[0].value
};

bot.onText(/\/clima/, async data => {
  const { chat, text } = data;
  let msj = 'Debes proporcionar un tipo de planta.';
  let type = text.split(' ')[1];

  if (type) {
    if (plant_types.includes(type.toLocaleLowerCase())) {
      msj = '';
      const params = {
        type, 
        header: '.table-impact-header',
        content: '.table-impact-content',
        pathGreenHouse: '[src="assets/images/useGreenhouse.png"]'
      };
      const browser = await puppeteer.launch({
        headless: true,
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-sandbox',
            '--no-zygote',
            '--single-process',
        ]
      });
      const page = await browser.newPage();
      
      await page.setDefaultNavigationTimeout(150000);
      await page.goto(url_tools);
      await page.click('[src="assets/images/es2.svg"]');
      await page.waitForFunction(
        'document.querySelector("body").innerText.includes("Predicción para mañana")'
      );
      await page.waitForSelector('[name="searchTerm"]');
      await page.type('[name="searchTerm"]', type);

      const data = await page.evaluate((params) => {
        const range = n => Array.from(Array(n).keys());
        const { type, pathGreenHouse, header, content } = params
        const titles = document.querySelectorAll(header);
        const values = document.querySelectorAll(content);
        const useGreenhouse = document.querySelector(pathGreenHouse)? true: false;
        return {
            useGreenhouse,
            probability: range(titles.length).map(index => {
                return {
                    name: titles[index].getInnerHTML(),
                    value: values[index].getInnerHTML()
                }
            }).filter(a=>a.name != 'Acción recomendada')
        };
      }, params);

      await browser.close();
      
      data.probability.forEach(element => {
        const { name, value } = element
        if (name == 'Tipo de planta'){
          msj = `Planta de ${value}`
        }else{
          msj += `\n - ${name}: ${value}.`;
        }
      });
      msj += probability_text(data.useGreenhouse? 'use': 'not use');
    }else{
      msj = 'Debes proporcionar un tipo de planta valido.';
    }  
  }
  bot.sendMessage(chat.id, msj);
});

bot.onText(/\/extratools/, async data => {
  const { chat } = data;
  const browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
    ]
  });
  const page = await browser.newPage();
  
  await page.setDefaultNavigationTimeout(150000);
  await page.goto(url_tools);
  await page.click('[src="assets/images/es2.svg"]');
  await page.waitForFunction(
    'document.querySelector("body").innerText.includes("Predicción para mañana")'
  );
  const table = await page.$('.table-responsive');

  await table.screenshot({ path: 'screenshot.png' });
  await browser.close();

  bot.sendPhoto(chat.id, './screenshot.png', { caption: 'Creditos: https://www.pvuextratools.com' });
});

bot.onText(/\/donar/, async data => {
  const { chat } = data;
  const msj = 'Hola, Mi wallet metamask (BSC): \n\n 0xd00d845eA2711afDAD00A5B7E4F4719e641C5871'
  bot.sendMessage(chat.id, msj);
})

bot.setMyCommands([
  {
    command: "/clima",
    description: "Ejemplo: /clima fire."
  },
  {
    command: "/extratools",
    description: "Screenshot de la web pvuextratools"
  },
  {
    command: "/donar",
    description: "Regalame un cafe. Tlg: @jhonnyprz."
  },
]);