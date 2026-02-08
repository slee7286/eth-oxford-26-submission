const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) { console.error("Set CONTRACT_ADDRESS"); process.exit(1); }

  const [signer] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt("GasCapFutures", CONTRACT);

  const amount = process.env.AMOUNT || "1";
  const value = hre.ethers.parseEther(amount);

  const state = await c.getContractState();
  console.log(`Current liquidity: ${hre.ethers.formatEther(state[4])} C2FLR`);

  console.log(`Adding ${amount} C2FLR liquidity...`);
  const tx = await c.addLiquidity({ value });
  await tx.wait();

  const newState = await c.getContractState();
  console.log(`New liquidity: ${hre.ethers.formatEther(newState[4])} C2FLR`);
}

main().catch((error) => { console.error(error); process.exit(1); });
