# GVCoin Deployment Guide

## Prerequisites
- MetaMask with a Sepolia testnet wallet
- Sepolia ETH for gas (get from [Sepolia Faucet](https://sepoliafaucet.com/))

## Step 1: Deploy to Sepolia via Remix

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file `GVCoin.sol` and paste the contract code from `contracts/GVCoin.sol`
3. In the Solidity Compiler tab:
   - Compiler version: `0.8.20`
   - Click "Compile GVCoin.sol"
4. In the Deploy & Run tab:
   - Environment: "Injected Provider - MetaMask" (connects to your MetaMask)
   - Make sure MetaMask is on **Sepolia testnet**
   - Constructor arg `_minter`: paste your server's minter wallet address
   - Click "Deploy"
5. Copy the deployed contract address

## Step 2: Configure Environment

Add to your `.env.local`:

```env
# GVCoin contract address (from step 1)
NEXT_PUBLIC_GVCOIN_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Minter wallet private key (the wallet that will sign mint transactions)
# NEVER commit this to git!
GVCOIN_MINTER_PRIVATE_KEY=0xYOUR_MINTER_PRIVATE_KEY

# Sepolia RPC (or use your own Alchemy/Infura endpoint)
GVCOIN_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

## Step 3: Add Token to MetaMask

Players can add GVCoin to their MetaMask by clicking the "Add to MetaMask" button
in the game, or manually:

1. Open MetaMask
2. Switch to Sepolia testnet
3. Click "Import tokens"
4. Paste the contract address
5. Symbol: GVC, Decimals: 18

## Architecture

```
Player clicks "Exchange" in game
  → Frontend calls POST /api/gvcoin/exchange
  → Server deducts GACHA coins from DB
  → Server signs & sends mint transaction on-chain
  → GVCoin appears in player's MetaMask wallet
```

## Economy Balance

- **Exchange rate**: 100 GACHA = 1 GVCoin
- **Minimum exchange**: 100 GACHA
- GVCoin is an ERC-20 token that can be freely transferred between wallets
- The game server is the only address that can mint new GVCoin
