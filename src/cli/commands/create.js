const { Keypair } = require('@solana/web3.js');
const inquirer = require('inquirer');
const { loadWalletFromFile } = require('./wallet');
const path = require('path');
const fs = require('fs').promises;
const FormData = require('form-data');
const axios = require('axios');

async function promptTokenDetails() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Enter token name:',
      validate: input => input.length > 0,
    },
    {
      type: 'input',
      name: 'symbol',
      message: 'Enter token symbol:',
      validate: input => input.length > 0,
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter token description:',
      validate: input => input.length > 0,
    },
    {
      type: 'input',
      name: 'imagePath',
      message: 'Enter path to token image file (PNG/JPG):',
      validate: async (input) => {
        try {
          await fs.access(input);
          return true;
        } catch {
          return 'Please enter a valid file path';
        }
      }
    },
    {
      type: 'input',
      name: 'twitter',
      message: 'Enter Twitter handle (optional):',
    },
    {
      type: 'input',
      name: 'telegram',
      message: 'Enter Telegram group (optional):',
    },
    {
      type: 'input',
      name: 'website',
      message: 'Enter website URL (optional):',
    },
    {
      type: 'confirm',
      name: 'autoBuy',
      message: 'Do you want to automatically buy tokens after creation?',
      default: false,
    },
    {
      type: 'number',
      name: 'buyAmount',
      message: 'Enter amount of SOL to spend on initial buy:',
      when: answers => answers.autoBuy,
      validate: input => input > 0,
    },
  ]);
}

async function createMetadataWithFile(tokenDetails) {
  try {
    // Read the image file as a Buffer
    const imageBuffer = await fs.readFile(tokenDetails.imagePath || tokenDetails.image);
    
    // Create FormData instance
    const formData = new FormData();
    
    // Append the image buffer as a file
    const imagePath = tokenDetails.imagePath || tokenDetails.image;
    formData.append('file', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    });
    
    // Append other metadata
    formData.append('name', tokenDetails.name);
    formData.append('symbol', tokenDetails.symbol);
    formData.append('description', tokenDetails.description || '');
    formData.append('twitter', tokenDetails.twitter || '');
    formData.append('telegram', tokenDetails.telegram || '');
    formData.append('website', tokenDetails.website || '');
    formData.append('showName', 'true');

    // Make the request to pump.fun API
    const response = await axios.post('https://pump.fun/api/ipfs', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to upload metadata: ${response.statusText}`);
    }

    const result = response.data;
    return result.metadataUri || result.uri;
  } catch (error) {
    console.error('Error creating metadata:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function promptBundleDetails(buyerCount) {
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Enter token name:',
      validate: input => input.length > 0,
    },
    {
      type: 'input',
      name: 'symbol',
      message: 'Enter token symbol:',
      validate: input => input.length > 0,
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter token description:',
      validate: input => input.length > 0,
    },
    {
      type: 'input',
      name: 'imagePath',
      message: 'Enter path to token image file (PNG/JPG):',
      validate: async (input) => {
        try {
          await fs.access(input);
          return true;
        } catch {
          return 'Please enter a valid file path';
        }
      }
    },
    {
      type: 'input',
      name: 'twitter',
      message: 'Enter Twitter handle (optional):',
    },
    {
      type: 'input',
      name: 'telegram',
      message: 'Enter Telegram group (optional):',
    },
    {
      type: 'input',
      name: 'website',
      message: 'Enter website URL (optional):',
    }
  ];

  // Add amount questions for each buyer
  for (let i = 0; i < buyerCount; i++) {
    questions.push({
      type: 'number',
      name: `buyAmount${i}`,
      message: `Enter amount of SOL to spend for wallet ${i + 1}:`,
      validate: input => input > 0,
    });
  }

  return inquirer.prompt(questions);
}

function setupCreateCommands(program, sdk, config) {
  const createCmd = program.command('create');

  createCmd
    .command('token')
    .description('Create a new token')
    .argument('<wallet>', 'Wallet name to use for creation')
    .option('-n, --name <name>', 'Token name')
    .option('-s, --symbol <symbol>', 'Token symbol')
    .option('-i, --image <path>', 'Path to token image')
    .option('-d, --description <text>', 'Token description')
    .option('-b, --buy-amount <amount>', 'Amount of SOL to spend on initial buy', parseFloat)
    .action(async (walletName, options) => {
      try {
        const walletPath = path.join(config.walletPath, `${walletName}.json`);
        const creator = await loadWalletFromFile(walletPath);
        
        // If options are not provided, prompt for them
        const tokenDetails = options.name && options.symbol && options.image ? 
          options : 
          await promptTokenDetails();

        // Generate a new mint keypair
        const mint = Keypair.generate();
        
        console.log('\nToken Creation Details:');
        console.log(`- Name: ${tokenDetails.name}`);
        console.log(`- Symbol: ${tokenDetails.symbol}`);
        console.log(`- Mint Address: ${mint.publicKey.toString()}`);
        console.log(`- Image: ${tokenDetails.imagePath || tokenDetails.image}`);
        if (tokenDetails.description) {
          console.log(`- Description: ${tokenDetails.description}`);
        }
        if (tokenDetails.buyAmount) {
          console.log(`- Initial Buy Amount: ${tokenDetails.buyAmount} SOL`);
        }

        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: 'Do you want to proceed with token creation?',
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log('Token creation cancelled');
          return;
        }

        // Get metadata URI
        const metadataUri = await createMetadataWithFile(tokenDetails);
        console.log(`Metadata uploaded successfully: ${metadataUri}`);

        const createTokenMetadata = {
          name: tokenDetails.name,
          symbol: tokenDetails.symbol,
          metadataUri: metadataUri,
          file: null,
          description: tokenDetails.description || '',
          twitter: tokenDetails.twitter || '',
          telegram: tokenDetails.telegram || '',
          website: tokenDetails.website || '',
          showName: true
        };

        if (tokenDetails.buyAmount) {
          const result = await sdk.createAndBuy(
            creator,
            mint,
            createTokenMetadata,
            tokenDetails.buyAmount,
            BigInt(config.defaultSlippage),
            config.priorityFee
          );
          console.log('\nToken created and bought successfully!');
          console.log(`Transaction ID: ${result.txid}`);
        } else {
          const result = await sdk.createAndBuy(
            creator,
            mint,
            createTokenMetadata,
            0,
            BigInt(config.defaultSlippage),
            config.priorityFee
          );
          console.log('\nToken created successfully!');
          console.log(`Transaction ID: ${result.txid}`);
        }

      } catch (error) {
        console.error('Failed to create token:', error);
        if (error.response) {
          try {
            const text = await error.response.text();
            console.error('API Response:', text);
          } catch (e) {
            console.error('API Response:', error.response.data);
          }
        }
        // Log additional error details if available
        if (error.code) {
          console.error('Error Code:', error.code);
        }
        if (error.message) {
          console.error('Error Message:', error.message);
        }
        if (error.stack) {
          console.error('Stack Trace:', error.stack);
        }
      }
    });

  createCmd
    .command('bundle')
    .description('Create and buy tokens in bulk for multiple wallets with different amounts')
    .argument('<creator-wallet>', 'Wallet name to use for token creation')
    .argument('<buyers-file>', 'Path to JSON file containing list of buyer wallet names and amounts')
    .option('-n, --name <name>', 'Token name')
    .option('-s, --symbol <symbol>', 'Token symbol')
    .option('-i, --image <path>', 'Path to token image')
    .option('-d, --description <text>', 'Token description')
    .action(async (creatorWalletName, buyersFile, options) => {
      try {
        // Load creator wallet
        const creatorWalletPath = path.join(config.walletPath, `${creatorWalletName}.json`);
        const creator = await loadWalletFromFile(creatorWalletPath);

        // Load buyers from file
        // Expected format: [{"name": "wallet1", "amount": 1.5}, {"name": "wallet2", "amount": 2.0}]
        const buyersData = await fs.readFile(buyersFile, 'utf8');
        const buyersConfig = JSON.parse(buyersData);

        // Validate buyers config
        if (!Array.isArray(buyersConfig) || buyersConfig.length === 0) {
          throw new Error('Buyers file must contain an array of wallet configurations');
        }

        // Load all buyer wallets
        const buyerWallets = await Promise.all(
          buyersConfig.map(async (buyer) => {
            const walletPath = path.join(config.walletPath, `${buyer.name}.json`);
            const wallet = await loadWalletFromFile(walletPath);
            return {
              wallet,
              amount: buyer.amount
            };
          })
        );

        // Get token details
        const tokenDetails = options.name && options.symbol && options.image ? 
          { ...options } : 
          await promptBundleDetails(buyersConfig.length);

        // Generate a new mint keypair
        const mint = Keypair.generate();

        console.log('\nBundle Creation Details:');
        console.log(`- Name: ${tokenDetails.name}`);
        console.log(`- Symbol: ${tokenDetails.symbol}`);
        console.log(`- Mint Address: ${mint.publicKey.toString()}`);
        console.log(`- Number of Buyers: ${buyerWallets.length}`);
        console.log('\nBuyer Details:');
        buyersConfig.forEach((buyer, index) => {
          console.log(`${index + 1}. ${buyer.name}: ${buyer.amount} SOL`);
        });
        if (tokenDetails.description) {
          console.log(`\n- Description: ${tokenDetails.description}`);
        }
        if (tokenDetails.imagePath) {
          console.log(`\n- Image: ${tokenDetails.imagePath}`);
        }

        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: 'Do you want to proceed with bundle creation?',
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log('Bundle creation cancelled');
          return;
        }

        // Get metadata URI
        const metadataUri = await createMetadataWithFile(tokenDetails);
        console.log(`Metadata uploaded successfully: ${metadataUri}`);

        const createTokenMetadata = {
          name: tokenDetails.name,
          symbol: tokenDetails.symbol,
          metadataUri: metadataUri,
          file: null,
          description: tokenDetails.description || '',
          twitter: tokenDetails.twitter || '',
          telegram: tokenDetails.telegram || '',
          website: tokenDetails.website || '',
          showName: true
        };

        // Extract wallets and amounts for the SDK call
        const wallets = buyerWallets.map(b => b.wallet);
        const amounts = buyerWallets.map(b => b.amount);

        // Use Jito bundle execution
        const result = await sdk.bundleBuys(
          creator,
          mint,
          createTokenMetadata,
          amounts,
          wallets,
          BigInt(config.defaultSlippage),
          config.jito_fee || 0.00001 // Use configured Jito fee or default
        );

        console.log('\nBundle creation and buys successful!');
        console.log(`Transaction ID: ${result.txid}`);
        console.log('\nBuyer Wallets and Amounts:');
        buyersConfig.forEach((buyer, index) => {
          console.log(`${index + 1}. ${buyer.name}: ${buyer.amount} SOL - ${wallets[index].publicKey.toString()}`);
        });

      } catch (error) {
        console.error('Failed to create bundle:', error);
        if (error.logs) {
          console.error('Transaction logs:', error.logs);
        }
      }
    });
}

module.exports = {
  setupCreateCommands,
}; 