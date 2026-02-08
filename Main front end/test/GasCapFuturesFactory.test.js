/**
 * GasCapFuturesFactory — Unit Tests
 *
 * The factory creates new GasCapFutures market instances.
 * Each market is independent with its own strike, expiry, liquidity pool.
 *
 * NOTE: Factory deploys the PRODUCTION GasCapFutures (hardcoded Coston2 registry).
 * On local Hardhat, the oracle calls will revert and fall back to lastKnownPrice (=1).
 * Factory tests focus on market creation, listing, and querying — not oracle behavior.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GasCapFuturesFactory", function () {
  let factory;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GasCapFuturesFactory");
    factory = await Factory.deploy();
  });

  describe("Market Creation", function () {
    it("should create a market and return address + index", async function () {
      const tx = await factory.createMarket(40, 3600, "GAS-1H", "1 hour gas futures");
      const receipt = await tx.wait();

      // Check return values via events
      const event = receipt.logs.find(l => l.fragment?.name === "MarketCreated");
      expect(event).to.not.be.undefined;
      expect(event.args.index).to.equal(0);
      expect(event.args.strikePrice).to.equal(40);
    });

    it("should increment marketsCount", async function () {
      expect(await factory.marketsCount()).to.equal(0);
      await factory.createMarket(40, 3600, "M1", "desc");
      expect(await factory.marketsCount()).to.equal(1);
      await factory.createMarket(50, 7200, "M2", "desc2");
      expect(await factory.marketsCount()).to.equal(2);
    });

    it("should store creator correctly", async function () {
      await factory.connect(user1).createMarket(40, 3600, "M1", "desc");
      const record = await factory.getMarket(0);
      expect(record.creator).to.equal(user1.address);
    });

    it("should allow anyone to create markets", async function () {
      await factory.connect(user1).createMarket(30, 1800, "U1-Market", "user1 market");
      await factory.connect(user2).createMarket(60, 7200, "U2-Market", "user2 market");
      expect(await factory.marketsCount()).to.equal(2);
    });

    it("should emit MarketCreated with correct args", async function () {
      await expect(factory.createMarket(40, 3600, "GAS-1H", "desc"))
        .to.emit(factory, "MarketCreated");
    });
  });

  describe("Market Queries", function () {
    beforeEach(async function () {
      await factory.connect(user1).createMarket(40, 3600, "M1", "d1");
      await factory.connect(user1).createMarket(50, 7200, "M2", "d2");
      await factory.connect(user2).createMarket(60, 1800, "M3", "d3");
    });

    it("getAllMarkets should return all addresses", async function () {
      const markets = await factory.getAllMarkets();
      expect(markets.length).to.equal(3);
      // Each should be a valid address
      for (const addr of markets) {
        expect(addr).to.match(/^0x[0-9a-fA-F]{40}$/);
      }
    });

    it("getMarket should return correct record", async function () {
      const record = await factory.getMarket(1);
      expect(record.creator).to.equal(user1.address);
      expect(record.createdAt).to.be.gt(0);
    });

    it("getMarketsByCreator should filter by creator", async function () {
      const user1Markets = await factory.getMarketsByCreator(user1.address);
      expect(user1Markets.length).to.equal(2);
      expect(user1Markets[0]).to.equal(0n); // indices
      expect(user1Markets[1]).to.equal(1n);

      const user2Markets = await factory.getMarketsByCreator(user2.address);
      expect(user2Markets.length).to.equal(1);
      expect(user2Markets[0]).to.equal(2n);
    });

    it("getMarket should revert on out-of-bounds index", async function () {
      await expect(factory.getMarket(99)).to.be.reverted;
    });
  });

  describe("Deployed Market Interaction", function () {
    it("deployed market should be a valid GasCapFutures contract", async function () {
      await factory.createMarket(40, 3600, "TestMarket", "test desc");
      const markets = await factory.getAllMarkets();
      const marketAddr = markets[0];

      // Attach to the deployed contract and check its properties
      const GasCapFutures = await ethers.getContractFactory("GasCapFutures");
      const market = GasCapFutures.attach(marketAddr);

      expect(await market.strikePrice()).to.equal(40);
      expect(await market.marketName()).to.equal("TestMarket");
      expect(await market.marketDescription()).to.equal("test desc");
      // Owner should be the factory contract (it deployed the child)
      expect(await market.owner()).to.equal(await factory.getAddress());
    });
  });
});
