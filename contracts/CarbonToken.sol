// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CarbonToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Carbon Credit Token", "CCT") {
        // _mint(msg.sender, initialSupply * (10 ** decimals()));
        _mint(msg.sender, 1000000 * 10 ** 18);
    }
}
