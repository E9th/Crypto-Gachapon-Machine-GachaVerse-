// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * GVCoin — The official ERC-20 token for GachaVerse.
 *
 * This token is minted by the game server when players exchange
 * their in-game GACHA coins for on-chain GVCoin.
 *
 * Deployment:
 *   1. Deploy to Sepolia testnet via Remix (https://remix.ethereum.org)
 *   2. Copy the deployed contract address
 *   3. Set NEXT_PUBLIC_GVCOIN_ADDRESS in your .env
 *   4. Set GVCOIN_MINTER_PRIVATE_KEY for the minter wallet
 *
 * The `minter` role is the server's hot wallet that can mint tokens
 * when players exchange GACHA → GVCoin.
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GVCoin is ERC20, Ownable {
    /// @notice The address allowed to mint tokens (game server wallet)
    address public minter;

    /// @notice Emitted when the minter role is transferred
    event MinterChanged(address indexed previousMinter, address indexed newMinter);

    /// @notice Emitted when tokens are minted for a player
    event TokensMinted(address indexed to, uint256 amount, string reason);

    constructor(address _minter) ERC20("GVCoin", "GVC") Ownable(msg.sender) {
        require(_minter != address(0), "Minter cannot be zero address");
        minter = _minter;
        emit MinterChanged(address(0), _minter);
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter can call this");
        _;
    }

    /// @notice Mint tokens to a player's wallet (called by game server)
    /// @param to The player's wallet address
    /// @param amount The amount of GVCoin to mint (in wei, 18 decimals)
    /// @param reason A short description (e.g. "gacha_exchange")
    function mint(address to, uint256 amount, string calldata reason) external onlyMinter {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /// @notice Transfer minter role to a new address
    /// @param newMinter The new minter address
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "New minter cannot be zero address");
        emit MinterChanged(minter, newMinter);
        minter = newMinter;
    }

    /// @notice Returns the number of decimals (18, standard)
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
