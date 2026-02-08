// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./GasCapFutures.sol";

contract GasCapFuturesFactory {
    struct MarketRecord {
        address market;
        address creator;
        uint256 createdAt;
    }

    MarketRecord[] public marketRecords;
    mapping(address => uint256[]) public creatorMarkets;

    event MarketCreated(
        address indexed market,
        address indexed creator,
        uint256 index,
        uint256 strikePrice,
        uint256 expiryTimestamp
    );

    function createMarket(
        uint256 _strikePrice,
        uint256 _expiryDuration,
        string memory _marketName,
        string memory _marketDescription
    ) external returns (address marketAddress, uint256 index) {
        GasCapFutures futures = new GasCapFutures(
            _strikePrice,
            _expiryDuration,
            _marketName,
            _marketDescription
        );
        marketAddress = address(futures);
        index = marketRecords.length;

        marketRecords.push(MarketRecord({
            market: marketAddress,
            creator: msg.sender,
            createdAt: block.timestamp
        }));
        creatorMarkets[msg.sender].push(index);

        emit MarketCreated(
            marketAddress,
            msg.sender,
            index,
            _strikePrice,
            block.timestamp + _expiryDuration
        );
    }

    function marketsCount() external view returns (uint256) {
        return marketRecords.length;
    }

    function getMarket(uint256 index) external view returns (
        address market,
        address creator,
        uint256 createdAt
    ) {
        MarketRecord memory r = marketRecords[index];
        return (r.market, r.creator, r.createdAt);
    }

    function getAllMarkets() external view returns (address[] memory) {
        address[] memory addrs = new address[](marketRecords.length);
        for (uint256 i = 0; i < marketRecords.length; i++) {
            addrs[i] = marketRecords[i].market;
        }
        return addrs;
    }

    function getMarketsByCreator(address creator) external view returns (uint256[] memory) {
        return creatorMarkets[creator];
    }
}
