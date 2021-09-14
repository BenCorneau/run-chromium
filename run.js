#!/usr/bin/env node

const open = require('open');
const path = require('path');
const fs = require('fs');

const localChromeDir = path.join(__dirname, 'node_modules', 'puppeteer', '.local-chromium');

function walk(dir){
    for(let entry of fs.readdirSync(dir, {'withFileTypes':true})){
        if(entry.name == 'Chromium.app' || entry.name == "Chromium.exe"){
            return path.join(dir, entry.name);
        }

        if(!entry.name.startsWith(".") && entry.isDirectory()){
            const res = walk(path.join(dir, entry.name));
            if(res){
                return res;
            }
        }
    }
}

const appPath = walk(localChromeDir);
if(appPath){
    console.log(`starting ${appPath}`);
    open(appPath);
}else{
    console.log(`unable to locate chromium application.  Search path:${localChromeDir}`);
}