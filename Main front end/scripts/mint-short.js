const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) { console.error("Set CONTRACT_ADDRESS"); process.exit(1); }

  const [signer] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt("GasCapFutures", CONTRACT);

  const profile = await c.getUserProfile(signer.address);
  if (!profile[0]) {
    const username = process.env.USERNAME || "gas-short-trader";
    console.log(`Registering as "${username}"...`);
    const regTx = await c.registerUser(username, "");
    await regTx.wait();
  } else {
    const loginTx = await c.login();
    await loginTx.wait();
  }

  const quantity = parseInt(process.env.QUANTITY || "1");
  const leverage = parseInt(process.env.LEVERAGE || "1");
  const marginMode = parseInt(process.env.MARGIN_MODE || "0");
  const collateral = process.env.COLLATERAL || "0.1";
  const value = hre.ethers.parseEther(collateral);

  const pos = await c.getPosition(signer.address);
  if (pos[0] && pos[2] > 0n) {
    console.log("Already have a position!");
    return;
  }

  console.log(`Opening SHORT: ${quantity} contracts, ${leverage}x, ${collateral} C2FLR`);
  const tx = await c.mintShort(quantity, leverage, marginMode, { value });
  const receipt = await tx.wait();
  console.log(`TX: ${receipt.hash}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
