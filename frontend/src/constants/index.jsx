export const VAULT_SHARES_ADDRESS = "0x4A679253410272dd5232B3Ff7cF5dbB88f295319";
export const THB_MOCK_ADDRESS = "0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44"; 
export const FUND_VAULT_ADDRESS = "0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f";

export const VAULT_SHARES_ABI = [
  "function getNav() view returns (uint256)",
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