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

## Project Structure
project/
├── smart-contracts/
├── backend/
├── frontend/

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
```bash
RPC_URL=
PRIVATE_KEY=
```

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

### 📜 6. Deploy Contracts
In a new terminal:
```bash
cd smart-contracts
npx hardhat run scripts/deploy.js --network localhost
```
> 📌 After deployment, copy contract addresses and update your .env if required.

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
Frontend will be available at:
```code
http://localhost:3000
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