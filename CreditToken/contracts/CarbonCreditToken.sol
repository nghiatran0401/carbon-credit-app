// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CarbonCreditToken
 * @dev ERC1155 token contract for carbon credits
 * Each token ID represents a different forest's carbon credits
 */
contract CarbonCreditToken is ERC1155, Ownable {
    using Strings for uint256;

    // Token name
    string public name = "Carbon Credit Token";
    
    // Token symbol
    string public symbol = "CCT";

    // Mapping from token ID to forest ID
    mapping(uint256 => uint256) public tokenIdToForestId;
    
    // Mapping from forest ID to token ID
    mapping(uint256 => uint256) public forestIdToTokenId;
    
    // Counter for token IDs
    uint256 private _currentTokenId = 1;
    
    // Base URI for metadata
    string private _baseTokenURI;

    // Events
    event CreditsMinted(uint256 indexed tokenId, uint256 indexed forestId, address indexed recipient, uint256 amount);
    event CreditsRetired(uint256 indexed tokenId, address indexed account, uint256 amount);

    constructor(string memory baseURI) ERC1155(baseURI) {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Mint carbon credits for a specific forest
     * @param forestId The database ID of the forest
     * @param amount The amount of carbon credits to mint
     * @param recipient The address to receive the minted tokens
     */
    function mintCredits(
        uint256 forestId,
        uint256 amount,
        address recipient
    ) external onlyOwner returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient address");

        uint256 tokenId;

        // Check if this forest already has a token ID
        if (forestIdToTokenId[forestId] == 0) {
            // Create new token ID for this forest
            tokenId = _currentTokenId;
            tokenIdToForestId[tokenId] = forestId;
            forestIdToTokenId[forestId] = tokenId;
            _currentTokenId++;
        } else {
            // Use existing token ID
            tokenId = forestIdToTokenId[forestId];
        }

        // Mint tokens to recipient
        _mint(recipient, tokenId, amount, "");

        emit CreditsMinted(tokenId, forestId, recipient, amount);

        return tokenId;
    }

    /**
     * @dev Batch mint carbon credits for multiple forests
     * @param forestIds Array of forest IDs
     * @param amounts Array of amounts to mint
     * @param recipient The address to receive the minted tokens
     */
    function mintBatchCredits(
        uint256[] memory forestIds,
        uint256[] memory amounts,
        address recipient
    ) external onlyOwner {
        require(forestIds.length == amounts.length, "Arrays length mismatch");
        require(recipient != address(0), "Invalid recipient address");

        uint256[] memory tokenIds = new uint256[](forestIds.length);

        for (uint256 i = 0; i < forestIds.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");

            uint256 tokenId;
            if (forestIdToTokenId[forestIds[i]] == 0) {
                tokenId = _currentTokenId;
                tokenIdToForestId[tokenId] = forestIds[i];
                forestIdToTokenId[forestIds[i]] = tokenId;
                _currentTokenId++;
            } else {
                tokenId = forestIdToTokenId[forestIds[i]];
            }

            tokenIds[i] = tokenId;
        }

        _mintBatch(recipient, tokenIds, amounts, "");
    }

    /**
     * @dev Retire (burn) carbon credits
     * @param tokenId The token ID to retire
     * @param amount The amount of credits to retire
     */
    function retireCredits(uint256 tokenId, uint256 amount) external {
        require(balanceOf(msg.sender, tokenId) >= amount, "Insufficient balance");
        
        _burn(msg.sender, tokenId, amount);
        
        emit CreditsRetired(tokenId, msg.sender, amount);
    }

    /**
     * @dev Get the forest ID for a token ID
     * @param tokenId The token ID to query
     * @return The forest ID
     */
    function getForestId(uint256 tokenId) external view returns (uint256) {
        return tokenIdToForestId[tokenId];
    }

    /**
     * @dev Get the token ID for a forest ID
     * @param forestId The forest ID to query
     * @return The token ID (0 if not minted yet)
     */
    function getTokenId(uint256 forestId) external view returns (uint256) {
        return forestIdToTokenId[forestId];
    }

    /**
     * @dev Set the base URI for token metadata
     * @param baseURI The new base URI
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        _setURI(baseURI);
    }

    /**
     * @dev Get the URI for a specific token ID
     * @param tokenId The token ID
     * @return The token URI
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Get the current token ID counter
     * @return The next token ID that will be minted
     */
    function getCurrentTokenId() external view returns (uint256) {
        return _currentTokenId;
    }
}
