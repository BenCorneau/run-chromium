#!/usr/bin/env node

import fetch from 'node-fetch';
import {execFileSync, spawnSync} from 'child_process';
import puppeteer from 'puppeteer';
import os from 'os';
import path from 'path';

//create browserFetcher as global so we can use it to look up platform
const browserFetcher = puppeteer.createBrowserFetcher();
const CHROMIUM_TARGET_PLATFORM = browserFetcher.platform();

function parseVersion(versionString){
    const parts = versionString.split(".");
    if(parts.length != 4) {
        throw Error(`versionString must be in the format: 'MAJOR.MINOR.BUILD.PATCH'. versionString=${versionString}`);
    }
    return{major:parseInt(parts[0]), minor:parseInt(parts[1]), build:parseInt(parts[2]), patch:parseInt(parts[3]) }
}

async function getDownloadableVersions(){
    const url = `https://bencorneau.github.io/browser-versions/chromium/${CHROMIUM_TARGET_PLATFORM}.json`;
    const response = await fetch(url);
    const chromeVersions = await response.json();

    const versionList = new Map();
    for(let versionInfo of chromeVersions){
        const majorVersion = parseVersion(versionInfo.version).major;
        const releaseDate = versionInfo.timestamp.split(" ")[0];
        const revision = versionInfo.downloadRevision;

        if(revision){
            versionList.set(majorVersion, {version:majorVersion, releaseDate, revision});
        }
    }
    return versionList;
}

async function listVersions() {
    const versions = await getDownloadableVersions();
    for (let v of versions.values()) {
        console.log(`${v.version} - ${v.releaseDate}`);
    }
}

async function runLatestVersion(){
    const versions = await getDownloadableVersions();
    const maxVersion = Math.max(...versions.keys());
    const versionInfo = versions.get(maxVersion);
    return runExactVersion(versionInfo);
}

async function runVersion(majorVersion) {
    const versions = await getDownloadableVersions();
    const versionInfo = versions.get(majorVersion);
    if(!versionInfo){
        throw Error(`no chromium package for version=${majorVersion}`)
    }

    return runExactVersion(versionInfo);
}

async function runExactVersion(versionInfo) {

    const revision = versionInfo.revision;

    let revisionInfo = await browserFetcher.revisionInfo(revision);
    if(revisionInfo.local){
        console.log(`Local chromium found. ${versionInfo.version} (${versionInfo.releaseDate}) [rev:${revision}]`);
    }else{
        console.log(`downloading chromium ${versionInfo.version} (${versionInfo.releaseDate}) [rev:${revision}]...`);
        revisionInfo = await browserFetcher.download(revision);
        console.log("download complete.")
    }

    const dataDir = path.join(os.tmpdir(), `chromium${versionInfo.version}_${revision}_user_data_dir`);
    console.log(`user-data-dir=${dataDir}`);

    //https://github.com/GoogleChrome/chrome-launcher/blob/master/docs/chrome-flags-for-tools.md
    const chromiumArgs = [
        `--user-data-dir=${dataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--use-mock-keychain'
    ]


    console.log(`launching '${revisionInfo.executablePath}'...`);
    const childProc = execFileSync(revisionInfo.executablePath, chromiumArgs);//, {detached: true, stdio: 'ignore'});
    console.log("done");
}

function showHelp(){
    console.log("run-chromium: Download and run the latest stable version of chromium or a specified version")
    console.log("  arg      |           description           ");
    console.log("=============================================");
    console.log(" -h        |  display this help message      ");
    console.log(" --help    |                                 ");
    console.log("           |                                 ");
    console.log(" ls        |  list runable chromium versions ");
    console.log(" -l        |                                 ");
    console.log(" --list    |                                 ");
    console.log("           |                                 ");
    console.log(" <version> | attempt to run specifc version of chromium");
    console.log("");
}

async function main(args) {

    if(args.length == 0){
        await runLatestVersion();
        return 0;
    }

    const arg = args[0];
    if(['ls', 'list', '-l', '--list'].includes(arg)){
        await listVersions();
        return 0;
    }

    if(['-h', '--help'].includes(arg)){
        showHelp();
        return 0;
    }

    //attempt to pars the arg as a number
    const version = parseInt(arg);
    if(isNaN(version)){
        console.log(`unknown argument. arg: '${arg}'`);
        showHelp();
        return 1;
    }

    await runVersion(version);
}

try {
    const returnCode = await main(process.argv.slice(2));
    process.exit(returnCode);
} catch (err) {
    console.log(err.message);
    process.exit(2);
}


