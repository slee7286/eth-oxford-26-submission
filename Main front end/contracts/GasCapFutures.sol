// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IFtsoV2 {
    function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp);
}

interface IFlareContractRegistry {
    function getContractAddressByName(string calldata _name) external view returns (address);
}

contract GasCapFutures {
    address public owner;
    string public marketName;
    string public marketDescription;
    uint256 public strikePrice;
    uint256 public expiryTimestamp;
    bool public isSettled;
    uint256 public settlementPrice;
    uint256 public totalLiquidity;   // LP pool only (counterparty funds)
    uint256 public totalCollateral;  // Trader collateral only
    uint256 public participantCount;

    // Cached FTSO address (saves gas on repeated calls)
    address private cachedFtsoV2;
    // Last known good oracle price (fallback when FTSO is down)
    uint256 public lastKnownPrice;
    uint256 public lastKnownTimestamp;

    struct Position {
        bool exists;           // 0
        bool isLong;           // 1
        uint256 quantity;      // 2
        uint256 collateral;    // 3
        uint256 leverage;      // 4
        uint8 marginMode;      // 5  (0=ISOLATED, 1=CROSS)
        uint8 entryType;       // 6  (0=MARKET, 1=LIMIT, 2=STOP)
        uint256 entryPrice;    // 7
        uint256 openTimestamp; // 8
        bool isActive;         // 9
        bool isClaimed;        // 10
        uint256 notionalValue; // 11
        uint256 margin;        // 12
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

    IFlareContractRegistry constant REGISTRY = IFlareContractRegistry(0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019);
    bytes21 constant BTC_USD = bytes21(0x014254432f55534400000000000000000000000000);
    bytes21 constant ETH_USD = bytes21(0x014554482f55534400000000000000000000000000);
    bytes21 constant FLR_USD = bytes21(0x01464c522f55534400000000000000000000000000);

    event FuturesMinted(
        address indexed trader,
        bool isLong,
        uint256 quantity,
        uint256 collateral,
        uint256 leverage,
        uint8 marginMode,
        uint8 entryType,
        uint256 entryPrice,
        uint256 notionalValue,
        uint256 margin,
        uint256 timestamp
    );
    event UserRegistered(address indexed user, string username);
    event UserLoggedIn(address indexed user, uint256 timestamp);
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);
    event ContractSettled(uint256 settlementPrice);
    event PayoutClaimed(address indexed trader, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRegistered() {
        require(users[msg.sender].registered, "Must register first");
        _;
    }

    constructor(
        uint256 _strikePrice,
        uint256 _expiryDuration,
        string memory _name,
        string memory _description
    ) {
        owner = msg.sender;
        strikePrice = _strikePrice;
        expiryTimestamp = block.timestamp + _expiryDuration;
        marketName = _name;
        marketDescription = _description;
    }

    // ── User Management ──

    function registerUser(string calldata _username, string calldata _metadataURI) external {
        require(!users[msg.sender].registered, "Already registered");
        users[msg.sender] = User(true, _username, _metadataURI, 0, block.timestamp);
        emit UserRegistered(msg.sender, _username);
    }

    function login() external view returns (bool) {
        return users[msg.sender].registered;
    }

    function getUserProfile(address _user) external view returns (
        bool registered,
        string memory username,
        string memory metadataURI,
        uint256 totalTrades,
        uint256 registeredAt
    ) {
        User memory u = users[_user];
        return (u.registered, u.username, u.metadataURI, u.totalTrades, u.registeredAt);
    }

    // ── Trading Functions ──

    function mintLong(uint256 _quantity, uint256 _leverage, uint8 _marginMode) external payable onlyRegistered {
        require(msg.value > 0, "Must provide collateral");
        require(!positions[msg.sender].exists, "Position exists");
        require(!isSettled, "Contract settled");
        require(block.timestamp < expiryTimestamp, "Market expired");
        require(_leverage >= 1 && _leverage <= 100, "Invalid leverage");

        (uint256 price,) = getCurrentGasPrice();
        uint256 notional = _quantity * price * _leverage;
        uint256 margin = msg.value;

        // Check exposure against LP pool (max 80% utilization)
        require(
            totalLiquidity == 0 || margin * _leverage <= (totalLiquidity * 80) / 100,
            "Exposure exceeds pool capacity"
        );

        positions[msg.sender] = Position({
            exists: true,
            isLong: true,
            quantity: _quantity,
            collateral: msg.value,
            leverage: _leverage,
            marginMode: _marginMode,
            entryType: 0,
            entryPrice: price,
            openTimestamp: block.timestamp,
            isActive: true,
            isClaimed: false,
            notionalValue: notional,
            margin: margin
        });

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

        // Check exposure against LP pool (max 80% utilization)
        require(
            totalLiquidity == 0 || margin * _leverage <= (totalLiquidity * 80) / 100,
            "Exposure exceeds pool capacity"
        );

        positions[msg.sender] = Position({
            exists: true,
            isLong: false,
            quantity: _quantity,
            collateral: msg.value,
            leverage: _leverage,
            marginMode: _marginMode,
            entryType: 0,
            entryPrice: price,
            openTimestamp: block.timestamp,
            isActive: true,
            isClaimed: false,
            notionalValue: notional,
            margin: margin
        });

        users[msg.sender].totalTrades++;
        activeTraders.push(msg.sender);
        participantCount++;
        totalCollateral += msg.value;

        emit FuturesMinted(msg.sender, false, _quantity, msg.value, _leverage, _marginMode, 0, price, notional, margin, block.timestamp);
    }

    // ── Liquidity Functions ──

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

    // ── Settlement ──

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

        // Winning payout: collateral + profit scaled by leverage
        // profit = collateral * leverage * |price_change| / strikePrice
        uint256 priceDiff;
        if (pos.isLong) {
            priceDiff = settlementPrice - strikePrice;
        } else {
            priceDiff = strikePrice - settlementPrice;
        }

        uint256 profit = (pos.collateral * pos.leverage * priceDiff) / strikePrice;

        // Cap profit at collateral * (leverage - 1)
        uint256 maxProfit = pos.collateral * (pos.leverage - 1);
        if (profit > maxProfit) profit = maxProfit;

        uint256 payout = pos.collateral + profit;

        // Cap at available contract balance
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

        if (payout > 0) {
            payable(msg.sender).transfer(payout);
        }
        emit PayoutClaimed(msg.sender, payout);
    }

    // ── Oracle ──

    function getCurrentGasPrice() public returns (uint256 price, uint256 timestamp) {
        // Cache FTSO address to save gas on repeated calls
        address ftsoV2Addr = cachedFtsoV2;
        if (ftsoV2Addr == address(0)) {
            ftsoV2Addr = REGISTRY.getContractAddressByName("FtsoV2");
            cachedFtsoV2 = ftsoV2Addr;
        }
        IFtsoV2 ftso = IFtsoV2(ftsoV2Addr);

        try ftso.getFeedById(BTC_USD) returns (uint256 btc, int8 decBtc, uint64 ts) {
            try ftso.getFeedById(ETH_USD) returns (uint256 eth, int8 decEth, uint64) {
                try ftso.getFeedById(FLR_USD) returns (uint256 flr, int8, uint64) {
                    // Normalize BTC and ETH to integer USD prices
                    uint256 b = btc / (10 ** (uint8(decBtc > 0 ? decBtc : -decBtc)));
                    uint256 e = eth / (10 ** (uint8(decEth > 0 ? decEth : -decEth)));

                    // Gas index from real FTSO price movements
                    uint256 bComp = b % 100;   // BTC last 2 digits: 0-99
                    uint256 eComp = e % 100;   // ETH last 2 digits: 0-99
                    uint256 fComp = flr % 100; // FLR lower digits: 0-99

                    // Weighted gas index: BTC 50% + ETH 30% + FLR 20%
                    price = (bComp * 50 + eComp * 30 + fComp * 20) / 100;
                    if (price == 0) price = 1;
                    timestamp = uint256(ts);

                    // Cache for fallback
                    lastKnownPrice = price;
                    lastKnownTimestamp = timestamp;
                } catch { (price, timestamp) = _fallbackPrice(); }
            } catch { (price, timestamp) = _fallbackPrice(); }
        } catch { (price, timestamp) = _fallbackPrice(); }
    }

    // Read-only version for view contexts (uses cached price if FTSO fails)
    function getCurrentGasPriceView() public view returns (uint256 price, uint256 timestamp) {
        address ftsoV2Addr = cachedFtsoV2;
        if (ftsoV2Addr == address(0)) {
            ftsoV2Addr = REGISTRY.getContractAddressByName("FtsoV2");
        }
        IFtsoV2 ftso = IFtsoV2(ftsoV2Addr);

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
                } catch { return (lastKnownPrice > 0 ? lastKnownPrice : 1, lastKnownTimestamp > 0 ? lastKnownTimestamp : block.timestamp); }
            } catch { return (lastKnownPrice > 0 ? lastKnownPrice : 1, lastKnownTimestamp > 0 ? lastKnownTimestamp : block.timestamp); }
        } catch { return (lastKnownPrice > 0 ? lastKnownPrice : 1, lastKnownTimestamp > 0 ? lastKnownTimestamp : block.timestamp); }
    }

    // Fallback: use last known oracle price instead of predictable block.number
    function _fallbackPrice() internal view returns (uint256 price, uint256 timestamp) {
        if (lastKnownPrice > 0) {
            return (lastKnownPrice, lastKnownTimestamp);
        }
        // First-ever call and FTSO is down — return safe default
        return (1, block.timestamp);
    }

    // ── View Functions ──

    function getContractState() external view returns (
        uint256, uint256, bool, uint256, uint256, uint256
    ) {
        return (strikePrice, expiryTimestamp, isSettled, settlementPrice, totalLiquidity, participantCount);
    }

    function getPosition(address _trader) external view returns (
        bool exists,
        bool isLong,
        uint256 quantity,
        uint256 collateral,
        uint256 leverage,
        uint8 marginMode,
        uint8 entryType,
        uint256 entryPrice,
        uint256 openTimestamp,
        bool isActive,
        bool isClaimed,
        uint256 notionalValue,
        uint256 margin
    ) {
        Position memory p = positions[_trader];
        return (p.exists, p.isLong, p.quantity, p.collateral, p.leverage, p.marginMode, p.entryType, p.entryPrice, p.openTimestamp, p.isActive, p.isClaimed, p.notionalValue, p.margin);
    }

    function getMarketInfo() external view returns (
        string memory name,
        string memory description,
        uint256 strike,
        uint256 expiry,
        bool settled,
        uint256 participants
    ) {
        return (marketName, marketDescription, strikePrice, expiryTimestamp, isSettled, participantCount);
    }

    function getActiveTraders() external view returns (uint256) {
        return activeTraders.length;
    }

    // ── Admin ──
    // Strike and expiry are locked once any trader has opened a position.
    // This prevents owner manipulation after users commit funds.

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
