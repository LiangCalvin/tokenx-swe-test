const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying contracts with the account:", deployer.address);

  // 1. Deploy THBMock (เหรียญสมมติ)
  const THBMock = await hre.ethers.getContractFactory("THBMock");
  const thbMock = await THBMock.deploy();
  await thbMock.waitForDeployment();
  const thbAddress = await thbMock.getAddress();
  console.log("✅ THBMock deployed to:", thbAddress);

  // 2. Deploy FundVault (ตู้เซฟ)
  const FundVault = await hre.ethers.getContractFactory("FundVault");
  const fundVault = await FundVault.deploy(thbAddress);
  await fundVault.waitForDeployment();
  const fundVaultAddress = await fundVault.getAddress();
  console.log("✅ FundVault deployed to:", fundVaultAddress);

  // 3. Deploy VaultShares (สมอง/หุ้น)
  const VaultShares = await hre.ethers.getContractFactory("VaultShares");
  const vaultShares = await VaultShares.deploy(thbAddress);
  await vaultShares.waitForDeployment();
  const vaultSharesAddress = await vaultShares.getAddress();
  console.log("✅ VaultShares deployed to:", vaultSharesAddress);

  // 4. IMPORTANT: เชื่อมความสัมพันธ์ (Wiring)
  // ให้ FundVault รู้จัก VaultShares เพื่อให้จ่ายเงินได้
  await fundVault.setVaultShares(vaultSharesAddress);
  // ให้ VaultShares รู้จัก FundVault เพื่อให้ฝากเงินไปเก็บถูกที่
  await vaultShares.setFundVault(fundVaultAddress);

  console.log("\n--- Deployment Summary ---");
  console.log("PRIVATE_KEY of Account #0:", "จากหน้าจอ npx hardhat node");
  console.log("VAULT_SHARES_ADDRESS:", vaultSharesAddress);
  console.log("FUND_VAULT_ADDRESS:", fundVaultAddress);
  console.log("THB_MOCK_ADDRESS:", thbAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });