const hre = require("hardhat");

async function main() {
  const FACTORY = process.env.FACTORY_ADDRESS;
  if (!FACTORY) { console.error("Set FACTORY_ADDRESS"); process.exit(1); }

  const factory = await hre.ethers.getContractAt("GasCapFuturesFactory", FACTORY);
  const count = await factory.marketsCount();
  console.log(`Total markets: ${count}\n`);

  for (let i = 0; i < Number(count); i++) {
    const [market, creator, createdAt] = await factory.getMarket(i);
    const c = await hre.ethers.getContractAt("GasCapFutures", market);
    const info = await c.getMarketInfo();
    console.log(`#${i} ${market}`);
    console.log(`   Name: ${info[0]}`);
    console.log(`   Strike: ${info[2]} gwei`);
    console.log(`   Creator: ${creator.slice(0,10)}...`);
    console.log(`   Created: ${new Date(Number(createdAt) * 1000).toISOString()}\n`);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
