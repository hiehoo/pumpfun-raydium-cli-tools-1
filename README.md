# Pump CLI

A command-line interface tool for interacting with pump.fun, allowing you to create and manage tokens on Solana.

## Features

- Create new tokens with customizable parameters
- Execute bulk token creation and buys
- Manage wallets
- Trade tokens (buy/sell)
- View token information
- Configure network settings

## Installation

```bash
npm install -g pumpfun-tool
```

## Prerequisites

- Node.js v16 or higher
- npm v7 or higher
- Solana wallet with SOL for transactions

## Configuration

The CLI tool can be configured using the following command:

```bash
pump config set
```

This will prompt you for:

- Network selection (mainnet/devnet)
- RPC endpoint
- Default slippage tolerance
- Confirmation level
- Priority fee

View current configuration:

```bash
pump config show
```

## Usage

### Wallet Management

Create a new wallet:

```bash
pump wallet create <name>
```

List wallets:

```bash
pump wallet list
```

Import existing wallet:

```bash
pump wallet import <name>
```

Check wallet balance:

```bash
pump wallet balance <name>
```

### Token Creation

Create a single token:

```bash
pump create token <wallet-name> \
  -n "Token Name" \
  -s "SYMBOL" \
  -i ./path/to/image.png \
  -d "Token description" \
  -b 1.5  # Optional: Initial buy amount in SOL
```

Create token bundle (bulk creation):

```bash
pump create bundle <creator-wallet> <buyers-file.json>
```

### Trading

Buy tokens:

```bash
pump trade buy <wallet-name> <mint-address> -a <amount-in-sol>
```

Sell tokens:

```bash
pump trade sell <wallet-name> <mint-address> <amount>
```

Check token price:

```bash
pump trade price <mint-address>
```

### Token Information

Get token details:

```bash
pump info token <mint-address>
```

## Important Notes

1. This tool only works with pump.fun's mainnet services
2. Always verify transaction details before confirming
3. Keep your wallet files secure
4. Ensure sufficient SOL balance for transactions

## Error Handling

If you encounter errors:

1. Check your network connection
2. Verify wallet has sufficient SOL
3. Ensure correct file paths for images
4. Verify token parameters are valid

## Support

For issues and feature requests, please visit:
[GitHub Issues](https://github.com/outsmartchad/solana-memecoin-cli/issues)

## License

ISC License
