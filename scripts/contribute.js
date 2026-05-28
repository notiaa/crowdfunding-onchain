const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const amountEth = process.env.AMOUNT_ETH;

  if (!contractAddress || !amountEth) {
    throw new Error("Usage: CONTRACT_ADDRESS=<address> AMOUNT_ETH=<amount> npx hardhat run scripts/contribute.js --network sepolia");
  }

  const crowdfunding = await hre.ethers.getContractAt("Crowdfunding", contractAddress);
  const tx = await crowdfunding.contribute({ value: hre.ethers.parseEther(amountEth) });
  const receipt = await tx.wait();

  console.log("Contribution tx hash:", tx.hash);
  console.log("Block number:", receipt.blockNumber);
  console.log(`Etherscan tx: https://sepolia.etherscan.io/tx/${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
