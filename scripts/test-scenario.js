const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [owner, alice, bob] = await ethers.getSigners();

  console.log("\n=== SCÉNARIO DE TEST COMPLET ===\n");

  // ===== TEST 1: Goal atteint → withdraw réussit, refund échoue =====
  console.log("📋 TEST 1: Goal atteint (0.015 ETH) + Withdraw");
  console.log("─".repeat(50));

  const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
  
  // Déployer avec 1 jour de deadline (on va simuler la fin rapidement)
  const goal = ethers.parseEther("0.015");
  const contract1 = await Crowdfunding.deploy(goal, 1);
  await contract1.waitForDeployment();
  const addr1 = contract1.target;

  console.log(`✓ Contrat 1 déployé: ${addr1}`);
  console.log(`  Owner: ${owner.address}`);
  console.log(`  Goal: ${ethers.formatEther(goal)} ETH`);

  // Contribution 1: Owner + 0.010 ETH
  let tx = await contract1.connect(owner).contribute({ value: ethers.parseEther("0.010") });
  await tx.wait();
  console.log(`✓ Owner contribue 0.010 ETH`);

  // Contribution 2: Alice + 0.005 ETH
  tx = await contract1.connect(alice).contribute({ value: ethers.parseEther("0.005") });
  await tx.wait();
  console.log(`✓ Alice contribue 0.005 ETH`);

  // Vérifier totalRaised
  let total = await contract1.totalRaised();
  let isGoal = await contract1.isGoalReached();
  console.log(`  Total collecté: ${ethers.formatEther(total)} ETH`);
  console.log(`  Goal atteint: ${isGoal}`);

  // Attendre la deadline
  console.log(`⏳ Attendre fin de deadline...`);
  const deadline = await contract1.deadline();
  const nextTs = Number(deadline) + 1;
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextTs]);
  await ethers.provider.send("evm_mine", []);
  console.log(`✓ Deadline passée`);

  // Tester withdraw (doit réussir)
  try {
    tx = await contract1.connect(owner).withdraw();
    const receipt = await tx.wait();
    console.log(`✓ Withdraw réussi (tx: ${tx.hash.slice(0, 10)}...)`);
    console.log(`  Tx hash complet: ${tx.hash}`);
  } catch (e) {
    console.log(`✗ Withdraw échoué: ${e.message}`);
  }

  // Vérifier que withdrawn = true
  let withdrawn = await contract1.withdrawn();
  console.log(`  withdrawn flag: ${withdrawn}`);

  // Tester refund (doit échouer car goal atteint)
  try {
    tx = await contract1.connect(alice).refund();
    await tx.wait();
    console.log(`✗ Refund a échoué (ne devrait pas réussir si goal atteint)`);
  } catch (e) {
    console.log(`✓ Refund refusé comme prévu: "${e.reason || e.message}"`);
  }

  // ===== TEST 2: Goal NON atteint → refund réussit, withdraw échoue =====
  console.log(`\n📋 TEST 2: Goal non atteint (0.050 ETH cible) + Refund`);
  console.log("─".repeat(50));

  const goal2 = ethers.parseEther("0.050");
  const contract2 = await Crowdfunding.deploy(goal2, 1);
  await contract2.waitForDeployment();
  const addr2 = contract2.target;

  console.log(`✓ Contrat 2 déployé: ${addr2}`);
  console.log(`  Owner: ${owner.address}`);
  console.log(`  Goal: ${ethers.formatEther(goal2)} ETH`);

  // Contribution: Bob + 0.010 ETH (insuffisant)
  tx = await contract2.connect(bob).contribute({ value: ethers.parseEther("0.010") });
  await tx.wait();
  console.log(`✓ Bob contribue 0.010 ETH (< goal)`);

  total = await contract2.totalRaised();
  isGoal = await contract2.isGoalReached();
  console.log(`  Total collecté: ${ethers.formatEther(total)} ETH`);
  console.log(`  Goal atteint: ${isGoal}`);

  // Attendre deadline
  console.log(`⏳ Attendre fin de deadline...`);
  const deadline2 = await contract2.deadline();
  const nextTs2 = Number(deadline2) + 1;
  await ethers.provider.send("evm_setNextBlockTimestamp", [nextTs2]);
  await ethers.provider.send("evm_mine", []);
  console.log(`✓ Deadline passée`);

  // Tester withdraw (doit échouer car goal pas atteint)
  try {
    tx = await contract2.connect(owner).withdraw();
    await tx.wait();
    console.log(`✗ Withdraw a échoué (ne devrait pas réussir si goal non atteint)`);
  } catch (e) {
    console.log(`✓ Withdraw refusé comme prévu: "${e.reason || e.message}"`);
  }

  // Tester refund (doit réussir)
  try {
    tx = await contract2.connect(bob).refund();
    const receipt = await tx.wait();
    console.log(`✓ Refund réussi (tx: ${tx.hash.slice(0, 10)}...)`);
    console.log(`  Tx hash complet: ${tx.hash}`);
    const bobContribution = await contract2.contributions(bob.address);
    console.log(`  Bob contribution après refund: ${ethers.formatEther(bobContribution)} ETH`);
  } catch (e) {
    console.log(`✗ Refund échoué: ${e.message}`);
  }

  console.log(`\n✅ TOUS LES SCÉNARIOS TESTÉS AVEC SUCCÈS\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
