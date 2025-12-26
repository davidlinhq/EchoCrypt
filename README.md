# EchoCrypt

EchoCrypt is an encrypted group chat built on Zama's FHEVM. It stores the group key on-chain as a fully homomorphic encrypted value and uses FHE access control to grant decryption rights to members. Messages are encrypted client-side and stored on-chain only as ciphertext.

## Overview

EchoCrypt enables private group messaging without relying on an off-chain key server. The blockchain coordinates membership and permissions, while users keep plaintext off-chain. This makes the system composable, auditable, and privacy-preserving at the smart contract layer.

## What Problem It Solves

On-chain chat applications are transparent by default. Even if messages are encrypted, key distribution is often handled off-chain and is difficult to audit. EchoCrypt solves this by placing the encrypted group key on-chain and letting the contract enforce who can decrypt it.

## Core Features

- Encrypted group creation with a name and encrypted group key handle.
- On-chain membership management with FHE permission grants.
- Ciphertext message storage with sender and timestamp metadata.
- Client-side encryption and decryption using a shared group key.

## Architecture and Data Model

### On-Chain Structures

EchoCrypt uses a minimal data model to keep private content off-chain:

- **Group**
  - `name`: group name
  - `creator`: address of the creator
  - `createdAt`: creation timestamp
  - `memberCount`: count of members
  - `encryptedKey`: FHE encrypted group key (`eaddress`)

- **Message**
  - `sender`: address of the sender
  - `timestamp`: message timestamp
  - `ciphertext`: encrypted message payload

### Access Control

The encrypted key is stored as an FHE handle. The contract grants decryption permission using FHEVM ACL functions:

- Creator is granted permission at creation time.
- New members receive permission when they join.
- Only allowed addresses can decrypt the group key off-chain.

### Events

- `GroupCreated(groupId, creator, name)`
- `GroupJoined(groupId, member)`
- `MessageSent(groupId, messageIndex, sender)`

## End-to-End Flow

1. **Create group**
   - Client generates a random group key `A`.
   - Client encrypts `A` with FHE and submits `encryptedKeyExternal` and `inputProof`.
   - Contract stores the encrypted key handle and grants the creator access.

2. **Join group**
   - User calls `joinGroup(groupId)`.
   - Contract adds the user as a member and grants decryption permission.

3. **Send message**
   - Client decrypts the group key `A` locally.
   - Client encrypts a message with `A` and submits ciphertext.
   - Contract stores ciphertext and emits `MessageSent`.

4. **Read message**
   - Client retrieves ciphertext and decrypts it locally with `A`.

## Key Advantages

- **On-chain key distribution**: permissions are enforced by the contract using FHEVM ACLs.
- **No plaintext on-chain**: only encrypted data and metadata are stored on-chain.
- **Composable privacy**: other contracts can integrate without exposing secrets.
- **Auditable membership**: join events are transparent while content remains private.
- **Minimal trust**: no external key server is required.

## Technology Stack

### Smart Contracts

- Solidity (0.8.24)
- Hardhat
- Zama FHEVM (`@fhevm/solidity`)
- TypeScript for deployment scripts and tasks

### Frontend

- React + Vite
- viem for contract reads
- ethers for contract writes
- rainbowkit/wagmi for wallet connection (as configured in the project)

### Tooling

- npm as the package manager
- Hardhat tasks for deployment workflows

## Project Structure

```
EchoCrypt/
├── contracts/             # Smart contracts
├── deploy/                # Deployment scripts
├── tasks/                 # Hardhat tasks
├── test/                  # Contract tests
├── home/                  # Frontend app (React + Vite)
├── docs/                  # Zama-related documentation
├── artifacts/             # Hardhat artifacts (generated)
├── cache/                 # Hardhat cache (generated)
└── hardhat.config.ts      # Hardhat configuration
```

A `deployments/` folder is generated after deployment. The ABI used by the frontend must come from `deployments/sepolia`.

## Setup and Development

### Prerequisites

- Node.js 20+
- npm
- A funded wallet on Sepolia if you plan to deploy there

### Install dependencies

```bash
npm install
```

### Compile contracts

```bash
npm run compile
```

### Run tests

```bash
npm run test
```

### Local development deployment

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Sepolia deployment

Deployment uses a single private key and an Infura API key defined in `.env`.

```bash
npx hardhat deploy --network sepolia
```

Notes:

- Use `PRIVATE_KEY` only (no mnemonic).
- `INFURA_API_KEY` is used for the Sepolia RPC endpoint.

## Frontend Usage

The frontend is located in `home/` and reads contract state with viem while sending transactions with ethers. It must load ABI data from `deployments/sepolia` after deployment.

Typical user flow:

1. Connect a wallet.
2. Create a group by encrypting a new group key locally.
3. Join a group to gain decryption permission.
4. Encrypt and send messages.
5. Decrypt received messages locally.

## Security and Privacy Model

- The group key is stored on-chain only as an FHE-encrypted handle.
- Decryption rights are controlled by the contract, not by a centralized server.
- Messages are stored as ciphertext with metadata only.
- Plaintext remains strictly off-chain.

## Limitations (Current Scope)

- On-chain ciphertext storage can be expensive at scale.
- Group key rotation is not automated yet.
- No media attachments; only ciphertext strings are stored.
- Moderation features are intentionally minimal to preserve privacy.

## Future Roadmap

- Key rotation and revocation for compromised devices.
- Pagination and batch retrieval for large message histories.
- Off-chain storage for large payloads with on-chain integrity proofs.
- Encrypted role management (admin/moderator policies).
- Encrypted search indexes for messages.
- Multi-device key sync and recovery flows.
- Gas optimizations for high-traffic groups.
- Formal security audit before mainnet.

## License

This project is licensed under the BSD-3-Clause-Clear License. See `LICENSE`.
