const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) { console.error("Set CONTRACT_ADDRESS"); process.exit(1); }

  const c = await hre.ethers.getContractAt("GasCapFutures", CONTRACT);
  const state = await c.getContractState();

  console.log(`Strike: ${state[0]} gwei`);
  console.log(`Expiry: ${new Date(Number(state[1]) * 1000).toISOString()}`);
  console.log(`Settled: ${state[2]}`);

  if (state[2]) {
    console.log(`Already settled at ${state[3]} gwei`);
    const result = state[3] > state[0] ? "LONGS WIN" : state[3] < state[0] ? "SHORTS WIN" : "DRAW";
    console.log(result);
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < Number(state[1])) {
    const remaining = Number(state[1]) - now;
    console.log(`Not expired yet. ${remaining}s remaining.`);
    return;
  }

  console.log("Settling...");
  const gasPrice = await c.getCurrentGasPrice();
  console.log(`Current gas price: ${gasPrice[0]}`);

  const tx = await c.settleContract();
  const receipt = await tx.wait();
  console.log(`Settled! TX: ${receipt.hash}`);

  const newState = await c.getContractState();
  console.log(`Settlement price: ${newState[3]}`);
  const result = newState[3] > newState[0] ? "LONGS WIN" : newState[3] < newState[0] ? "SHORTS WIN" : "DRAW";
  console.log(result);
}

main().catch((error) => { console.error(error); process.exit(1); });
