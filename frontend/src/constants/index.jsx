//รัน npx hardhat run scripts/deploy.js --network localhost 
export const VAULT_SHARES_ADDRESS = import.meta.env.VITE_VAULT_SHARES_ADDRESS;
export const THB_MOCK_ADDRESS = import.meta.env.VITE_THB_MOCK_ADDRESS;
export const FUND_VAULT_ADDRESS = import.meta.env.VITE_FUND_VAULT_ADDRESS;

export const VAULT_SHARES_ABI = [
  "function nav() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function requestRedeem(uint256 shares) external",
  "function deposit(uint256 amount) external",
  // เพิ่มเติมตามความต้องการ...
];

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];