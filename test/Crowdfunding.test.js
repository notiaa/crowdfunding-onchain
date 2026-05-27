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
    it("Should set the correct owner", async function () {
      const { crowdfunding, owner } = await deployCrowdfundingFixture();
      expect(await crowdfunding.owner()).to.equal(owner.address);
    });

    it("Should set the correct goal", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      expect(await crowdfunding.goal()).to.equal(GOAL);
    });

    it("Should set deadline in the future", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      const latest = await time.latest();
      expect(await crowdfunding.deadline()).to.be.gt(latest);
    });

    it("Should start with totalRaised = 0", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      expect(await crowdfunding.totalRaised()).to.equal(0);
    });

    it("Should revert if goal = 0", async function () {
      const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
      await expect(Crowdfunding.deploy(0, DURATION_DAYS)).to.be.revertedWith("Goal must be > 0");
    });

    it("Should revert if duration = 0", async function () {
      const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
      await expect(Crowdfunding.deploy(GOAL, 0)).to.be.revertedWith("Duration must be > 0");
    });
  });

  describe("contribute()", function () {
    it("Should accept valid contribution and emit Contributed", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      const amount = ethers.parseEther("0.01");
      await expect(crowdfunding.connect(contributor1).contribute({ value: amount }))
        .to.emit(crowdfunding, "Contributed")
        .withArgs(contributor1.address, amount);
    });

    it("Should update totalRaised", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      const amount = ethers.parseEther("0.01");
      await crowdfunding.connect(contributor1).contribute({ value: amount });
      expect(await crowdfunding.totalRaised()).to.equal(amount);
    });

    it("Should update contributions[address]", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      const amount = ethers.parseEther("0.01");
      await crowdfunding.connect(contributor1).contribute({ value: amount });
      expect(await crowdfunding.contributions(contributor1.address)).to.equal(amount);
    });

    it("Should accumulate multiple contributions from the same address", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      const amount = ethers.parseEther("0.01");
      await crowdfunding.connect(contributor1).contribute({ value: amount });
      await crowdfunding.connect(contributor1).contribute({ value: amount });
      expect(await crowdfunding.contributions(contributor1.address)).to.equal(amount * 2n);
    });

    it("Should revert if amount = 0", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await expect(
        crowdfunding.connect(contributor1).contribute({ value: 0 })
      ).to.be.revertedWith("Zero contribution");
    });

    it("Should revert after deadline", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(
        crowdfunding.connect(contributor1).contribute({ value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Campaign ended");
    });
  });

  describe("withdraw()", function () {
    it("Should allow owner to withdraw if goal reached after deadline", async function () {
      const { crowdfunding, owner, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: GOAL });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(crowdfunding.connect(owner).withdraw())
        .to.emit(crowdfunding, "Withdrawn")
        .withArgs(owner.address, GOAL);
    });

    it("Should set withdrawn = true after withdrawal", async function () {
      const { crowdfunding, owner, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: GOAL });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await crowdfunding.connect(owner).withdraw();
      expect(await crowdfunding.withdrawn()).to.equal(true);
    });

    it("Should revert on double withdrawal", async function () {
      const { crowdfunding, owner, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: GOAL });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await crowdfunding.connect(owner).withdraw();
      await expect(crowdfunding.connect(owner).withdraw()).to.be.revertedWith("Already withdrawn");
    });

    it("Should revert before deadline", async function () {
      const { crowdfunding, owner, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: GOAL });
      await expect(crowdfunding.connect(owner).withdraw()).to.be.revertedWith("Campaign active");
    });

    it("Should revert if non-owner calls", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: GOAL });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(crowdfunding.connect(contributor1).withdraw()).to.be.revertedWith("Only owner");
    });

    it("Should revert if goal not reached", async function () {
      const { crowdfunding, owner, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: ethers.parseEther("0.001") });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(crowdfunding.connect(owner).withdraw()).to.be.revertedWith("Goal not reached");
    });
  });

  describe("refund()", function () {
    it("Should refund contributor if goal not reached after deadline", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      const amount = ethers.parseEther("0.001");
      await crowdfunding.connect(contributor1).contribute({ value: amount });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(crowdfunding.connect(contributor1).refund())
        .to.emit(crowdfunding, "Refunded")
        .withArgs(contributor1.address, amount);
    });

    it("Should set contributions[address] = 0 after refund", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: ethers.parseEther("0.001") });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await crowdfunding.connect(contributor1).refund();
      expect(await crowdfunding.contributions(contributor1.address)).to.equal(0);
    });

    it("Should revert on double refund", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: ethers.parseEther("0.001") });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await crowdfunding.connect(contributor1).refund();
      await expect(crowdfunding.connect(contributor1).refund()).to.be.revertedWith("Nothing to refund");
    });

    it("Should revert if goal reached", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: GOAL });
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(crowdfunding.connect(contributor1).refund()).to.be.revertedWith("Goal reached");
    });

    it("Should revert if no contribution", async function () {
      const { crowdfunding, contributor2 } = await deployCrowdfundingFixture();
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      await expect(crowdfunding.connect(contributor2).refund()).to.be.revertedWith("Nothing to refund");
    });

    it("Should revert before deadline", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: ethers.parseEther("0.001") });
      await expect(crowdfunding.connect(contributor1).refund()).to.be.revertedWith("Campaign active");
    });
  });

  describe("View functions", function () {
    it("getRemainingTime() should be > 0 before deadline", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      expect(await crowdfunding.getRemainingTime()).to.be.gt(0);
    });

    it("getRemainingTime() should be 0 after deadline", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      await time.increase(DURATION_DAYS * 24 * 60 * 60 + 1);
      expect(await crowdfunding.getRemainingTime()).to.equal(0);
    });

    it("isGoalReached() should be false initially", async function () {
      const { crowdfunding } = await deployCrowdfundingFixture();
      expect(await crowdfunding.isGoalReached()).to.equal(false);
    });

    it("isGoalReached() should be true when goal reached", async function () {
      const { crowdfunding, contributor1 } = await deployCrowdfundingFixture();
      await crowdfunding.connect(contributor1).contribute({ value: GOAL });
      expect(await crowdfunding.isGoalReached()).to.equal(true);
    });
  });
});
