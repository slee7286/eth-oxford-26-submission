// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @dev Mock FTSO V2 for local Hardhat testing.
/// Owner can set prices for any feed ID.
contract MockFtsoV2 {
    struct FeedData {
        uint256 value;
        int8 decimals;
        uint64 timestamp;
    }

    mapping(bytes21 => FeedData) public feeds;
    bool public shouldRevert;

    function setFeed(bytes21 _feedId, uint256 _value, int8 _decimals, uint64 _timestamp) external {
        feeds[_feedId] = FeedData(_value, _decimals, _timestamp);
    }

    function setShouldRevert(bool _revert) external {
        shouldRevert = _revert;
    }

    function getFeedById(bytes21 _feedId) external view returns (uint256, int8, uint64) {
        require(!shouldRevert, "MockFtsoV2: forced revert");
        FeedData memory f = feeds[_feedId];
        return (f.value, f.decimals, f.timestamp);
    }
}

/// @dev Mock Flare Contract Registry for local Hardhat testing.
/// Returns the MockFtsoV2 address when asked for "FtsoV2".
contract MockFlareContractRegistry {
    address public ftsoV2;

    constructor(address _ftsoV2) {
        ftsoV2 = _ftsoV2;
    }

    function getContractAddressByName(string calldata _name) external view returns (address) {
        if (keccak256(abi.encodePacked(_name)) == keccak256(abi.encodePacked("FtsoV2"))) {
            return ftsoV2;
        }
        return address(0);
    }
}
