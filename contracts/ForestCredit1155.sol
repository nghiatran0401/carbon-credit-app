// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title ForestCredit1155
 * @notice ERC-1155 multi-token contract where each forest project maps to a token ID.
 *         This avoids deploying one ERC-20 per forest and significantly reduces gas and
 *         operational overhead.
 */
contract ForestCredit1155 is ERC1155, ERC1155Supply, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant URI_MANAGER_ROLE = keccak256("URI_MANAGER_ROLE");

    string public name;
    string public symbol;

    // Optional per-token URI override. If not set, falls back to base ERC1155 URI.
    mapping(uint256 => string) private _tokenUris;

    event ForestUriSet(uint256 indexed forestId, string tokenUri);
    event ForestCreditsMinted(address indexed to, uint256 indexed forestId, uint256 amount);
    event ForestCreditsRetired(address indexed from, uint256 indexed forestId, uint256 amount);

    constructor(string memory tokenName, string memory tokenSymbol, string memory baseUri) ERC1155(baseUri) {
        name = tokenName;
        symbol = tokenSymbol;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(URI_MANAGER_ROLE, msg.sender);
    }

    function setBaseUri(string calldata newBaseUri) external onlyRole(URI_MANAGER_ROLE) {
        _setURI(newBaseUri);
    }

    function setForestUri(uint256 forestId, string calldata tokenUri) external onlyRole(URI_MANAGER_ROLE) {
        _tokenUris[forestId] = tokenUri;
        emit ForestUriSet(forestId, tokenUri);
    }

    function uri(uint256 forestId) public view override returns (string memory) {
        string memory custom = _tokenUris[forestId];
        if (bytes(custom).length > 0) {
            return custom;
        }

        return super.uri(forestId);
    }

    function mintForestCredits(address to, uint256 forestId, uint256 amount, bytes calldata data)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(to, forestId, amount, data);
        emit ForestCreditsMinted(to, forestId, amount);
    }

    function mintBatchForestCredits(address to, uint256[] calldata forestIds, uint256[] calldata amounts, bytes calldata data)
        external
        onlyRole(MINTER_ROLE)
    {
        _mintBatch(to, forestIds, amounts, data);
    }

    /**
     * @notice Permissionless burn function (requested flow): any caller can retire credits
     *         from any address by supplying `from`.
     */
    function retireForestCredits(address from, uint256 forestId, uint256 amount) external {
        _burn(from, forestId, amount);
        emit ForestCreditsRetired(from, forestId, amount);
    }

    /**
     * @notice Public burn function so any holder can retire their own credits.
     * @dev Caller can burn only tokens owned by caller (msg.sender).
     */
    function retireMyForestCredits(uint256 forestId, uint256 amount) external {
        _burn(msg.sender, forestId, amount);
        emit ForestCreditsRetired(msg.sender, forestId, amount);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }
}