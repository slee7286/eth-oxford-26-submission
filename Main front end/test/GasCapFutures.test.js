/**
 * ══════════════════════════════════════════════════════════════
 * GasCapFutures — Comprehensive Unit Tests
 * ══════════════════════════════════════════════════════════════
 *
 * CORE LOGIC MAP (for other AIs):
 * ─────────────────────────────────
 * 1. ORACLE: getCurrentGasPrice() computes a "gas index" from FTSO prices.
 *    Formula: (BTC_last2_digits * 50 + ETH_last2_digits * 30 + FLR_raw_mod100 * 20) / 100
 *    Range: 1–99. Falls back to lastKnownPrice if FTSO is down.
 *
 * 2. TRADING: Users register → mintLong/mintShort with collateral + leverage.
 *    Pool check: margin * leverage <= totalLiquidity * 80%.
 *    One position per address. Entry price locked from oracle at mint time.
 *
 * 3. LIQUIDITY: Anyone can addLiquidity() (payable) or removeLiquidity().
 *    LP pool is the counterparty for all trades.
 *
 * 4. SETTLEMENT: After expiryTimestamp, anyone calls settleContract().
 *    Locks settlementPrice from oracle. No more trading.
 *
 * 5. PAYOUTS: calculatePayout() determines if position wins.
 *    Long wins if settlement > strike, short wins if settlement < strike.
 *    profit = collateral * leverage * |priceDiff| / strikePrice
 *    Capped at collateral * (leverage - 1) and contract balance.
 *
 * 6. ADMIN: Owner can setStrikePrice/setExpiry ONLY before any trades.
 *    Locked after participantCount > 0.
 *
 * WHAT'S SLOP (non-core, can be abandoned):
 * ─────────────────────────────────────────
 * - depeg-data.ts / depeg pages — placeholder UI, no real contracts
 * - MarketData chart component — synthetic candle visualization
 * - store.ts tick history — localStorage chart seed data
 * - MarketSelector UI — cosmetic, works but not critical
 * ──────────────────────────────────────────────────────────────
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Feed IDs (must match contract constants)
const BTC_USD = "0x014254432f55534400000000000000000000000000";
const ETH_USD = "0x014554482f55534400000000000000000000000000";
const FLR_USD = "0x01464c522f55534400000000000000000000000000";

describe("GasCapFutures", function () {
  let futures, mockFtso, mockRegistry;
  let owner, trader1, trader2, lp1;

  // Helper: set FTSO prices that produce a known gas index
  // BTC=97342 (last2=42), ETH=2835 (last2=35), FLR raw=150 (mod100=50)
  // Index = (42*50 + 35*30 + 50*20) / 100 = (2100 + 1050 + 1000) / 100 = 41
  async function setOraclePrice(btcUsd, btcDec, ethUsd, ethDec, flrRaw) {
    const ts = Math.floor(Date.now() / 1000);
    await mockFtso.setFeed(BTC_USD, btcUsd, btcDec, ts);
    await mockFtso.setFeed(ETH_USD, ethUsd, ethDec, ts);
    await mockFtso.setFeed(FLR_USD, flrRaw, 0, ts);
  }

  // Default prices: BTC=$97342, ETH=$2835, FLR raw=150
  // Gas index = (42*50 + 35*30 + 50*20)/100 = 41
  async function setDefaultPrices() {
    await setOraclePrice(9734200, 2, 283500, 2, 150);
  }

  beforeEach(async function () {
    [owner, trader1, trader2, lp1] = await ethers.getSigners();

    // Deploy mock FTSO
    const MockFtso = await ethers.getContractFactory("MockFtsoV2");
    mockFtso = await MockFtso.deploy();

    // Deploy mock registry that points to the mock FTSO
    const MockRegistry = await ethers.getContractFactory("MockFlareContractRegistry");
    mockRegistry = await MockRegistry.deploy(await mockFtso.getAddress());

    // Deploy testable futures contract
    // Strike=40, Duration=3600s (1 hour), Name="TEST-GAS", Desc="Test market"
    const Futures = await ethers.getContractFactory("GasCapFuturesTestable");
    futures = await Futures.deploy(40, 3600, "TEST-GAS", "Test market", await mockRegistry.getAddress());

    // Set default oracle prices
    await setDefaultPrices();
  });

  // ══════════════════════════════════════
  // DEPLOYMENT & CONSTRUCTOR
  // ══════════════════════════════════════

  describe("Deployment", function () {
    it("should set owner to deployer", async function () {
      expect(await futures.owner()).to.equal(owner.address);
    });

    it("should set strike price", async function () {
      expect(await futures.strikePrice()).to.equal(40);
    });

    it("should set expiry in the future", async function () {
      const now = await time.latest();
      expect(await futures.expiryTimestamp()).to.be.gt(now);
    });

    it("should set market name and description", async function () {
      expect(await futures.marketName()).to.equal("TEST-GAS");
      expect(await futures.marketDescription()).to.equal("Test market");
    });

    it("should start with zero state", async function () {
      expect(await futures.isSettled()).to.equal(false);
      expect(await futures.totalLiquidity()).to.equal(0);
      expect(await futures.participantCount()).to.equal(0);
    });
  });

  // ══════════════════════════════════════
  // ORACLE (Gas Index Calculation)
  // ══════════════════════════════════════

  describe("Oracle - getCurrentGasPrice", function () {
    it("should compute correct gas index from FTSO prices", async function () {
      // BTC=97342 → b=973 → bComp=73, ETH=2835 → e=28 → eComp=28, FLR=150 → fComp=50
      // Wait: 9734200 with 2 decimals → 9734200/100 = 97342, last2 = 42
      // 283500 with 2 decimals → 283500/100 = 2835, last2 = 35
      // flr raw=150, mod100 = 50
      // Index = (42*50 + 35*30 + 50*20)/100 = (2100+1050+1000)/100 = 41
      const tx = await futures.getCurrentGasPrice();
      // For the testable version, getCurrentGasPrice() is non-view, need to call and check state
      // Actually let's call it via static call to get the return value
      const [price] = await futures.getCurrentGasPrice.staticCall();
      expect(price).to.equal(41n);
    });

    it("should return minimum 1 when all components are zero", async function () {
      // All prices that produce 0 mod 100
      await setOraclePrice(10000, 2, 10000, 2, 100);
      // BTC=10000/100=100, 100%100=0; ETH=10000/100=100, 100%100=0; FLR=100%100=0
      // Index = 0, but contract sets price=1 if zero
      const [price] = await futures.getCurrentGasPrice.staticCall();
      expect(price).to.equal(1n);
    });

    it("should fallback to lastKnownPrice when FTSO reverts", async function () {
      // First, get a good price to cache
      await futures.getCurrentGasPrice(); // caches lastKnownPrice=41
      expect(await futures.lastKnownPrice()).to.equal(41);

      // Now make FTSO revert
      await mockFtso.setShouldRevert(true);

      const [price] = await futures.getCurrentGasPrice.staticCall();
      expect(price).to.equal(41n); // uses cached value
    });

    it("should return 1 when FTSO reverts and no cached price", async function () {
      // Make FTSO revert before any successful call
      await mockFtso.setShouldRevert(true);

      const [price] = await futures.getCurrentGasPrice.staticCall();
      expect(price).to.equal(1n);
    });
  });

  // ══════════════════════════════════════
  // USER REGISTRATION
  // ══════════════════════════════════════

  describe("User Registration", function () {
    it("should register a new user", async function () {
      await futures.connect(trader1).registerUser("alice", "ipfs://meta");
      const profile = await futures.getUserProfile(trader1.address);
      expect(profile[0]).to.equal(true); // registered
      expect(profile[1]).to.equal("alice");
    });

    it("should reject double registration", async function () {
      await futures.connect(trader1).registerUser("alice", "");
      await expect(futures.connect(trader1).registerUser("bob", ""))
        .to.be.revertedWith("Already registered");
    });

    it("should emit UserRegistered event", async function () {
      await expect(futures.connect(trader1).registerUser("alice", ""))
        .to.emit(futures, "UserRegistered")
        .withArgs(trader1.address, "alice");
    });
  });

  // ══════════════════════════════════════
  // LIQUIDITY
  // ══════════════════════════════════════

  describe("Liquidity", function () {
    it("should accept liquidity deposits", async function () {
      await futures.connect(lp1).addLiquidity({ value: ethers.parseEther("10") });
      expect(await futures.totalLiquidity()).to.equal(ethers.parseEther("10"));
      expect(await futures.liquidityProvided(lp1.address)).to.equal(ethers.parseEther("10"));
    });

    it("should reject zero liquidity", async function () {
      await expect(futures.connect(lp1).addLiquidity({ value: 0 }))
        .to.be.revertedWith("Must provide liquidity");
    });

    it("should allow withdrawal", async function () {
      await futures.connect(lp1).addLiquidity({ value: ethers.parseEther("10") });
      await futures.connect(lp1).removeLiquidity(ethers.parseEther("5"));
      expect(await futures.totalLiquidity()).to.equal(ethers.parseEther("5"));
      expect(await futures.liquidityProvided(lp1.address)).to.equal(ethers.parseEther("5"));
    });

    it("should reject withdrawal exceeding balance", async function () {
      await futures.connect(lp1).addLiquidity({ value: ethers.parseEther("5") });
      await expect(futures.connect(lp1).removeLiquidity(ethers.parseEther("10")))
        .to.be.revertedWith("Insufficient LP balance");
    });

    it("should emit LiquidityAdded and LiquidityRemoved events", async function () {
      await expect(futures.connect(lp1).addLiquidity({ value: ethers.parseEther("1") }))
        .to.emit(futures, "LiquidityAdded");
      await expect(futures.connect(lp1).removeLiquidity(ethers.parseEther("1")))
        .to.emit(futures, "LiquidityRemoved");
    });
  });

  // ══════════════════════════════════════
  // TRADING (mintLong / mintShort)
  // ══════════════════════════════════════

  describe("Trading", function () {
    beforeEach(async function () {
      // Register traders
      await futures.connect(trader1).registerUser("trader1", "");
      await futures.connect(trader2).registerUser("trader2", "");
    });

    it("should reject unregistered trader", async function () {
      await expect(futures.connect(lp1).mintLong(100, 1, 0, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Must register first");
    });

    it("should reject zero collateral", async function () {
      await expect(futures.connect(trader1).mintLong(100, 1, 0, { value: 0 }))
        .to.be.revertedWith("Must provide collateral");
    });

    it("should reject invalid leverage", async function () {
      await expect(futures.connect(trader1).mintLong(100, 0, 0, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Invalid leverage");
      await expect(futures.connect(trader1).mintLong(100, 101, 0, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Invalid leverage");
    });

    it("should open a long position", async function () {
      await futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("1") });
      const pos = await futures.getPosition(trader1.address);
      expect(pos[0]).to.equal(true);  // exists
      expect(pos[1]).to.equal(true);  // isLong
      expect(pos[2]).to.equal(100n);  // quantity
      expect(pos[4]).to.equal(2n);    // leverage
      expect(pos[7]).to.equal(41n);   // entryPrice (gas index = 41)
    });

    it("should open a short position", async function () {
      await futures.connect(trader1).mintShort(50, 3, 0, { value: ethers.parseEther("1") });
      const pos = await futures.getPosition(trader1.address);
      expect(pos[0]).to.equal(true);  // exists
      expect(pos[1]).to.equal(false); // isLong = false (short)
    });

    it("should reject duplicate positions", async function () {
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      await expect(futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Position exists");
    });

    it("should increment participantCount and totalCollateral", async function () {
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      expect(await futures.participantCount()).to.equal(1);
      expect(await futures.totalCollateral()).to.equal(ethers.parseEther("1"));

      await futures.connect(trader2).mintShort(100, 1, 0, { value: ethers.parseEther("2") });
      expect(await futures.participantCount()).to.equal(2);
      expect(await futures.totalCollateral()).to.equal(ethers.parseEther("3"));
    });

    it("should enforce 80% pool utilization cap", async function () {
      // Add 10 ETH liquidity
      await futures.connect(lp1).addLiquidity({ value: ethers.parseEther("10") });
      // 80% of 10 = 8. Trying 5 ETH at 2x leverage = 10 exposure > 8 → should fail
      await expect(futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("5") }))
        .to.be.revertedWith("Exposure exceeds pool capacity");
      // 3 ETH at 2x = 6 exposure <= 8 → should succeed
      await futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("3") });
    });

    it("should allow trading with zero pool (no utilization check)", async function () {
      // totalLiquidity == 0 bypasses the pool check
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      expect(await futures.participantCount()).to.equal(1);
    });

    it("should reject trading after expiry", async function () {
      await time.increase(3601); // past 1-hour expiry
      await expect(futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Market expired");
    });

    it("should emit FuturesMinted event", async function () {
      await expect(futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("1") }))
        .to.emit(futures, "FuturesMinted");
    });
  });

  // ══════════════════════════════════════
  // SETTLEMENT
  // ══════════════════════════════════════

  describe("Settlement", function () {
    it("should reject settlement before expiry", async function () {
      await expect(futures.settleContract())
        .to.be.revertedWith("Not yet expired");
    });

    it("should settle after expiry", async function () {
      await time.increase(3601);
      await futures.settleContract();
      expect(await futures.isSettled()).to.equal(true);
      expect(await futures.settlementPrice()).to.equal(41); // from oracle
    });

    it("should reject double settlement", async function () {
      await time.increase(3601);
      await futures.settleContract();
      await expect(futures.settleContract())
        .to.be.revertedWith("Already settled");
    });

    it("should emit ContractSettled event", async function () {
      await time.increase(3601);
      await expect(futures.settleContract())
        .to.emit(futures, "ContractSettled")
        .withArgs(41);
    });
  });

  // ══════════════════════════════════════
  // PAYOUT CALCULATION
  // ══════════════════════════════════════

  describe("Payouts", function () {
    beforeEach(async function () {
      await futures.connect(trader1).registerUser("t1", "");
      await futures.connect(trader2).registerUser("t2", "");
      // Add liquidity so contract has funds for payouts
      await futures.connect(lp1).addLiquidity({ value: ethers.parseEther("100") });
    });

    it("should return 0 payout before settlement", async function () {
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      expect(await futures.calculatePayout(trader1.address)).to.equal(0);
    });

    it("should pay winning longs (settlement > strike)", async function () {
      // Strike=40. Entry price=41 (from oracle at mint time).
      await futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("1") });

      // Change oracle so settlement price=50 (strike=40, priceDiff=10)
      // BTC=9735000/100=97350, 97350%100=50; ETH=285000/100=2850, 2850%100=50; FLR=50%100=50
      // Index = (50*50 + 50*30 + 50*20)/100 = 50
      await setOraclePrice(9735000, 2, 285000, 2, 50);

      await time.increase(3601);
      await futures.settleContract();

      // profit = collateral(1e18) * leverage(2) * priceDiff(10) / strike(40)
      // profit = 1e18 * 2 * 10 / 40 = 0.5e18
      // maxProfit = 1e18 * (2-1) = 1e18. profit(0.5e18) < max, so not capped.
      // payout = collateral + profit = 1e18 + 0.5e18 = 1.5e18
      const payout = await futures.calculatePayout(trader1.address);
      expect(payout).to.equal(ethers.parseEther("1.5"));
    });

    it("should pay winning shorts (settlement < strike)", async function () {
      await futures.connect(trader1).mintShort(100, 2, 0, { value: ethers.parseEther("1") });

      // Settlement price=30 (strike=40, priceDiff=10)
      // BTC=9733000/100=97330, 97330%100=30; ETH=283000/100=2830, 2830%100=30; FLR=30%100=30
      // Index = (30*50 + 30*30 + 30*20)/100 = 30
      await setOraclePrice(9733000, 2, 283000, 2, 30);

      await time.increase(3601);
      await futures.settleContract();

      // profit = 1e18 * 2 * 10 / 40 = 0.5e18
      const payout = await futures.calculatePayout(trader1.address);
      expect(payout).to.equal(ethers.parseEther("1.5"));
    });

    it("should return 0 for losing positions", async function () {
      // Long position, but settlement < strike
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });

      // Settlement price=30 < strike=40 → long loses
      await setOraclePrice(9733000, 2, 283000, 2, 30);
      await time.increase(3601);
      await futures.settleContract();

      expect(await futures.calculatePayout(trader1.address)).to.equal(0);
    });

    it("should cap profit at collateral * (leverage - 1)", async function () {
      // 1 ETH collateral, 2x leverage, max profit = 1 * (2-1) = 1 ETH
      await futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("1") });

      // Settlement price=99, strike=40, priceDiff=59
      // profit = 1e18 * 2 * 59 / 40 = 2.95e18
      // maxProfit = 1e18 * 1 = 1e18 → CAPPED
      // payout = 1e18 + 1e18 = 2e18
      // BTC=9739900/100=97399, 97399%100=99; ETH=289900/100=2899, 2899%100=99; FLR=99%100=99
      await setOraclePrice(9739900, 2, 289900, 2, 99);
      await time.increase(3601);
      await futures.settleContract();

      const payout = await futures.calculatePayout(trader1.address);
      expect(payout).to.equal(ethers.parseEther("2"));
    });

    it("should allow claiming payout", async function () {
      await futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("1") });

      await setOraclePrice(9735000, 2, 285000, 2, 50);
      await time.increase(3601);
      await futures.settleContract();

      const balBefore = await ethers.provider.getBalance(trader1.address);
      const tx = await futures.connect(trader1).claimPayout();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * tx.gasPrice;
      const balAfter = await ethers.provider.getBalance(trader1.address);

      // Net balance change should be payout - gas
      const payout = ethers.parseEther("1.5");
      expect(balAfter - balBefore + gasCost).to.equal(payout);
    });

    it("should reject double claim", async function () {
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });

      await setOraclePrice(5000050, 2, 5000050, 2, 50);
      await time.increase(3601);
      await futures.settleContract();
      await futures.connect(trader1).claimPayout();

      await expect(futures.connect(trader1).claimPayout())
        .to.be.revertedWith("Already claimed");
    });

    it("should reject claim before settlement", async function () {
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      await expect(futures.connect(trader1).claimPayout())
        .to.be.revertedWith("Not settled");
    });

    it("should emit PayoutClaimed event", async function () {
      await futures.connect(trader1).mintLong(100, 2, 0, { value: ethers.parseEther("1") });
      await setOraclePrice(9735000, 2, 285000, 2, 50);
      await time.increase(3601);
      await futures.settleContract();

      await expect(futures.connect(trader1).claimPayout())
        .to.emit(futures, "PayoutClaimed")
        .withArgs(trader1.address, ethers.parseEther("1.5"));
    });
  });

  // ══════════════════════════════════════
  // ADMIN CONTROLS
  // ══════════════════════════════════════

  describe("Admin", function () {
    it("should allow owner to change strike before trades", async function () {
      await futures.setStrikePrice(50);
      expect(await futures.strikePrice()).to.equal(50);
    });

    it("should reject non-owner strike change", async function () {
      await expect(futures.connect(trader1).setStrikePrice(50))
        .to.be.revertedWith("Not owner");
    });

    it("should lock strike after trades opened", async function () {
      await futures.connect(trader1).registerUser("t1", "");
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      await expect(futures.setStrikePrice(50))
        .to.be.revertedWith("Cannot change after trades opened");
    });

    it("should lock expiry after trades opened", async function () {
      await futures.connect(trader1).registerUser("t1", "");
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      const future = (await time.latest()) + 7200;
      await expect(futures.setExpiry(future))
        .to.be.revertedWith("Cannot change after trades opened");
    });

    it("should reject past expiry timestamp", async function () {
      const past = (await time.latest()) - 100;
      await expect(futures.setExpiry(past))
        .to.be.revertedWith("Must be in future");
    });
  });

  // ══════════════════════════════════════
  // VIEW FUNCTIONS
  // ══════════════════════════════════════

  describe("View Functions", function () {
    it("getContractState should return all state fields", async function () {
      const state = await futures.getContractState();
      expect(state[0]).to.equal(40n);  // strikePrice
      expect(state[2]).to.equal(false); // isSettled
      expect(state[4]).to.equal(0n);    // totalLiquidity
      expect(state[5]).to.equal(0n);    // participantCount
    });

    it("getMarketInfo should return name and description", async function () {
      const info = await futures.getMarketInfo();
      expect(info[0]).to.equal("TEST-GAS");
      expect(info[1]).to.equal("Test market");
    });

    it("getActiveTraders should return correct count", async function () {
      expect(await futures.getActiveTraders()).to.equal(0);
      await futures.connect(trader1).registerUser("t1", "");
      await futures.connect(trader1).mintLong(100, 1, 0, { value: ethers.parseEther("1") });
      expect(await futures.getActiveTraders()).to.equal(1);
    });
  });
});
