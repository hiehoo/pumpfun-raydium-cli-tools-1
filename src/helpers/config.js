const {
  Currency,
  Token,
  ENDPOINT,
  MAINNET_PROGRAM_ID,
  RAYDIUM_MAINNET,
  TxVersion,
  LOOKUP_TABLE_CACHE,
  TOKEN_PROGRAM_ID,
} = require("@raydium-io/raydium-sdk");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const dotenv = require("dotenv");
const bs58 = require("bs58");
const path = require("path");
// default path: /Users/{your_user_name}/Desktop/Solana-Memecoin-CLI/src/helpers/.env
// please specify your own .env path
const envPath = path.join(__dirname, ".env");
dotenv.config({
  path: envPath, // fill in your .env path
});

// Default values for required environment variables
const DEFAULT_ENV = {
  JITO_FEE: "0.00001",
  MAINNET_ENDPOINT: "https://api.mainnet-beta.solana.com",
  DEVNET_ENDPOINT: "https://api.devnet.solana.com",
  SHYFT_API_KEY: "",
};

// Helper function to get environment variable with fallback
function getEnvVar(name) {
  return process.env[name] || DEFAULT_ENV[name];
}

const jito_fee = getEnvVar("JITO_FEE");
const shyft_api_key = getEnvVar("SHYFT_API_KEY");
const main_endpoint = getEnvVar("MAINNET_ENDPOINT");
const dev_endpoint = getEnvVar("DEVNET_ENDPOINT");

// Create a dummy wallet if PRIVATE_KEY is not provided
const wallet = process.env.PRIVATE_KEY ? 
  Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY)) : 
  Keypair.generate();

const connection = new Connection(main_endpoint, "confirmed");
const dev_connection = new Connection(dev_endpoint, "confirmed");

const PROGRAMIDS = MAINNET_PROGRAM_ID;
const RAYDIUM_MAINNET_API = RAYDIUM_MAINNET;
const makeTxVersion = TxVersion.V0;
const _ENDPOINT = ENDPOINT;
const addLookupTableInfo = LOOKUP_TABLE_CACHE;

const DEFAULT_TOKEN = {
  SOL: new Currency(9, "SOL", "SOL"),
  WSOL: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey("So11111111111111111111111111111111111111112"),
    9,
    "WSOL",
    "WSOL"
  ),
  USDC: new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    6,
    "USDC",
    "USDC"
  ),
};

module.exports = {
  wallet,
  dev_connection,
  dev_endpoint,
  main_endpoint,
  connection,
  TOKEN_PROGRAM_ID,
  RAYDIUM_MAINNET,
  RAYDIUM_MAINNET_API,
  PROGRAMIDS,
  makeTxVersion,
  DEFAULT_TOKEN,
  addLookupTableInfo,
  _ENDPOINT,
  shyft_api_key,
  jito_fee,
};
