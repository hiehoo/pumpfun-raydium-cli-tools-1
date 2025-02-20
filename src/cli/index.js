#!/usr/bin/env node

const { Command } = require('commander');
const { version } = require('../../package.json');
const { loadConfig, saveConfig } = require('./config');
const { initializeSDK } = require('./sdk');
const { setupCreateCommands } = require('./commands/create');
const { setupTradeCommands } = require('./commands/trade');
const { setupWalletCommands } = require('./commands/wallet');
const { setupInfoCommands } = require('./commands/info');
const { setupConfigCommands } = require('./commands/config');

const program = new Command();

// Initialize CLI
async function initCLI() {
  const config = await loadConfig();
  const sdk = await initializeSDK(config);

  program
    .name('pumpfun-cli')
    .description('CLI tool for interacting with PumpFun SDK')
    .version(version);

  // Setup command groups
  setupCreateCommands(program, sdk, config);
  setupTradeCommands(program, sdk, config);
  setupWalletCommands(program, sdk, config);
  setupInfoCommands(program, sdk, config);
  setupConfigCommands(program, config);

  program.parse(process.argv);
}

initCLI().catch(console.error); 