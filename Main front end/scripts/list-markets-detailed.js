const hre = require("hardhat");

async function main() {
  const FACTORY = process.env.FACTORY_ADDRESS;
  if (!FACTORY) { console.error("Set FACTORY_ADDRESS"); process.exit(1); }

  const factory = await hre.ethers.getContractAt("GasCapFuturesFactory", FACTORY);
  const count = await factory.marketsCount();
  const now = Math.floor(Date.now() / 1000);

  const active = [], expired = [], settled = [];

  for (let i = 0; i < Number(count); i++) {
    const [market, creator, createdAt] = await factory.getMarket(i);
    const c = await hre.ethers.getContractAt("GasCapFutures", market);
    const state = await c.getContractState();
    const info = await c.getMarketInfo();

    const entry = { index: i, address: market, creator, createdAt, state, info, contract: c };

    if (state[2]) settled.push(entry);
    else if (now >= Number(state[1])) expired.push(entry);
    else active.push(entry);
  }

  const printMarket = async (m) => {
    console.log(`  #${m.index} ${m.address}`);
    console.log(`    Name: ${m.info[0]}`);
    console.log(`    Description: ${m.info[1]}`);
    console.log(`    Strike: ${m.state[0]} gwei`);
    console.log(`    Expiry: ${new Date(Number(m.state[1]) * 1000).toISOString()}`);
    console.log(`    Liquidity: ${hre.ethers.formatEther(m.state[4])} C2FLR`);
    console.log(`    Participants: ${m.state[5]}`);
    if (m.state[2]) console.log(`    Settlement: ${m.state[3]} gwei`);
    console.log();
  };

  console.log(`\n=== ACTIVE MARKETS (${active.length}) ===`);
  for (const m of active) await printMarket(m);

  console.log(`=== EXPIRED NOT SETTLED (${expired.length}) ===`);
  for (const m of expired) await printMarket(m);

  console.log(`=== SETTLED (${settled.length}) ===`);
  for (const m of settled) await printMarket(m);
}

main().catch((error) => { console.error(error); process.exit(1); });
