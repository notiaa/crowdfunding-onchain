const hre = require("hardhat");

async function main() {
  const Crowdfunding = await hre.ethers.getContractFactory("Crowdfunding");

  // Goal = 0.05 ETH, Duration = 7 days
  const parseEther = hre.ethers.parseEther ?? hre.ethers.utils.parseEther;
  const goal = parseEther("0.05");
  const durationDays = 7;

  const crowdfunding = await Crowdfunding.deploy(goal, durationDays);

  // wait for deployment (supports both ethers v6 and v5 styles)
  if (crowdfunding.waitForDeployment) {
    await crowdfunding.waitForDeployment();
  } else if (crowdfunding.deployed) {
    await crowdfunding.deployed();
  }

  const address = crowdfunding.target ?? crowdfunding.address;
  console.log("Crowdfunding deployed to:", address);

  // Etherscan link (Sepolia)
  console.log(`Etherscan: https://sepolia.etherscan.io/address/${address}`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
