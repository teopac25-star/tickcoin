// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TickCoin is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 10000000000 * 10**18; // 10 billion tokens
    uint256 public constant MAX_CIRCULATING = 10000000000 * 10**18; // 10 billion max circulating

    constructor() ERC20("TickCoin", "TICK") {
        // Mint initial supply
        _mint(msg.sender, MAX_CIRCULATING); // Mint 10B initially
    }

    // Function to mint additional tokens, but not exceed total supply
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= TOTAL_SUPPLY, "Exceeds total supply");
        _mint(to, amount);
    }

    // Override to enforce max circulating if needed, but for simplicity, rely on mint control
}