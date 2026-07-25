# Midnight Counter ZK DApp

A production-ready full-stack Zero-Knowledge Counter DApp built on the Midnight Blockchain platform using Compact smart contracts, TypeScript API layer, CLI, and React Web UI with Lace wallet integration.

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |
| Preview | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

```env
CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

> **Note**: Contract deployment has been intentionally skipped per Level 1 Challenge rules. Follow the [Manual Deployment](#manual-deployment) section below to deploy to testnet and backfill this address.

---

## Features

- **Public Counter Increments**: Anyone on the Midnight network can perform transparent counter increments.
- **ZK Private Step Increments**: Users can choose a custom increment amount (1-100) in zero-knowledge. The secret step size is proven correct inside ZK circuits without revealing raw user secrets.
- **Role & Ownership Verification**: ZK proof validates whether the caller is the authorized `lastActor` allowed to reset the counter state.
- **Full-Stack Integration**: Integrated React UI with Lace wallet connector, TypeScript API layer, and interactive CLI tool.

---

## What This Project Does

This project implements a decentralized, zero-knowledge counter on the Midnight network. Unlike traditional public blockchains where every transaction input is completely transparent, this DApp demonstrates how users can interact with global state while protecting sensitive private state (such as witness keys and off-chain input parameters) using Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge (zk-SNARKs).

---

## Privacy Model

### Public Data (On-Ledger)
- `count`: Global public counter state.
- `totalOperations`: Total number of state updates performed.
- `lastActor`: Hashed public identity commitment of the user who performed the most recent state change.

### Private Data (Local Witness)
- `localSecretKey`: 32-byte secret key stored exclusively in local browser/client private state.
- `secretAmount`: Private increment amount provided by user witness during ZK proof creation.

### Privacy Guarantees
- The raw `localSecretKey` is **never** transmitted over the network or written to ledger state.
- `disclose()` is invoked strictly on deterministic public key hashes derived via ZK circuits.
- Zero-knowledge proofs prove that increment operations strictly satisfy circuit bounds (e.g. step size within 1-100 limit) without exposing raw user secrets.

---

## Tech Stack

- **Smart Contract Language**: Compact `v0.23`
- **Compiler**: `@midnight-ntwrk/compact-compiler` `v0.5.1`
- **Proof Generation**: `midnightnetwork/proof-server`
- **Frontend**: React 19, Vite, Material UI (MUI), Emotion
- **Backend / API**: TypeScript, RxJS, Pino, Midnight JS SDK (`v4.1.1`)
- **CLI**: Node.js CLI launcher with readline interface

---

## Folder Structure

```
.
├── contract/              # Compact smart contract source code & generated TS artifacts
│   ├── src/
│   │   ├── counter.compact # Primary Compact smart contract
│   │   ├── witnesses.ts    # Private state & ZK witness definitions
│   │   └── index.ts        # Contract module exports
│   └── package.json
├── api/                   # TypeScript contract API wrapper & RxJS observables
│   ├── src/
│   │   ├── index.ts        # CounterAPI class & deploy/join helpers
│   │   └── common-types.ts # Shared types & state interfaces
│   └── package.json
├── bboard-ui/             # React Web Application with Lace Wallet integration
│   ├── src/
│   │   ├── components/     # UI Card, Header, & Counter controls
│   │   ├── config/         # Theme & CONTRACT_ADDRESS placeholder
│   │   └── contexts/       # Browser contract manager & wallet connector
│   └── package.json
├── bboard-cli/            # Command Line Interface launcher
│   ├── src/                # Interactive terminal menus & testnet configurations
│   └── package.json
├── package.json           # Monorepo root package configuration
└── README.md              # Project documentation
```

---

## Prerequisites

Before running the project locally, ensure you have installed:

- **Node.js**: `v24.x` (or `>=24.11.1`)
- **Docker**: Installed and running (required for local proof server container)
- **Compact Compiler**: Installed globally
  ```bash
  npm install -g @midnight-ntwrk/compact-compiler
  ```

---

## Installation

1. Clone the repository and install root dependencies:
   ```bash
   npm install
   ```

2. Install dependencies across all workspace packages:
   ```bash
   cd api && npm install && cd ..
   cd contract && npm install && cd ..
   cd bboard-cli && npm install && cd ..
   cd bboard-ui && npm install && cd ..
   ```

3. Ensure Midnight Proof Server is running:
   ```bash
   docker run -p 6300:6300 midnightnetwork/proof-server
   ```

---

## Compile

Compile the Compact smart contract using the Compact compiler:

```bash
npm run compact
```

Or run directly in the contract directory:
```bash
cd contract && npm run compact
```

---

## Build

Build the full monorepo (smart contract TS wrappers, API library, CLI, and Web UI):

```bash
npm run build
```

---

## Manual Deployment

> ⚠️ **Deployment is intentionally skipped in Level 1**.

Execute the following deployment command to deploy the compiled `counter.compact` contract to the Midnight Preprod testnet:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preprod
```

Or for Preview testnet:
```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preview
```

---

## After Deployment

Once deployment completes:

1. Copy the deployed contract address output from your terminal (e.g. `0x...` or hex string).
2. Replace all occurrences of `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` across the project:
   - `README.md`
   - `bboard-ui/src/config/contract.ts`
   - `.env` files (if created)

No code modifications or architectural changes are required.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_NETWORK_ID` | Midnight network identifier (`preprod` or `preview`) | `preprod` |
| `CONTRACT_ADDRESS` | Deployed Midnight Counter contract address | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

---

## Screenshots

*(Place screenshot images of your running UI and terminal here before final submission)*

- `[Screenshot 1: Web UI Dashboard]`
- `[Screenshot 2: Lace Wallet ZK Proof Sign Prompt]`
- `[Screenshot 3: CLI Interactive Terminal]`

---

## Initial Idea

The initial idea for this project was to construct a minimalist yet feature-complete Zero-Knowledge Counter application that showcases state transitions on the Midnight network, combining public state counters with ZK-bounded private witness step increments.

---

## Troubleshooting

### Proof Server Connection Error
Ensure the Docker proof server container is active on port `6300`:
```bash
docker ps
```
If not running, execute:
```bash
docker run -p 6300:6300 midnightnetwork/proof-server
```

### Compact Compiler Command Not Found
Reinstall `@midnight-ntwrk/compact-compiler` globally:
```bash
npm install -g @midnight-ntwrk/compact-compiler
```

### Wallet Extension Not Responding
Ensure the Midnight Lace Chrome Extension is installed, unlocked, and connected to the correct network (`preprod` or `preview`).
