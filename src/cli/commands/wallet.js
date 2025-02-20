const fs = require('fs').promises;
const path = require('path');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const inquirer = require('inquirer');

async function loadWalletFromFile(walletPath) {
  const data = await fs.readFile(walletPath, 'utf8');
  const secretKey = bs58.decode(data.trim());
  return Keypair.fromSecretKey(secretKey);
}

async function saveWalletToFile(keypair, walletPath) {
  const secretKeyString = bs58.encode(keypair.secretKey);
  await fs.writeFile(walletPath, secretKeyString, 'utf8');
}

function setupWalletCommands(program, sdk, config) {
  const walletCmd = program.command('wallet');

  walletCmd
    .command('create')
    .description('Create a new wallet')
    .argument('<name>', 'Name of the wallet')
    .action(async (name) => {
      try {
        const keypair = Keypair.generate();
        const walletDir = config.walletPath;
        await fs.mkdir(walletDir, { recursive: true });
        
        const walletPath = path.join(walletDir, `${name}.json`);
        await saveWalletToFile(keypair, walletPath);
        
        console.log(`Created new wallet: ${name}`);
        console.log(`Public Key: ${keypair.publicKey.toString()}`);
        console.log(`Wallet saved to: ${walletPath}`);
      } catch (error) {
        console.error('Failed to create wallet:', error);
      }
    });

  walletCmd
    .command('list')
    .description('List all wallets')
    .action(async () => {
      try {
        const walletDir = config.walletPath;
        const files = await fs.readdir(walletDir);
        
        console.log('Available wallets:');
        for (const file of files) {
          if (file.endsWith('.json')) {
            const walletPath = path.join(walletDir, file);
            const keypair = await loadWalletFromFile(walletPath);
            console.log(`- ${file.replace('.json', '')}: ${keypair.publicKey.toString()}`);
          }
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log('No wallets found. Create one using: wallet create <name>');
        } else {
          console.error('Failed to list wallets:', error);
        }
      }
    });

  walletCmd
    .command('import')
    .description('Import a wallet from private key')
    .argument('<name>', 'Name for the imported wallet')
    .action(async (name) => {
      try {
        const { privateKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'privateKey',
            message: 'Enter the private key (base58 encoded):',
          },
        ]);

        const secretKey = bs58.decode(privateKey);
        const keypair = Keypair.fromSecretKey(secretKey);
        
        const walletDir = config.walletPath;
        await fs.mkdir(walletDir, { recursive: true });
        
        const walletPath = path.join(walletDir, `${name}.json`);
        await saveWalletToFile(keypair, walletPath);
        
        console.log(`Imported wallet: ${name}`);
        console.log(`Public Key: ${keypair.publicKey.toString()}`);
        console.log(`Wallet saved to: ${walletPath}`);
      } catch (error) {
        console.error('Failed to import wallet:', error);
      }
    });

  walletCmd
    .command('balance')
    .description('Check wallet balance')
    .argument('<name>', 'Name of the wallet')
    .action(async (name) => {
      try {
        const walletPath = path.join(config.walletPath, `${name}.json`);
        const keypair = await loadWalletFromFile(walletPath);
        
        const balance = await sdk.connection.getBalance(keypair.publicKey);
        console.log(`Balance for ${name}: ${balance / 1e9} SOL`);
      } catch (error) {
        console.error('Failed to check balance:', error);
      }
    });
}

module.exports = {
  setupWalletCommands,
  loadWalletFromFile,
}; 