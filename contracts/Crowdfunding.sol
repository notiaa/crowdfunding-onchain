// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {
	address public immutable owner;
	uint256 public immutable goal;
	uint256 public immutable deadline;

	uint256 public totalRaised;
	bool public withdrawn;

	mapping(address => uint256) public contributions;

	event Contributed(address indexed contributor, uint256 amount);
	event Withdrawn(address indexed recipient, uint256 amount);
	event Refunded(address indexed contributor, uint256 amount);

	modifier onlyOwner() {
		require(msg.sender == owner, "Only owner");
		_;
	}

	modifier beforeDeadline() {
		require(block.timestamp < deadline, "Campaign ended");
		_;
	}

	modifier afterDeadline() {
		require(block.timestamp >= deadline, "Campaign active");
		_;
	}

	constructor(uint256 _goal, uint256 _durationDays) {
		require(_goal > 0, "Goal must be > 0");
		require(_durationDays > 0, "Duration must be > 0");

		owner = msg.sender;
		goal = _goal;
		deadline = block.timestamp + (_durationDays * 1 days);
	}

	function contribute() external payable beforeDeadline {
		require(msg.value > 0, "Zero contribution");

		contributions[msg.sender] += msg.value;
		totalRaised += msg.value;

		emit Contributed(msg.sender, msg.value);
	}

	function withdraw() external onlyOwner afterDeadline {
		require(!withdrawn, "Already withdrawn");
		require(isGoalReached(), "Goal not reached");

		withdrawn = true;
		uint256 amount = address(this).balance;

		(bool success, ) = payable(owner).call{value: amount}("");
		require(success, "Transfer failed");

		emit Withdrawn(owner, amount);
	}

	function refund() external afterDeadline {
		require(!isGoalReached(), "Goal reached");

		uint256 amount = contributions[msg.sender];
		require(amount > 0, "Nothing to refund");

		contributions[msg.sender] = 0;

		(bool success, ) = payable(msg.sender).call{value: amount}("");
		require(success, "Refund failed");

		emit Refunded(msg.sender, amount);
	}

	function getRemainingTime() external view returns (uint256) {
		if (block.timestamp >= deadline) {
			return 0;
		}

		return deadline - block.timestamp;
	}

	function isGoalReached() public view returns (bool) {
		return totalRaised >= goal;
	}

	function getBalance() external view returns (uint256) {
		return address(this).balance;
	}
}
