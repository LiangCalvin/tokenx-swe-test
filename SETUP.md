## 🚀 Project Setup Guide
This project is a full-stack Web3 application consisting of:

- Smart Contracts (Hardhat)
- Backend API (Node.js / SQLite)
- Frontend (React / Next.js)

## 📋 Prerequisites
- Node.js >= 18
- npm or yarn
- Git
- MetaMask (optional for frontend testing)

## Project Structure
project/
├── smart-contracts/
├── backend/
├── frontend/


## 🛠 Installation & Setup
ตรงนี้แหละครับที่ต้องใส่แบบ เรียงข้อ เพื่อให้เขาก๊อปปี้ไปรันได้เลย

Step 1: Clone the Repository
git clone [https://github.com/LiangCalvin/tokenx-swe-test]
cd [https://github.com/LiangCalvin/tokenx-swe-test]

Step 2: Install Dependencies
npm install
# ถ้ามีโฟลเดอร์แยก
cd frontend && npm install
cd ../backend && npm install

Step 3: Environment Variables
## Environment Setup

Each module requires its own `.env` file.

### smart-contracts/.env
RPC_URL=
PRIVATE_KEY=

## Smart Contracts Setup

cd smart-contracts

npm install

npx hardhat compile

npx hardhat test

## Deploy Contracts (Local)

npx hardhat node

# in another terminal
npx hardhat run scripts/deploy.js --network localhost

## Backend Setup

cd backend

npm install

npm run dev

## Frontend Setup

cd frontend

npm install

npm run dev

## Running Tests

cd smart-contracts

npx hardhat test

## End-to-End Flow

1. Mint mock tokens
2. Approve VaultShares contract
3. Deposit funds
4. Request redemption
5. Wait 24 hours (or simulate)
6. Admin settles redemption