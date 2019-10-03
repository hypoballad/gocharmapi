(async function() {
    const express = require('express')
    const basicAuth = require('basic-auth-connect')
    const puppeteer = require('puppeteer-core')
    const url = require('url')
    const app = express()
    const commandLineArgs = require('command-line-args')

    const optionDefinitions = [
        {
            name: 'chrome',
            type: String,
            defaultValue: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        },
        {
            name: 'debug',
            type: Boolean,
            defaultValue: false
        },
        {
            name: 'user',
            type: String,
            defaultValue: 'root'
        },
        {
            name: 'passwd',
            type: String,
            defaultValue: 'admin'
        },
        {
          name: 'menu',
          type: String,
          defaultValue: 'https://menu.5ch.net/bbsmenu.html'
        },
        {
          name: 'port',
          alias: 'p',
          type: Number,
          defaultValue: 3000
        }
    ];
    const options = commandLineArgs(optionDefinitions);
    console.log(options)
    const port = options.port
    
    if (!options.debug) {
        app.use(basicAuth(options.user, options.passwd))
    }

    const browser = await puppeteer.launch({args: ['--no-sandbox'], executablePath: options.chrome})
    const page = await browser.newPage()

    const scrapeBBS = async () => {
        await page.goto(options.menu);
    
        const elem = await page.evaluate(() => {
            const schedules = Array.from(document.querySelectorAll('body > font > a'))
            return schedules.map(el => (
                {bbs: el.getAttribute('href'), 
                 title: el.textContent}))
        })
    
        return elem
    }

    const scrapeSubject = async (target) => {
        await page.goto(target);
        
        const elem = await page.evaluate(() => {
            const schedules = Array.from(document.querySelectorAll('body > div.THREAD_MENU > div > p'))
            let regex = /l50$/g
            return schedules.map(el => (
                {thread: el.querySelector('a:nth-child(1)').getAttribute('href').replace(regex, ''), 
                 title: el.querySelector('a:nth-child(1)').textContent}))
        })
        return elem
    }

    const scrapeThread = async (target) => {
        await page.goto(target);
        const elem = await page.evaluate(() => {
            const schedules = Array.from(document.querySelectorAll('body > div.container.container_body.mascot > div.thread > div.post'))
            return schedules.map(el => (
                {no: el.querySelector('div.meta > span.number').innerHTML, 
                 name: el.querySelector('div.meta > span.name').innerHTML,
                 date: el.querySelector('div.meta > span.date').innerHTML,
                 message: el.querySelector('div.message > span.escaped').innerHTML}))
        })
        return elem
    }
    
    app.get('/', (req, res) => res.send('running!'))

    app.get('/bbs', (req, res) => {
        res.header('Content-Type', 'application/json; charset=utf-8')
        el = scrapeBBS()
        el.then(e => res.send(e))
    })

    app.get('/subject/:target', (req, res) => {
        res.header('Content-Type', 'application/json; charset=utf-8')
        if (options.debug) {
            console.log(req.params.target)
        }
        el = scrapeSubject(req.params.target)
        el.then(e => res.send(e))
    })

    app.get('/thread/:target/:thread', (req, res) => {
        res.header('Content-Type', 'application/json; charset=utf-8')
        let u = url.parse(req.params.target)
        let base = req.params.target.slice(0, u.path.length * -1)
        let thread = base + req.params.thread
        if (options.debug) {
            console.log(thread)
        }
        el = scrapeThread(thread)
        el.then(e => res.send(e))
    })
    let addr = '0.0.0.0'
    if (options.debug) {
        addr = '127.0.0.1'
    }
    app.listen(port, addr, () => console.log(`gocharm api listening on port ${port}!`))
})()