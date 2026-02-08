const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) { console.error("Set CONTRACT_ADDRESS"); process.exit(1); }

  const [signer] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt("GasCapFutures", CONTRACT);

  console.log("=== CONTRACT STATE ===");
  const state = await c.getContractState();
  console.log(`  Strike: ${state[0]} gwei`);
  console.log(`  Expiry: ${new Date(Number(state[1]) * 1000).toISOString()}`);
  console.log(`  Settled: ${state[2]}`);
  console.log(`  Settlement Price: ${state[3]}`);
  console.log(`  Liquidity: ${hre.ethers.formatEther(state[4])} C2FLR`);
  console.log(`  Participants: ${state[5]}`);

  console.log("\n=== GAS PRICE ===");
  try {
    const gas = await c.getCurrentGasPrice();
    console.log(`  Price: ${gas[0]}`);
    console.log(`  Timestamp: ${new Date(Number(gas[1]) * 1000).toISOString()}`);
    const direction = gas[0] > state[0] ? "LONG favorable" : "SHORT favorable";
    console.log(`  vs Strike: ${direction}`);
  } catch(e) { console.log("  FTSO unavailable:", e.message?.slice(0,80)); }

  console.log("\n=== MARKET INFO ===");
  const info = await c.getMarketInfo();
  console.log(`  Name: ${info[0]}`);
  console.log(`  Description: ${info[1]}`);

  console.log("\n=== YOUR PROFILE ===");
  const profile = await c.getUserProfile(signer.address);
  console.log(`  Registered: ${profile[0]}`);
  if (profile[0]) {
    console.log(`  Username: ${profile[1]}`);
    console.log(`  Total Trades: ${profile[3]}`);
    console.log(`  Registered At: ${new Date(Number(profile[4]) * 1000).toISOString()}`);
  }

  console.log("\n=== YOUR POSITION ===");
  const pos = await c.getPosition(signer.address);
  if (pos[0]) {
    console.log(`  Direction: ${pos[1] ? "LONG" : "SHORT"}`);
    console.log(`  Quantity: ${pos[2]}`);
    console.log(`  Collateral: ${hre.ethers.formatEther(pos[3])} C2FLR`);
    console.log(`  Leverage: ${pos[4]}x`);
    console.log(`  Entry Price: ${pos[7]}`);
    console.log(`  Active: ${pos[9]}, Claimed: ${pos[10]}`);
  } else {
    console.log("  No position");
  }

  console.log(`\nExplorer: https://coston2-explorer.flare.network/address/${CONTRACT}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
