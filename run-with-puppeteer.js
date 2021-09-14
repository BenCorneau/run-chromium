#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function run(){
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();


    await page.waitForTimeout(60*60*1000); //wait an hour
}

run(); 
