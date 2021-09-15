#!/usr/bin/env node

const {exec} = require("child_process");
const puppeteer = require('puppeteer');

const appPath = puppeteer.executablePath();
console.log(`opening '${appPath}'...`);
exec(appPath);