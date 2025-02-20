const { PublicKey } = require('@solana/web3.js');

function setupInfoCommands(program, sdk, config) {
  const infoCmd = program.command('info');

  infoCmd
    .command('token')
    .description('Get token information')
    .argument('<mint>', 'Token mint address')
    .action(async (mintAddress) => {
      try {
        const mint = new PublicKey(mintAddress);
        const globalAccount = await sdk.getGlobalAccount();
        const price = await globalAccount.getCurrentPrice(mint);
        const bondingCurve = await sdk.getBondingCurveAccount(mint);
        
        console.log('\nToken Information:');
        console.log('------------------');
        console.log(`Mint Address: ${mintAddress}`);
        console.log(`Current Price: ${price} SOL`);
        console.log(`Total Supply: ${bondingCurve.totalSupply.toString()}`);
        console.log(`Fees:`);
        console.log(`- Buy Fee: ${bondingCurve.buyFeePercent}%`);
        console.log(`- Sell Fee: ${bondingCurve.sellFeePercent}%`);
      } catch (error) {
        console.error('Failed to get token information:', error);
      }
    });

  infoCmd
    .command('account')
    .description('Get global account information')
    .action(async () => {
      try {
        const globalAccount = await sdk.getGlobalAccount();
        
        console.log('\nGlobal Account Information:');
        console.log('-------------------------');
        console.log(`Fee Recipient: ${globalAccount.feeRecipient.toString()}`);
        console.log(`Authority: ${globalAccount.authority.toString()}`);
      } catch (error) {
        console.error('Failed to get account information:', error);
      }
    });
}

module.exports = {
  setupInfoCommands,
}; 