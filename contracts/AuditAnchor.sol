// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuditAnchor
 * @notice Stores Merkle roots of carbon credit audit batches on-chain.
 *         Each anchor proves that a set of ImmuDB audit hashes existed
 *         at a specific point in time. Anyone can verify inclusion of
 *         an individual order by providing a Merkle proof against the
 *         published root.
 */
contract AuditAnchor {
    event Anchored(
        bytes32 indexed merkleRoot,
        uint256 timestamp,
        uint256 auditCount,
        uint256 indexed anchorIndex
    );

    struct Anchor {
        bytes32 merkleRoot;
        uint256 timestamp;
        uint256 auditCount;
    }

    Anchor[] public anchors;
    address public immutable owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "AuditAnchor: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchor(bytes32 merkleRoot, uint256 auditCount) external onlyOwner {
        uint256 idx = anchors.length;
        anchors.push(Anchor(merkleRoot, block.timestamp, auditCount));
        emit Anchored(merkleRoot, block.timestamp, auditCount, idx);
    }

    function getAnchorCount() external view returns (uint256) {
        return anchors.length;
    }

    function getAnchor(uint256 index) external view returns (bytes32, uint256, uint256) {
        require(index < anchors.length, "AuditAnchor: index out of bounds");
        Anchor memory a = anchors[index];
        return (a.merkleRoot, a.timestamp, a.auditCount);
    }

    function getLatestAnchor() external view returns (bytes32, uint256, uint256) {
        require(anchors.length > 0, "AuditAnchor: no anchors yet");
        Anchor memory a = anchors[anchors.length - 1];
        return (a.merkleRoot, a.timestamp, a.auditCount);
    }
}
