/**
 * verify-oracle.js — FTSO Oracle Verification Script
 *
 * Connects to Coston2 and reads live FTSO V2 feeds for BTC/USD, ETH/USD, FLR/USD.
 * Prints the step-by-step gas index calculation so you can verify the exact values
 * the contract would use.
 *
 * Usage:
 *   npx hardhat run scripts/verify-oracle.js --network coston2
 *
 * What it verifies:
 *   1. ContractRegistry resolves FtsoV2 address
 *   2. Individual feed values (BTC, ETH, FLR) with raw + decimal info
 *   3. Step-by-step gas index calculation matching the contract formula
 *   4. Comparison with deployed contract's lastKnownPrice (if available)
 *   5. Frontend FTSO integration sanity check
 */

const { ethers } = require("hardhat");

// Feed IDs — must match GasCapFutures.sol exactly
const BTC_USD = "0x014254432f55534400000000000000000000000000";
const ETH_USD = "0x014554482f55534400000000000000000000000000";
const FLR_USD = "0x01464c522f55534400000000000000000000000000";

// Coston2 ContractRegistry
const REGISTRY_ADDR = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

// Deployed contracts to compare against
const FACTORY_ADDR = "0x04932e0Fa90542f20b10E84ff515FdFCbe465Adb";
const DEFAULT_CONTRACT = "0xCeBEbB73DdFD1E04C31dB5cDc131C0a1FdE04d5d";

const REGISTRY_ABI = [
  "function getContractAddressByName(string _name) external view returns (address)"
];

const FTSO_ABI = [
  "function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp)",
  "function getFeedsById(bytes21[] _feedIds) external view returns (uint256[] _values, int8[] _decimals, uint64 _timestamp)"
];

const CONTRACT_ABI = [
  "function lastKnownPrice() view returns (uint256)",
  "function lastKnownTimestamp() view returns (uint256)",
  "function getCurrentGasPriceView() view returns (uint256 price, uint256 timestamp)",
  "function strikePrice() view returns (uint256)",
  "function getContractState() view returns (uint256, uint256, bool, uint256, uint256, uint256)"
];

const FACTORY_ABI = [
  "function getAllMarkets() view returns (address[])",
  "function marketsCount() view returns (uint256)"
];

async function main() {
  const provider = ethers.provider;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║          FTSO ORACLE VERIFICATION — Coston2 Testnet        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // ── Step 1: Resolve FtsoV2 address from ContractRegistry ──
  console.log("─── Step 1: ContractRegistry Lookup ───");
  const registry = new ethers.Contract(REGISTRY_ADDR, REGISTRY_ABI, provider);
  const ftsoV2Addr = await registry.getContractAddressByName("FtsoV2");
  console.log(`  ContractRegistry: ${REGISTRY_ADDR}`);
  console.log(`  FtsoV2 resolved:  ${ftsoV2Addr}`);
  if (ftsoV2Addr === ethers.ZeroAddress) {
    console.error("  ✗ ERROR: FtsoV2 resolved to zero address!");
    process.exit(1);
  }
  console.log("  ✓ FtsoV2 address is valid\n");

  // ── Step 2: Read individual feeds ──
  console.log("─── Step 2: Individual Feed Reads ───");
  const ftso = new ethers.Contract(ftsoV2Addr, FTSO_ABI, provider);

  let btcRaw, btcDec, btcTs;
  let ethRaw, ethDec, ethTs;
  let flrRaw, flrDec, flrTs;

  try {
    [btcRaw, btcDec, btcTs] = await ftso.getFeedById(BTC_USD);
    console.log(`  BTC/USD feed:`);
    console.log(`    Raw value:  ${btcRaw.toString()}`);
    console.log(`    Decimals:   ${btcDec}`);
    console.log(`    Timestamp:  ${btcTs} (${new Date(Number(btcTs) * 1000).toISOString()})`);
    console.log(`    USD price:  $${Number(btcRaw) / Math.pow(10, Math.abs(Number(btcDec)))}`);
  } catch (err) {
    console.error("  ✗ BTC/USD feed FAILED:", err.message);
    process.exit(1);
  }

  try {
    [ethRaw, ethDec, ethTs] = await ftso.getFeedById(ETH_USD);
    console.log(`  ETH/USD feed:`);
    console.log(`    Raw value:  ${ethRaw.toString()}`);
    console.log(`    Decimals:   ${ethDec}`);
    console.log(`    Timestamp:  ${ethTs} (${new Date(Number(ethTs) * 1000).toISOString()})`);
    console.log(`    USD price:  $${Number(ethRaw) / Math.pow(10, Math.abs(Number(ethDec)))}`);
  } catch (err) {
    console.error("  ✗ ETH/USD feed FAILED:", err.message);
    process.exit(1);
  }

  try {
    [flrRaw, flrDec, flrTs] = await ftso.getFeedById(FLR_USD);
    console.log(`  FLR/USD feed:`);
    console.log(`    Raw value:  ${flrRaw.toString()}`);
    console.log(`    Decimals:   ${flrDec}`);
    console.log(`    Timestamp:  ${flrTs} (${new Date(Number(flrTs) * 1000).toISOString()})`);
    console.log(`    USD price:  $${Number(flrRaw) / Math.pow(10, Math.abs(Number(flrDec)))}`);
  } catch (err) {
    console.error("  ✗ FLR/USD feed FAILED:", err.message);
    process.exit(1);
  }

  console.log("  ✓ All three feeds read successfully\n");

  // ── Step 3: Batch read (matches frontend's getFeedsById) ──
  console.log("─── Step 3: Batch Feed Read (getFeedsById) ───");
  try {
    const feedIds = [BTC_USD, ETH_USD, FLR_USD];
    const [values, decimals, batchTs] = await ftso.getFeedsById(feedIds);
    console.log(`  Batch timestamp: ${batchTs} (${new Date(Number(batchTs) * 1000).toISOString()})`);
    console.log(`  BTC: raw=${values[0]}, dec=${decimals[0]}`);
    console.log(`  ETH: raw=${values[1]}, dec=${decimals[1]}`);
    console.log(`  FLR: raw=${values[2]}, dec=${decimals[2]}`);

    // Verify batch matches individual
    const btcMatch = values[0].toString() === btcRaw.toString();
    const ethMatch = values[1].toString() === ethRaw.toString();
    const flrMatch = values[2].toString() === flrRaw.toString();
    console.log(`  Batch vs Individual: BTC ${btcMatch ? '✓' : '✗'}  ETH ${ethMatch ? '✓' : '✗'}  FLR ${flrMatch ? '✓' : '✗'}`);
  } catch (err) {
    console.warn("  ⚠ Batch read failed (non-critical):", err.message);
  }
  console.log();

  // ── Step 4: Gas Index Calculation (CONTRACT formula) ──
  console.log("─── Step 4: Gas Index — Contract Formula ───");
  console.log("  Formula: price = (bComp*50 + eComp*30 + fComp*20) / 100");
  console.log("  where bComp = (BTC_raw / 10^|dec|) % 100");
  console.log("        eComp = (ETH_raw / 10^|dec|) % 100");
  console.log("        fComp = FLR_raw % 100\n");

  // Solidity integer math (no rounding, pure truncation)
  const btcAbsDec = Math.abs(Number(btcDec));
  const ethAbsDec = Math.abs(Number(ethDec));

  const btcInt = BigInt(btcRaw) / (10n ** BigInt(btcAbsDec));
  const ethInt = BigInt(ethRaw) / (10n ** BigInt(ethAbsDec));
  const flrBig = BigInt(flrRaw);

  const bComp = btcInt % 100n;
  const eComp = ethInt % 100n;
  const fComp = flrBig % 100n;

  let gasIndex = (bComp * 50n + eComp * 30n + fComp * 20n) / 100n;
  if (gasIndex === 0n) gasIndex = 1n;

  console.log(`  BTC integer:  ${btcInt} (${btcRaw} / 10^${btcAbsDec})`);
  console.log(`  ETH integer:  ${ethInt} (${ethRaw} / 10^${ethAbsDec})`);
  console.log(`  FLR raw:      ${flrRaw}`);
  console.log();
  console.log(`  bComp (BTC % 100): ${bComp}`);
  console.log(`  eComp (ETH % 100): ${eComp}`);
  console.log(`  fComp (FLR % 100): ${fComp}`);
  console.log();
  console.log(`  Weighted sum:  ${bComp}*50 + ${eComp}*30 + ${fComp}*20 = ${bComp * 50n + eComp * 30n + fComp * 20n}`);
  console.log(`  Divided by 100: ${gasIndex}`);
  console.log(`  ╔═══════════════════════════════════════╗`);
  console.log(`  ║  CONTRACT GAS INDEX = ${gasIndex.toString().padStart(3)}              ║`);
  console.log(`  ╚═══════════════════════════════════════╝`);
  console.log();

  // ── Step 5: Frontend formula comparison ──
  console.log("─── Step 5: Frontend Formula Comparison ───");
  const btcFloat = Number(btcRaw) / Math.pow(10, btcAbsDec);
  const ethFloat = Number(ethRaw) / Math.pow(10, ethAbsDec);
  const flrFloat = Number(flrRaw) / Math.pow(10, Math.abs(Number(flrDec)));

  const febtcInt = Math.floor(btcFloat);
  const feethInt = Math.floor(ethFloat);
  const feflrScaled = Math.floor(flrFloat * 10000);

  const febComp = febtcInt % 100;
  const feeComp = feethInt % 100;
  const fefComp = feflrScaled % 100;

  const feGasIndex = Math.max(1, Math.floor((febComp * 50 + feeComp * 30 + fefComp * 20) / 100));

  console.log(`  Frontend BTC integer: ${febtcInt} → last 2 digits: ${febComp}`);
  console.log(`  Frontend ETH integer: ${feethInt} → last 2 digits: ${feeComp}`);
  console.log(`  Frontend FLR scaled:  ${feflrScaled} → mod 100: ${fefComp}`);
  console.log(`  Frontend gas index:   ${feGasIndex}`);
  console.log();

  // Compare
  const match = Number(gasIndex) === feGasIndex;
  if (match) {
    console.log(`  ✓ CONTRACT (${gasIndex}) == FRONTEND (${feGasIndex}) — Values match!`);
  } else {
    console.log(`  ⚠ MISMATCH: CONTRACT=${gasIndex} vs FRONTEND=${feGasIndex}`);
    console.log(`    NOTE: Contract uses raw FLR (flr_raw % 100) while frontend scales FLR by *10000.`);
    console.log(`    This is expected — the frontend approximation may differ slightly.`);
  }
  console.log();

  // ── Step 6: Compare with deployed contract ──
  console.log("─── Step 6: Deployed Contract Comparison ───");
  try {
    const contract = new ethers.Contract(DEFAULT_CONTRACT, CONTRACT_ABI, provider);

    let contractPrice, contractTs;
    try {
      [contractPrice, contractTs] = await contract.getCurrentGasPriceView();
      console.log(`  Contract getCurrentGasPriceView():`);
      console.log(`    Price:     ${contractPrice}`);
      console.log(`    Timestamp: ${contractTs}`);
    } catch {
      console.log(`  getCurrentGasPriceView() not available (v3 contract)`);
    }

    try {
      const lkp = await contract.lastKnownPrice();
      const lkt = await contract.lastKnownTimestamp();
      console.log(`  Contract lastKnownPrice:     ${lkp}`);
      console.log(`  Contract lastKnownTimestamp:  ${lkt} (${lkt > 0n ? new Date(Number(lkt) * 1000).toISOString() : 'never set'})`);
    } catch {
      console.log(`  lastKnownPrice/Timestamp not available (v3 contract)`);
    }

    const strike = await contract.strikePrice();
    console.log(`  Strike price:  ${strike}`);

    if (contractPrice !== undefined) {
      const contractMatch = contractPrice.toString() === gasIndex.toString();
      if (contractMatch) {
        console.log(`  ✓ Deployed contract price (${contractPrice}) matches calculated index (${gasIndex})`);
      } else {
        console.log(`  ⚠ Deployed: ${contractPrice} vs Calculated: ${gasIndex} (may differ if cached)`);
      }
    }
  } catch (err) {
    console.warn(`  ⚠ Could not read deployed contract: ${err.message}`);
  }
  console.log();

  // ── Step 7: List all factory markets ──
  console.log("─── Step 7: Factory Markets ───");
  try {
    const factory = new ethers.Contract(FACTORY_ADDR, FACTORY_ABI, provider);
    const count = await factory.marketsCount();
    const markets = await factory.getAllMarkets();
    console.log(`  Factory: ${FACTORY_ADDR}`);
    console.log(`  Markets deployed: ${count}`);
    for (let i = 0; i < markets.length; i++) {
      try {
        const m = new ethers.Contract(markets[i], CONTRACT_ABI, provider);
        const strike = await m.strikePrice();
        console.log(`    [${i}] ${markets[i]} (strike=${strike})`);
      } catch {
        console.log(`    [${i}] ${markets[i]} (could not read)`);
      }
    }
  } catch (err) {
    console.warn(`  ⚠ Factory query failed: ${err.message}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Verification complete. Compare the GAS INDEX above with what");
  console.log("the frontend displays. They should match (or be within ±1).");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
