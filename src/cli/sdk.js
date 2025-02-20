const { Connection, Keypair } = require('@solana/web3.js');
const { AnchorProvider } = require('@coral-xyz/anchor');
const { PumpFunSDK } = require('../pumpfunsdk/pumpdotfun-sdk/src/pumpfun');

async function initializeSDK(config) {
  const connection = new Connection(config.rpcEndpoint, {
    commitment: config.confirmationLevel,
  });

  // Create a dummy wallet for provider initialization
  const dummyWallet = Keypair.generate();
  const wallet = {
    publicKey: dummyWallet.publicKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  };

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: config.confirmationLevel }
  );

  return new PumpFunSDK(provider);
}

module.exports = {
  initializeSDK,
}; 