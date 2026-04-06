// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title FundVault
 * @notice Treasury and custodian for the fund's assets.
 * @dev THE CORE TASK:
 * 1. Securely store and manage stablecoin assets.
 * 2. Implement `withdraw(uint256)`: managed withdrawal for investment deployments.
 * 3. Implement authorization: restrict user payouts to `VaultShares` only.
 *
 * 💡 REQUIREMENT:
 * Standard events (Withdrawal, Payout) must be emitted for off-chain reconciliation.
 * You are allowed and encouraged to use standard OpenZeppelin contracts.
 */

interface IVaultShares {
    function nav() external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

contract FundVault is Ownable, Pausable, ReentrancyGuard {
    error Unauthorized();
    error InsufficientLiquidity();
    // error Paused();

    event Withdrawal(address indexed to, uint256 amount);
    event Payout(address indexed to, uint256 amount);

    // TODO: Define state variables
    // REQUIRED: stablecoin, vaultShares, investedAmount
    // State Variables
    IERC20 public immutable stablecoin;
    address public vaultShares;
    uint256 public investedAmount; // เก็บยอดเงินที่ Admin ถอนไปลงทุนข้างนอก

    constructor(address _stablecoin) Ownable(msg.sender) {
        // TODO: Initialize contract state
        stablecoin = IERC20(_stablecoin);
    }

    /// @notice Sets the authorized VaultShares address.
    /// @dev Only callable by Admin.
    function setVaultShares(address _vaultShares) external onlyOwner {
        // TODO: Implementation
        vaultShares = _vaultShares;
    }

    /// @notice Withdraws stablecoins from the vault for fund deployment.
    /// @dev Access control and pause-state validation required.
    function withdraw(uint256 _amount) external onlyOwner whenNotPaused {
        // TODO: Implementation
        if (_amount == 0) revert("Zero amount");
        uint256 currentBalance = stablecoin.balanceOf(address(this));
        if (currentBalance < _amount) revert InsufficientLiquidity();

        investedAmount += _amount; // เพิ่มยอดเงินที่นำไปลงทุน
        stablecoin.transfer(owner(), _amount);

        emit Withdrawal(owner(), _amount);
    }

    /// @notice Restricted: Transfers stablecoins directly to a user after settlement.
    /// @dev Must be restricted to the authorized VaultShares contract.
    function payoutRedemption(
        address _to,
        uint256 _amount
    ) external whenNotPaused nonReentrant {
        // TODO: Implementation
        if (msg.sender != vaultShares) revert Unauthorized();

        uint256 currentBalance = stablecoin.balanceOf(address(this));
        if (currentBalance < _amount) revert InsufficientLiquidity();

        stablecoin.transfer(_to, _amount);

        emit Payout(_to, _amount);
    }

    /// @notice (Admin Only) Pauses all contract interactions.
    function pause() external onlyOwner {
        // TODO: Implementation
        _pause();
    }

    /// @notice (Admin Only) Unpauses the contract.
    function unpause() external onlyOwner {
        // TODO: Implementation
        _unpause();
    }

    /// @notice Returns the total amount of stablecoins held in this contract.
    function balance() public view returns (uint256) {
        // TODO: Implementation
        return stablecoin.balanceOf(address(this));
    }

    /// @notice Returns the Assets Under Management (AUM).
    /// @dev Calculation must account for both actual balance and deployed investments.
    function aum() public view returns (uint256) {
        // TODO: Implementation
        // return balance() + investedAmount;
        // ถ้ามี VaultShares ให้คำนวณจาก Shares * NAV เพื่อความแม่นยำตามมูลค่าตลาด
        if (vaultShares != address(0)) {
            IVaultShares vs = IVaultShares(vaultShares);
            uint256 totalShares = vs.totalSupply();
            if (totalShares > 0) {
                return (totalShares * vs.nav()) / 1e18;
            }
        }
        // ถ้ายังไม่มี shares ให้คืนค่า balance จริง (รองรับเคส AUM Divergence ใน test)
        return balance() + investedAmount;
    }

    /// @notice Admin returns stablecoins from investment to the vault.
    function reinvest(uint256 _amount) external onlyOwner {
        if (_amount == 0) revert("Zero amount");
        if (investedAmount < _amount) revert("Amount exceeds invested");

        investedAmount -= _amount; // ลดหนี้/เงินลงทุนลง
        stablecoin.transferFrom(msg.sender, address(this), _amount);
    }
}
