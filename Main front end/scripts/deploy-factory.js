const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying GasCapFuturesFactory with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("GasCapFuturesFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const addr = await factory.getAddress();
  console.log("GasCapFuturesFactory deployed to:", addr);
  console.log(`Explorer: https://coston2-explorer.flare.network/address/${addr}`);
  console.log(`\nExport: export FACTORY_ADDRESS=${addr}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
