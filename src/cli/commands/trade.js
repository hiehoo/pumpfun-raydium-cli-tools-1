const { PublicKey } = require('@solana/web3.js');
const inquirer = require('inquirer');
const { loadWalletFromFile } = require('./wallet');
const path = require('path');

async function confirmTransaction(message) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

function setupTradeCommands(program, sdk, config) {
  const tradeCmd = program.command('trade');

  tradeCmd
    .command('buy')
    .description('Buy tokens')
    .argument('<wallet>', 'Wallet name to use for buying')
    .argument('<mint>', 'Token mint address')
    .option('-a, --amount <amount>', 'Amount in SOL to spend', parseFloat)
    .option('-s, --slippage <bps>', 'Slippage tolerance in basis points', parseInt, config.defaultSlippage)
    .action(async (walletName, mintAddress, options) => {
      try {
        const walletPath = path.join(config.walletPath, `${walletName}.json`);
        const keypair = await loadWalletFromFile(walletPath);
        const mint = new PublicKey(mintAddress);

        // Get current price and expected output
        const globalAccount = await sdk.getGlobalAccount();
        const buyAmount = globalAccount.getInitialBuyPrice(options.amount);
        
        console.log(`Transaction Details:`);
        console.log(`- Input: ${options.amount} SOL`);
        console.log(`- Expected Output: ${buyAmount} tokens`);
        console.log(`- Slippage Tolerance: ${options.slippage / 100}%`);

        if (!await confirmTransaction('Do you want to proceed with this transaction?')) {
          console.log('Transaction cancelled');
          return;
        }

        const result = await sdk.buy(
          keypair,
          mint,
          options.amount,
          BigInt(options.slippage),
          config.priorityFee
        );

        console.log('Transaction successful!');
        console.log(`Transaction ID: ${result.txid}`);
      } catch (error) {
        console.error('Failed to execute buy:', error);
      }
    });

  tradeCmd
    .command('sell')
    .description('Sell tokens')
    .argument('<wallet>', 'Wallet name to use for selling')
    .argument('<mint>', 'Token mint address')
    .argument('<amount>', 'Amount of tokens to sell')
    .option('-s, --slippage <bps>', 'Slippage tolerance in basis points', parseInt, config.defaultSlippage)
    .action(async (walletName, mintAddress, amount, options) => {
      try {
        const walletPath = path.join(config.walletPath, `${walletName}.json`);
        const keypair = await loadWalletFromFile(walletPath);
        const mint = new PublicKey(mintAddress);

        // Get current price and expected output
        const globalAccount = await sdk.getGlobalAccount();
        const sellAmount = parseFloat(amount);
        
        console.log(`Transaction Details:`);
        console.log(`- Input: ${sellAmount} tokens`);
        console.log(`- Slippage Tolerance: ${options.slippage / 100}%`);

        if (!await confirmTransaction('Do you want to proceed with this transaction?')) {
          console.log('Transaction cancelled');
          return;
        }

        const result = await sdk.sell(
          keypair,
          mint,
          sellAmount,
          BigInt(options.slippage),
          config.priorityFee
        );

        console.log('Transaction successful!');
        console.log(`Transaction ID: ${result.txid}`);
      } catch (error) {
        console.error('Failed to execute sell:', error);
      }
    });

  tradeCmd
    .command('price')
    .description('Check token price')
    .argument('<mint>', 'Token mint address')
    .action(async (mintAddress) => {
      try {
        const mint = new PublicKey(mintAddress);
        const globalAccount = await sdk.getGlobalAccount();
        const price = await globalAccount.getCurrentPrice(mint);
        
        console.log(`Current price: ${price} SOL per token`);
      } catch (error) {
        console.error('Failed to get price:', error);
      }
    });
}

module.exports = {
  setupTradeCommands,
}; 