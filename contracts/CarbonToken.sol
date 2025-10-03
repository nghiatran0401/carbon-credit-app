// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CarbonToken is ERC20, Ownable {
    constructor(uint256 /* initialSupply */) ERC20("Carbon Credit Token", "CCT") Ownable(msg.sender) {
        // TODO: Use initialSupply parameter instead of hardcoded value after testing
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    /**
     * @dev Transfer tokens from owner to buyer after successful payment
     * Only the owner can call this function
     * @param to Address of the token buyer
     * @param amount Amount of tokens to transfer (in wei units)
     */
    function transferToBuyer(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf(owner()) >= amount, "Insufficient balance");
        
        _transfer(owner(), to, amount);
    }

    /**
     * @dev Mint new tokens (only owner can mint)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
