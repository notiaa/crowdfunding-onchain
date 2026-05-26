const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crowdfunding", function () {
  const GOAL = ethers.parseEther("0.05");
  const DURATION_DAYS = 7;

  async function deployCrowdfundingFixture() {
    const [owner, contributor1, contributor2] = await ethers.getSigners();
    const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
    const crowdfunding = await Crowdfunding.deploy(GOAL, DURATION_DAYS);
    return { crowdfunding, owner, contributor1, contributor2 };
  }

  describe("Deployment", function () {
    it("Should set the correct owner");
    it("Should set the correct goal");
    it("Should set deadline in the future");
    it("Should start with totalRaised = 0");
    it("Should revert if goal = 0");
    it("Should revert if duration = 0");
  });

  describe("contribute()", function () {
    it("Should accept valid contribution and emit Contributed");
    it("Should update totalRaised");
    it("Should update contributions[address]");
    it("Should accumulate multiple contributions from the same address");
    it("Should revert if amount = 0");
    it("Should revert after deadline");
  });

  describe("withdraw()", function () {
    it("Should allow owner to withdraw if goal reached after deadline");
    it("Should set withdrawn = true after withdrawal");
    it("Should revert on double withdrawal");
    it("Should revert before deadline");
    it("Should revert if non-owner calls");
    it("Should revert if goal not reached");
  });

  describe("refund()", function () {
    it("Should refund contributor if goal not reached after deadline");
    it("Should set contributions[address] = 0 after refund");
    it("Should revert on double refund");
    it("Should revert if goal reached");
    it("Should revert if no contribution");
    it("Should revert before deadline");
  });

  describe("View functions", function () {
    it("getRemainingTime() should be > 0 before deadline");
    it("getRemainingTime() should be 0 after deadline");
    it("isGoalReached() should be false initially");
    it("isGoalReached() should be true when goal reached");
  });
});
