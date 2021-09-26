require('dotenv').config()

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
]

const probability_text = (text) =>  {
  let translate = [
      { 
        name: 'Plant type', 
        value: 'Tipo de Planta\n\n' 
      },
      { 
        name: 'Negative event probability', 
        value: '\n - Probabilidad negativa del evento' 
      },
      { 
        name: 'Positive event probability', 
        value: '\n - Probabilidad positiva del evento' 
      },
      { 
        name: 'Neutral event probability', 
        value: '\n - Probabilidad de evento neutral' 
      },
      { 
        name: 'Positive max impact', 
        value: '\n - Impacto máximo positivo' 
      },
      { 
        name: 'Negative max impact', 
        value: '\n - Impacto máximo negativo' 
      },
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
}

bot.onText(/\/clima/, async data => {
  const { chat, text } = data
  let msj = 'Debes proporcionar un tipo de planta.'
  let type = text.split(' ')
  type = type[1]
  if (type) {
    if (plant_types.includes(type.toLocaleLowerCase())) {
      msj = '';
      const params = {
        type, 
        header: '.table-impact-header',
        content: '.table-impact-content',
        pathGreenHouse: '[src="assets/images/useGreenhouse.png"]'
      }
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      
      await page.setDefaultNavigationTimeout(150000)
      await page.goto(url_tools);
      await page.waitForSelector('[name="searchTerm"]');
      await page.type('[name="searchTerm"]', type);

      const data = await page.evaluate((params) => {
        const range = n => Array.from(Array(n).keys())
        const { type, pathGreenHouse, header, content } = params
        const titles = document.querySelectorAll(header)
        const values = document.querySelectorAll(content)
        const useGreenhouse = document.querySelector(pathGreenHouse)? true: false
        return {
            useGreenhouse,
            probability: range(titles.length).map(index => {
                return {
                    name: titles[index].getInnerHTML(),
                    value: values[index].getInnerHTML()
                }
            }).filter(a=>a.name != 'Recommended action')
        };
      }, params);

      await browser.close();
      
      data.probability.forEach(element => {
        const { name, value } = element
        msj+= `${probability_text(name)}: ${value}.`
      });
      msj += probability_text(data.useGreenhouse? 'use': 'not use')
    }else{
      msj = 'Debes proporcionar un tipo de planta valido.';
    }  
  }
  bot.sendMessage(chat.id, msj);
});

bot.setMyCommands([
  {
    command: "/clima",
    description: "Con el comando /clima <tipo de planta>, obtienes la probabilidad para el dia de mañana.",
  }
]);