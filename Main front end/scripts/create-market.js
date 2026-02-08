const hre = require("hardhat");

async function main() {
  const FACTORY = process.env.FACTORY_ADDRESS;
  if (!FACTORY) { console.error("Set FACTORY_ADDRESS"); process.exit(1); }

  const [signer] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractAt("GasCapFuturesFactory", FACTORY);

  const strikePrice = parseInt(process.env.STRIKE_PRICE || "50");
  const expirySeconds = parseInt(process.env.EXPIRY_SECONDS || String(48 * 3600));
  const name = process.env.MARKET_NAME || "Gas Futures Market";
  const desc = process.env.MARKET_DESCRIPTION || "Gas price futures on Flare";

  console.log(`Creating market: ${name}`);
  console.log(`  Strike: ${strikePrice} gwei, Expiry: ${expirySeconds}s`);

  const tx = await factory.createMarket(strikePrice, expirySeconds, name, desc);
  const receipt = await tx.wait();

  const count = await factory.marketsCount();
  const lastIdx = Number(count) - 1;
  const [marketAddr, creator, createdAt] = await factory.getMarket(lastIdx);

  console.log(`\nMarket #${lastIdx} created!`);
  console.log(`  Address: ${marketAddr}`);
  console.log(`  Creator: ${creator}`);
  console.log(`  Explorer: https://coston2-explorer.flare.network/address/${marketAddr}`);
  console.log(`\nExport: export CONTRACT_ADDRESS=${marketAddr}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
