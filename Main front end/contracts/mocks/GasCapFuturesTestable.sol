// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title GasCapFuturesTestable
/// @notice Identical to GasCapFutures but with injectable registry address for local testing.
/// @dev DO NOT deploy to production — use GasCapFutures.sol instead.

interface IFtsoV2Test {
    function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp);
}

interface IFlareContractRegistryTest {
    function getContractAddressByName(string calldata _name) external view returns (address);
}

contract GasCapFuturesTestable {
    address public owner;
    string public marketName;
    string public marketDescription;
    uint256 public strikePrice;
    uint256 public expiryTimestamp;
    bool public isSettled;
    uint256 public settlementPrice;
    uint256 public totalLiquidity;
    uint256 public totalCollateral;
    uint256 public participantCount;

    address private cachedFtsoV2;
    uint256 public lastKnownPrice;
    uint256 public lastKnownTimestamp;

    // TESTABLE: registry is injected, not constant
    IFlareContractRegistryTest public immutable REGISTRY;

    struct Position {
        bool exists;
        bool isLong;
        uint256 quantity;
        uint256 collateral;
        uint256 leverage;
        uint8 marginMode;
        uint8 entryType;
        uint256 entryPrice;
        uint256 openTimestamp;
        bool isActive;
        bool isClaimed;
        uint256 notionalValue;
        uint256 margin;
    }

    struct User {
        bool registered;
        string username;
        string metadataURI;
        uint256 totalTrades;
        uint256 registeredAt;
    }

    mapping(address => Position) public positions;
    mapping(address => uint256) public liquidityProvided;
    mapping(address => User) public users;
    address[] public activeTraders;

    bytes21 constant BTC_USD = bytes21(0x014254432f55534400000000000000000000000000);
    bytes21 constant ETH_USD = bytes21(0x014554482f55534400000000000000000000000000);
    bytes21 constant FLR_USD = bytes21(0x01464c522f55534400000000000000000000000000);

    event FuturesMinted(address indexed trader, bool isLong, uint256 quantity, uint256 collateral, uint256 leverage, uint8 marginMode, uint8 entryType, uint256 entryPrice, uint256 notionalValue, uint256 margin, uint256 timestamp);
    event UserRegistered(address indexed user, string username);
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);
    event ContractSettled(uint256 settlementPrice);
    event PayoutClaimed(address indexed trader, uint256 amount);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier onlyRegistered() { require(users[msg.sender].registered, "Must register first"); _; }

    constructor(
        uint256 _strikePrice,
        uint256 _expiryDuration,
        string memory _name,
        string memory _description,
        address _registry  // TESTABLE: injectable registry
    ) {
        owner = msg.sender;
        strikePrice = _strikePrice;
        expiryTimestamp = block.timestamp + _expiryDuration;
        marketName = _name;
        marketDescription = _description;
        REGISTRY = IFlareContractRegistryTest(_registry);
    }

    function registerUser(string calldata _username, string calldata _metadataURI) external {
        require(!users[msg.sender].registered, "Already registered");
        users[msg.sender] = User(true, _username, _metadataURI, 0, block.timestamp);
        emit UserRegistered(msg.sender, _username);
    }

    function login() external view returns (bool) { return users[msg.sender].registered; }

    function getUserProfile(address _user) external view returns (bool, string memory, string memory, uint256, uint256) {
        User memory u = users[_user];
        return (u.registered, u.username, u.metadataURI, u.totalTrades, u.registeredAt);
    }

    function mintLong(uint256 _quantity, uint256 _leverage, uint8 _marginMode) external payable onlyRegistered {
        require(msg.value > 0, "Must provide collateral");
        require(!positions[msg.sender].exists, "Position exists");
        require(!isSettled, "Contract settled");
        require(block.timestamp < expiryTimestamp, "Market expired");
        require(_leverage >= 1 && _leverage <= 100, "Invalid leverage");

        (uint256 price,) = getCurrentGasPrice();
        uint256 notional = _quantity * price * _leverage;
        uint256 margin = msg.value;

        require(totalLiquidity == 0 || margin * _leverage <= (totalLiquidity * 80) / 100, "Exposure exceeds pool capacity");

        positions[msg.sender] = Position(true, true, _quantity, msg.value, _leverage, _marginMode, 0, price, block.timestamp, true, false, notional, margin);
        users[msg.sender].totalTrades++;
        activeTraders.push(msg.sender);
        participantCount++;
        totalCollateral += msg.value;

        emit FuturesMinted(msg.sender, true, _quantity, msg.value, _leverage, _marginMode, 0, price, notional, margin, block.timestamp);
    }

    function mintShort(uint256 _quantity, uint256 _leverage, uint8 _marginMode) external payable onlyRegistered {
        require(msg.value > 0, "Must provide collateral");
        require(!positions[msg.sender].exists, "Position exists");
        require(!isSettled, "Contract settled");
        require(block.timestamp < expiryTimestamp, "Market expired");
        require(_leverage >= 1 && _leverage <= 100, "Invalid leverage");

        (uint256 price,) = getCurrentGasPrice();
        uint256 notional = _quantity * price * _leverage;
        uint256 margin = msg.value;

        require(totalLiquidity == 0 || margin * _leverage <= (totalLiquidity * 80) / 100, "Exposure exceeds pool capacity");

        positions[msg.sender] = Position(true, false, _quantity, msg.value, _leverage, _marginMode, 0, price, block.timestamp, true, false, notional, margin);
        users[msg.sender].totalTrades++;
        activeTraders.push(msg.sender);
        participantCount++;
        totalCollateral += msg.value;

        emit FuturesMinted(msg.sender, false, _quantity, msg.value, _leverage, _marginMode, 0, price, notional, margin, block.timestamp);
    }

    function addLiquidity() external payable {
        require(msg.value > 0, "Must provide liquidity");
        liquidityProvided[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        emit LiquidityAdded(msg.sender, msg.value);
    }

    function removeLiquidity(uint256 _amount) external {
        require(liquidityProvided[msg.sender] >= _amount, "Insufficient LP balance");
        require(totalLiquidity >= _amount, "Insufficient pool");
        liquidityProvided[msg.sender] -= _amount;
        totalLiquidity -= _amount;
        payable(msg.sender).transfer(_amount);
        emit LiquidityRemoved(msg.sender, _amount);
    }

    function settleContract() external {
        require(block.timestamp >= expiryTimestamp, "Not yet expired");
        require(!isSettled, "Already settled");
        (uint256 price,) = getCurrentGasPrice();
        settlementPrice = price;
        isSettled = true;
        emit ContractSettled(price);
    }

    function calculatePayout(address _trader) public view returns (uint256) {
        Position memory pos = positions[_trader];
        if (!pos.exists || !isSettled) return 0;

        bool wins = false;
        if (pos.isLong && settlementPrice > strikePrice) wins = true;
        if (!pos.isLong && settlementPrice < strikePrice) wins = true;
        if (!wins) return 0;

        uint256 priceDiff;
        if (pos.isLong) { priceDiff = settlementPrice - strikePrice; }
        else { priceDiff = strikePrice - settlementPrice; }

        uint256 profit = (pos.collateral * pos.leverage * priceDiff) / strikePrice;
        uint256 maxProfit = pos.collateral * (pos.leverage - 1);
        if (profit > maxProfit) profit = maxProfit;

        uint256 payout = pos.collateral + profit;
        uint256 balance = address(this).balance;
        if (payout > balance) payout = balance;

        return payout;
    }

    function claimPayout() external {
        require(isSettled, "Not settled");
        require(positions[msg.sender].exists, "No position");
        require(!positions[msg.sender].isClaimed, "Already claimed");

        uint256 payout = calculatePayout(msg.sender);
        positions[msg.sender].isClaimed = true;
        positions[msg.sender].isActive = false;

        if (payout > 0) { payable(msg.sender).transfer(payout); }
        emit PayoutClaimed(msg.sender, payout);
    }

    function getCurrentGasPrice() public returns (uint256 price, uint256 timestamp) {
        address ftsoV2Addr = cachedFtsoV2;
        if (ftsoV2Addr == address(0)) {
            ftsoV2Addr = REGISTRY.getContractAddressByName("FtsoV2");
            cachedFtsoV2 = ftsoV2Addr;
        }
        IFtsoV2Test ftso = IFtsoV2Test(ftsoV2Addr);

        try ftso.getFeedById(BTC_USD) returns (uint256 btc, int8 decBtc, uint64 ts) {
            try ftso.getFeedById(ETH_USD) returns (uint256 eth, int8 decEth, uint64) {
                try ftso.getFeedById(FLR_USD) returns (uint256 flr, int8, uint64) {
                    uint256 b = btc / (10 ** (uint8(decBtc > 0 ? decBtc : -decBtc)));
                    uint256 e = eth / (10 ** (uint8(decEth > 0 ? decEth : -decEth)));
                    uint256 bComp = b % 100;
                    uint256 eComp = e % 100;
                    uint256 fComp = flr % 100;
                    price = (bComp * 50 + eComp * 30 + fComp * 20) / 100;
                    if (price == 0) price = 1;
                    timestamp = uint256(ts);
                    lastKnownPrice = price;
                    lastKnownTimestamp = timestamp;
                } catch { (price, timestamp) = _fallbackPrice(); }
            } catch { (price, timestamp) = _fallbackPrice(); }
        } catch { (price, timestamp) = _fallbackPrice(); }
    }

    function _fallbackPrice() internal view returns (uint256 price, uint256 timestamp) {
        if (lastKnownPrice > 0) { return (lastKnownPrice, lastKnownTimestamp); }
        return (1, block.timestamp);
    }

    function getContractState() external view returns (uint256, uint256, bool, uint256, uint256, uint256) {
        return (strikePrice, expiryTimestamp, isSettled, settlementPrice, totalLiquidity, participantCount);
    }

    function getPosition(address _trader) external view returns (bool, bool, uint256, uint256, uint256, uint8, uint8, uint256, uint256, bool, bool, uint256, uint256) {
        Position memory p = positions[_trader];
        return (p.exists, p.isLong, p.quantity, p.collateral, p.leverage, p.marginMode, p.entryType, p.entryPrice, p.openTimestamp, p.isActive, p.isClaimed, p.notionalValue, p.margin);
    }

    function getMarketInfo() external view returns (string memory, string memory, uint256, uint256, bool, uint256) {
        return (marketName, marketDescription, strikePrice, expiryTimestamp, isSettled, participantCount);
    }

    function getActiveTraders() external view returns (uint256) { return activeTraders.length; }

    function setStrikePrice(uint256 _price) external onlyOwner {
        require(!isSettled, "Already settled");
        require(participantCount == 0, "Cannot change after trades opened");
        strikePrice = _price;
    }

    function setExpiry(uint256 _ts) external onlyOwner {
        require(!isSettled, "Already settled");
        require(participantCount == 0, "Cannot change after trades opened");
        require(_ts > block.timestamp, "Must be in future");
        expiryTimestamp = _ts;
    }

    receive() external payable {}
}
