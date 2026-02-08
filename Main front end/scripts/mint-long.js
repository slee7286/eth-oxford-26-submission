const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) { console.error("Set CONTRACT_ADDRESS"); process.exit(1); }

  const [signer] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt("GasCapFutures", CONTRACT);

  // Check registration
  const profile = await c.getUserProfile(signer.address);
  if (!profile[0]) {
    const username = process.env.USERNAME || "gas-trader";
    console.log(`Registering as "${username}"...`);
    const regTx = await c.registerUser(username, "");
    await regTx.wait();
    console.log("Registered!");
  } else {
    const loginTx = await c.login();
    await loginTx.wait();
  }

  // Check state
  const state = await c.getContractState();
  console.log(`Strike: ${state[0]} gwei, Settled: ${state[2]}`);

  const quantity = parseInt(process.env.QUANTITY || "1");
  const leverage = parseInt(process.env.LEVERAGE || "1");
  const marginMode = parseInt(process.env.MARGIN_MODE || "0");
  const collateral = process.env.COLLATERAL || "0.1";
  const value = hre.ethers.parseEther(collateral);

  // Check existing position
  const pos = await c.getPosition(signer.address);
  if (pos[0] && pos[2] > 0n) {
    console.log("Already have a position in this market!");
    return;
  }

  console.log(`Opening LONG: ${quantity} contracts, ${leverage}x leverage, ${collateral} C2FLR`);
  const tx = await c.mintLong(quantity, leverage, marginMode, { value });
  const receipt = await tx.wait();
  console.log(`TX: ${receipt.hash}`);

  const newPos = await c.getPosition(signer.address);
  console.log("Position opened:", {
    isLong: newPos[1], quantity: newPos[2].toString(),
    collateral: hre.ethers.formatEther(newPos[3]), leverage: newPos[4].toString()
  });
}

main().catch((error) => { console.error(error); process.exit(1); });
