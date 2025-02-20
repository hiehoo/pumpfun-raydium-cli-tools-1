const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function createDirectories() {
  const configDir = path.join(os.homedir(), '.pump');
  const walletsDir = path.join(configDir, 'wallets');

  try {
    // Create config directory
    await fs.mkdir(configDir, { recursive: true });
    console.log('✓ Created config directory:', configDir);

    // Create wallets directory
    await fs.mkdir(walletsDir, { recursive: true });
    console.log('✓ Created wallets directory:', walletsDir);

    // Create default config if it doesn't exist
    const configFile = path.join(configDir, 'config.json');
    const defaultConfig = {
      network: 'mainnet',
      rpcEndpoint: 'https://api.mainnet-beta.solana.com',
      defaultSlippage: 500, // 5%
      confirmationLevel: 'confirmed',
      walletPath: walletsDir,
      priorityFee: 0.00001,
    };

    try {
      await fs.access(configFile);
      console.log('✓ Config file already exists');
    } catch {
      await fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2));
      console.log('✓ Created default config file:', configFile);
    }

    console.log('\nPump CLI installed successfully! 🚀');
    console.log('\nTo get started:');
    console.log('1. Create a wallet:');
    console.log('   pump wallet create my-wallet');
    console.log('\n2. Configure settings (optional):');
    console.log('   pump config set');
    console.log('\n3. Create your first token:');
    console.log('   pump create token my-wallet -n "My Token" -s "MT"');
  } catch (error) {
    console.error('Error during installation:', error);
    process.exit(1);
  }
}

createDirectories().catch(console.error); 