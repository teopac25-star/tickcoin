// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Ionut is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1500000000 * 10**18; // 1.5 billion tokens
    uint256 public constant MAX_CIRCULATING = 1000000000 * 10**18; // 1 billion max circulating

    constructor() ERC20("Ionut", "IONUT") {
        // Mint initial supply, but cap circulating
        _mint(msg.sender, MAX_CIRCULATING); // Mint 1B initially, owner can mint more up to total
    }

    // Function to mint additional tokens, but not exceed total supply
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= TOTAL_SUPPLY, "Exceeds total supply");
        _mint(to, amount);
    }

    // Override to enforce max circulating if needed, but for simplicity, rely on mint control
}