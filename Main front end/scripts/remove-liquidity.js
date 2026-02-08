const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) { console.error("Set CONTRACT_ADDRESS"); process.exit(1); }

  const [signer] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt("GasCapFutures", CONTRACT);

  const amount = process.env.AMOUNT || "0.5";
  const value = hre.ethers.parseEther(amount);

  const provided = await c.liquidityProvided(signer.address);
  console.log(`Your liquidity: ${hre.ethers.formatEther(provided)} C2FLR`);

  console.log(`Removing ${amount} C2FLR...`);
  const tx = await c.removeLiquidity(value);
  await tx.wait();
  console.log("Done!");
}

main().catch((error) => { console.error(error); process.exit(1); });
