## 🚀 Project Setup Guide
This project is a full-stack Web3 application consisting of:

- Smart Contracts (Hardhat)
- Backend API (Node.js / SQLite)
- Frontend (React / Next.js)
---
## 📋 Prerequisites
- Node.js >= 18
- npm or yarn
- Git
- MetaMask (optional for frontend testing)

---

## 📁 Project Structure
```text
project/
├── smart-contracts/
├── backend/
└── frontend/
```
---

## 🛠 Installation & Setup

### ⚙️ 1. Clone Repository
```bash
git clone https://github.com/LiangCalvin/tokenx-swe-test.git
cd tokenx-swe-test
```

### 📦 2. Install Dependencies
```bash
cd smart-contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 🔐 3. Environment Setup
Each module requires its own .env file.
##### 📌 smart-contracts/.env
##### 📌 backend/.env
```json
#Default RPC_URL
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x...
VAULT_SHARES_ADDRESS=0x...
FUND_VAULT_ADDRESS=0x...
```
##### 📌 frontend/.env
```json
VITE_VAULT_SHARES_ADDRESS=0x...
VITE_THB_MOCK_ADDRESS=0x...
VITE_FUND_VAULT_ADDRESS=0x...
```
> See item 5. and 6. to get these value

### 🔧 4. Smart Contracts Setup
```bash
cd smart-contracts
npx hardhat compile
```

### 🚀 5. Run Local Blockchain
Start Hardhat local node:
```bash
cd smart-contracts
npx hardhat node
```
> 📌 After deployment, you will see output similar to:
```bash
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0x...
```
>
Copy **Private Key** values and update your environment variables (.env):


### 📜 6. Deploy Contracts
In a new terminal:
```bash
cd smart-contracts
npx hardhat run scripts/deploy.js --network localhost
```
> 📌 After deployment, you will see output similar to:
```bash
VAULT_SHARES_ADDRESS: 0x...
FUND_VAULT_ADDRESS: 0x...
THB_MOCK_ADDRESS: 0x...
```
>
Copy these values and update your environment variables in both backend and frontend `.env` files.


### 🖥️ 7. Start Backend
```bash
cd backend
npm run dev
```
> SQLite database (vault.db) will be created automatically.

### 🌐 8. Start Frontend
```bash
cd frontend
npm run dev
```
Frontend will be available at (or else please see in your terminal):
```code
http://localhost:5173
```

### 🧪 9. Run Tests
```bash
cd smart-contracts
npx hardhat test
```
> ✅ All tests should pass successfully.

### 🔄 10. End-to-End Flow
1. Mint mock tokens
2. Approve VaultShares contract
3. Deposit funds
4. Request redemption
5. Wait 24 hours (or simulate)
6. Admin settles redemption

---

## ⚠️ Security Notes

- Never commit `.env` files or private keys to the repository.
- The provided private key from Hardhat is for local development only.
- Do not use these keys in production environments.

---

## 💡 Important Notes

- Ensure Hardhat node is running before deploying contracts.
- Contract addresses must be updated in both backend and frontend `.env` files after deployment.
- Restart frontend/backend after updating environment variables.

---

## 🧯 Troubleshooting

- If contracts fail to connect, verify `.env` values are correct.
- If frontend shows undefined values, restart dev server.
- Ensure no other service is using port 8545 or 5173.

---

## 📡 API Testing (Optional)

The backend API runs on:
```
http://localhost:3000
```
You can test the API using tools such as Postman or cURL.

### Example Endpoints

- GET http://localhost:3000/api/redemptions
- POST http://localhost:3000/api/settle
- POST http://localhost:3000/api/nav
- POST http://localhost:3000/api/withdraw

> Ensure the backend server is running before making requests.

---

## 🦊 MetaMask Setup (Optional)

### 1. 🔗 Add Network (Hardhat Local)
To interact with the frontend, connect MetaMask to the local Hardhat network:
```text
Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
```

### 2. 🔑 Import Account
Import the default Hardhat account using the private key shown when running:
```bash
npx hardhat node
```
### 3. 🪙 Add Token (THB_MOCK)
Add custom token in MetaMask:

Token Contract Address: **THB_MOCK_ADDRESS** (from deployment)
> After adding the token, you should see your THB_MOCK balance in MetaMask.

---

## 🧪 Manual Testing via Hardhat Console (Optional)

You can manually test the core protocol flow using Hardhat console.

### 📍 Run Console
```bash
cd smart-contracts
npx hardhat console --network localhost
```
### 📜 Load Script
Copy and run the script from:
```text
test/manual-test.md
```
Ensure contracts are deployed and .env variables are properly configured before running the script.

---