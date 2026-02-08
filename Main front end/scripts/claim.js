const hre = require("hardhat");

async function main() {
  const CONTRACT = process.env.CONTRACT_ADDRESS;
  if (!CONTRACT) { console.error("Set CONTRACT_ADDRESS"); process.exit(1); }

  const [signer] = await hre.ethers.getSigners();
  const c = await hre.ethers.getContractAt("GasCapFutures", CONTRACT);

  const state = await c.getContractState();
  if (!state[2]) { console.log("Not settled yet. Run settle.js first."); return; }

  const pos = await c.getPosition(signer.address);
  if (!pos[0] || pos[2] === 0n) { console.log("No position found."); return; }
  if (pos[10]) { console.log("Already claimed."); return; }

  console.log(`Position: ${pos[1] ? "LONG" : "SHORT"}, ${pos[2]} contracts, ${hre.ethers.formatEther(pos[3])} C2FLR collateral`);
  console.log(`Leverage: ${pos[4]}x | Entry Price: ${pos[7]}`);
  console.log(`Strike: ${state[0]} | Settlement: ${state[3]}`);

  const payout = await c.calculatePayout(signer.address);
  console.log(`\nGross Payout: ${hre.ethers.formatEther(payout)} C2FLR`);

  if (payout === 0n) { console.log("Payout is 0 — lost entire collateral."); return; }

  const balBefore = await hre.ethers.provider.getBalance(signer.address);
  const tx = await c.claimPayout();
  const receipt = await tx.wait();
  const balAfter = await hre.ethers.provider.getBalance(signer.address);

  // Calculate actual gas cost
  const gasUsed = receipt.gasUsed;
  const gasPrice = tx.gasPrice;
  const gasFee = gasUsed * gasPrice;

  // Net payout = what the contract sent (balance change + gas fee)
  const netBalanceChange = balAfter - balBefore;
  const contractPayout = netBalanceChange + gasFee;

  console.log(`\n--- Transaction Details ---`);
  console.log(`Gas used: ${gasUsed} units @ ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`Gas fee: ${hre.ethers.formatEther(gasFee)} C2FLR`);
  console.log(`\n--- Payout Breakdown ---`);
  console.log(`Contract payout: ${hre.ethers.formatEther(contractPayout)} C2FLR`);
  console.log(`Gas fee paid:   -${hre.ethers.formatEther(gasFee)} C2FLR`);
  console.log(`Net received:    ${hre.ethers.formatEther(netBalanceChange)} C2FLR`);
  console.log(`\nBalance before: ${hre.ethers.formatEther(balBefore)}`);
  console.log(`Balance after:  ${hre.ethers.formatEther(balAfter)}`);

  // Profit calculation
  const collateral = pos[3];
  const profit = contractPayout - collateral;
  console.log(`\n--- Profit/Loss ---`);
  console.log(`Collateral:  ${hre.ethers.formatEther(collateral)} C2FLR`);
  console.log(`Payout:      ${hre.ethers.formatEther(contractPayout)} C2FLR`);
  console.log(`Gross P&L:   ${profit >= 0n ? '+' : ''}${hre.ethers.formatEther(profit)} C2FLR`);
  console.log(`Net P&L:     ${(profit - gasFee) >= 0n ? '+' : ''}${hre.ethers.formatEther(profit - gasFee)} C2FLR (after gas)`);
}

main().catch((error) => { console.error(error); process.exit(1); });
