export const VAULT_SHARES_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
export const THB_MOCK_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
export const FUND_VAULT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

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