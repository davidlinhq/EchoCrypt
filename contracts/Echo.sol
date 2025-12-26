// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Echo
/// @notice Encrypted group chat where the group key is stored on-chain as an FHE ciphertext.
contract Echo is ZamaEthereumConfig {
    struct Group {
        string name;
        address creator;
        uint64 createdAt;
        uint32 memberCount;
        eaddress encryptedKey;
    }

    struct Message {
        address sender;
        uint64 timestamp;
        string ciphertext;
    }

    uint256 public groupCount;

    mapping(uint256 groupId => Group) private _groups;
    mapping(uint256 groupId => mapping(address user => bool)) private _isMember;
    mapping(uint256 groupId => Message[]) private _messages;

    event GroupCreated(uint256 indexed groupId, address indexed creator, string name);
    event GroupJoined(uint256 indexed groupId, address indexed member);
    event MessageSent(uint256 indexed groupId, uint256 indexed messageIndex, address indexed sender);

    error GroupDoesNotExist(uint256 groupId);
    error AlreadyMember(uint256 groupId, address member);
    error NotMember(uint256 groupId, address member);
    error EmptyGroupName();
    error EmptyCiphertext();

    function createGroup(
        string calldata name,
        externalEaddress encryptedKeyExternal,
        bytes calldata inputProof
    ) external returns (uint256 groupId) {
        if (bytes(name).length == 0) revert EmptyGroupName();

        eaddress encryptedKey = FHE.fromExternal(encryptedKeyExternal, inputProof);

        groupId = ++groupCount;

        _groups[groupId] = Group({
            name: name,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            memberCount: 1,
            encryptedKey: encryptedKey
        });

        _isMember[groupId][msg.sender] = true;

        FHE.allowThis(encryptedKey);
        FHE.allow(encryptedKey, msg.sender);

        emit GroupCreated(groupId, msg.sender, name);
        emit GroupJoined(groupId, msg.sender);
    }

    function joinGroup(uint256 groupId) external {
        if (!_exists(groupId)) revert GroupDoesNotExist(groupId);
        if (_isMember[groupId][msg.sender]) revert AlreadyMember(groupId, msg.sender);

        _isMember[groupId][msg.sender] = true;
        _groups[groupId].memberCount += 1;

        FHE.allow(_groups[groupId].encryptedKey, msg.sender);

        emit GroupJoined(groupId, msg.sender);
    }

    function sendMessage(uint256 groupId, string calldata ciphertext) external returns (uint256 messageIndex) {
        if (!_exists(groupId)) revert GroupDoesNotExist(groupId);
        if (!_isMember[groupId][msg.sender]) revert NotMember(groupId, msg.sender);
        if (bytes(ciphertext).length == 0) revert EmptyCiphertext();

        messageIndex = _messages[groupId].length;
        _messages[groupId].push(
            Message({sender: msg.sender, timestamp: uint64(block.timestamp), ciphertext: ciphertext})
        );

        emit MessageSent(groupId, messageIndex, msg.sender);
    }

    function getGroup(uint256 groupId)
        external
        view
        returns (string memory name, address creator, uint64 createdAt, uint32 memberCount)
    {
        if (!_exists(groupId)) revert GroupDoesNotExist(groupId);
        Group storage g = _groups[groupId];
        return (g.name, g.creator, g.createdAt, g.memberCount);
    }

    /// @notice Returns the encrypted group key handle. Decryption is possible only if ACL allows the caller.
    function getGroupEncryptedKey(uint256 groupId) external view returns (eaddress) {
        if (!_exists(groupId)) revert GroupDoesNotExist(groupId);
        return _groups[groupId].encryptedKey;
    }

    function isMember(uint256 groupId, address user) external view returns (bool) {
        if (!_exists(groupId)) revert GroupDoesNotExist(groupId);
        return _isMember[groupId][user];
    }

    function getMessageCount(uint256 groupId) external view returns (uint256) {
        if (!_exists(groupId)) revert GroupDoesNotExist(groupId);
        return _messages[groupId].length;
    }

    function getMessage(uint256 groupId, uint256 messageIndex)
        external
        view
        returns (address sender, uint64 timestamp, string memory ciphertext)
    {
        if (!_exists(groupId)) revert GroupDoesNotExist(groupId);
        Message storage m = _messages[groupId][messageIndex];
        return (m.sender, m.timestamp, m.ciphertext);
    }

    function _exists(uint256 groupId) internal view returns (bool) {
        return groupId != 0 && groupId <= groupCount;
    }
}

