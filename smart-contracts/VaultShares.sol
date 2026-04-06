// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title VaultShares
 * @notice Primary entry point for user interactions and share management.
 * @dev THE CORE TASK:
 * 1. Implement as an ERC-20 token representing vault shares.
 * 2. Implement deposit: minting shares based on NAV and transferring stablecoins.
 * 3. Implement requestRedeem: burning shares and queuing redemption requests.
 * 4. Implement settleRedemption: T+1 settlement execution (24h lock).
 *
 * 💡 ARCHITECTURAL NOTE:
 * Rely on Event Indexing (RedemptionRequested/RedemptionSettled) for data retrieval.
 *
 * 💡 REQUIREMENT NOTE:
 * You are allowed and encouraged to use standard OpenZeppelin contracts.
 */

interface IFundVault {
    function payoutRedemption(address _to, uint256 _amount) external;
}

contract VaultShares is ERC20, Ownable, Pausable, ReentrancyGuard {
    enum Status {
        Pending,
        Settled
    }
    struct RedemptionRequest {
        uint256 id;
        address wallet;
        uint256 shares;
        uint256 nav;
        uint256 amount;
        uint256 unlockDate;
        Status status;
    }

    // custom errors
    error FundVaultNotSet();

    error Unauthorized();
    error InvalidNAV();
    error InsufficientShares();
    error NotReady();
    error AlreadySettled();
    // error Paused(); ซ้ำกับ openzeppelin

    event NavUpdated(uint256 oldNav, uint256 newNav);
    event RedemptionRequested(
        uint256 indexed requestId,
        address indexed wallet,
        uint256 shares,
        uint256 nav,
        uint256 amount
    );
    event RedemptionSettled(
        uint256 indexed requestId,
        address indexed wallet,
        uint256 amount
    );

    /**
     * 📋 DATA STRUCTURES
     * The following structure is recommended for test compatibility:
     *
     * struct RedemptionRequest {
     *     uint256 id;
     *     address wallet;
     *     uint256 shares;
     *     uint256 nav;           // Snapshot at request time
     *     uint256 amount;        // Fixed payout amount
     *     uint256 unlockDate;
     *     Status status;
     * }
     */

    // TODO: Define state variables
    // REQUIRED: nav, fundVault, stablecoin, nextRequestId, redemptions mapping
    // State Variables
    uint256 private _currentNav = 1e18; // Default 1.0 (18 decimals)
    address public fundVault;
    IERC20 public immutable stablecoin;
    uint256 public nextRequestId = 1;

    mapping(uint256 => RedemptionRequest) public redemptions;

    constructor(
        address _stablecoin
    ) ERC20("Vault Shares", "vTHB") Ownable(msg.sender) {
        // TODO: Initialize contract state
        stablecoin = IERC20(_stablecoin);
    }

    /// @notice Sets the authorized FundVault address.
    /// @dev Only callable by Admin.
    function setFundVault(address _fundVault) external onlyOwner {
        // TODO: Implementation
        if (_fundVault == address(0)) revert("Invalid address");
        if (fundVault != address(0)) revert("Already set");
        fundVault = _fundVault;
    }

    /// @notice Returns the current nav price (18 decimals).
    function nav() external view returns (uint256) {
        // TODO: Implementation
        return _currentNav;
    }

    /// @notice Updates the current nav price.
    /// @dev Only callable by Admin. NAV must be > 0.
    function setNav(uint256 _newNAV) external onlyOwner whenNotPaused {
        // TODO: Implementation
        if (_newNAV == 0) revert InvalidNAV();
        emit NavUpdated(_currentNav, _newNAV);
        _currentNav = _newNAV;
    }

    /// @notice (Admin Only) Settles a pending redemption request and triggers payout.
    /// @dev Must validate request existence, state, and 24h lock.
    function settleRedemption(
        uint256 _requestId
    ) external onlyOwner whenNotPaused nonReentrant {
        // TODO: Implementation
        RedemptionRequest storage req = redemptions[_requestId];

        if (req.id == 0) revert("Invalid ID");
        if (block.timestamp < req.unlockDate) revert NotReady();
        if (req.status == Status.Settled) revert AlreadySettled();

        req.status = Status.Settled;

        // สั่งให้ FundVault โอนเงินให้ User
        IFundVault(fundVault).payoutRedemption(req.wallet, req.amount);

        emit RedemptionSettled(_requestId, req.wallet, req.amount);
    }

    /// @notice Deposits stablecoins and mints vault tokens based on nav price.
    /// @dev User must approve this contract to spend stablecoins first.
    function deposit(uint256 _amount) external whenNotPaused nonReentrant {
        // TODO: Implementation
        if (_amount == 0) revert("Zero amount");
        if (fundVault == address(0)) revert FundVaultNotSet();
        // คำนวณ shares: (เงินที่ฝาก * 1e18) / NAV
        uint256 sharesToMint = (_amount * 1e18) / _currentNav;

        // 1. ดึงเงินจาก User ไปที่ FundVault
        stablecoin.transferFrom(msg.sender, fundVault, _amount);

        // 2. Mint shares ให้ User
        _mint(msg.sender, sharesToMint);
    }

    /// @notice Initiates a redemption request.
    /// @dev Burns shares immediately and snapshots payout value.
    function requestRedeem(
        uint256 _shareAmount
    ) external whenNotPaused nonReentrant {
        // TODO: Implementation
        if (_shareAmount == 0) revert("Zero amount");
        if (balanceOf(msg.sender) < _shareAmount) revert InsufficientShares();
        uint256 payoutAmount = (_shareAmount * _currentNav) / 1e18;

        // 1. Burn shares ทันที
        _burn(msg.sender, _shareAmount);

        // 2. บันทึกคำขอ
        uint256 requestId = nextRequestId++;
        redemptions[requestId] = RedemptionRequest({
            id: requestId,
            wallet: msg.sender,
            shares: _shareAmount,
            nav: _currentNav,
            amount: payoutAmount,
            unlockDate: block.timestamp + 24 hours, // T+1
            status: Status.Pending
        });

        emit RedemptionRequested(
            requestId,
            msg.sender,
            _shareAmount,
            _currentNav,
            payoutAmount
        );
    }

    /// @notice Returns the total amount of vault shares in existence.
    function totalSupply() public view override returns (uint256) {
        // TODO: Implementation
        return super.totalSupply();
    }

    /// @notice Returns the amount of vault shares owned by `account`.
    function balanceOf(address account) public view override returns (uint256) {
        // TODO: Implementation
        return super.balanceOf(account);
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

    function renounceOwnership() public virtual override onlyOwner {
        revert("Renouncing is disabled"); // แก้ข้อ 11
    }
}
