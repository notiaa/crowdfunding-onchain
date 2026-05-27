// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Crowdfunding On-Chain
/// @notice Campagne de financement avec objectif ETH et deadline
/// @dev Utilise le pattern CEI et ReentrancyGuard pour sécuriser les transferts
contract Crowdfunding is ReentrancyGuard {
	/// @notice Owner of the campaign
	address public immutable owner;
	/// @notice Goal in wei
	uint256 public immutable goal;
	/// @notice Deadline as unix timestamp
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

	/// @param _goal Objectif de collecte en wei
	/// @param _durationDays Durée de la campagne en jours
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

	/// @notice Withdraw funds to owner if goal reached after deadline
	function withdraw() external onlyOwner afterDeadline nonReentrant {
		// Checks
		require(totalRaised >= goal, "Goal not reached");
		require(!withdrawn, "Already withdrawn");

		// Effects
		withdrawn = true;
		uint256 amount = address(this).balance;

		// Interaction
		(bool success, ) = payable(owner).call{value: amount}("");
		require(success, "Transfer failed");

		emit Withdrawn(owner, amount);
	}

	/// @notice Refund contributor if goal not reached after deadline
	function refund() external afterDeadline nonReentrant {
		// Checks
		require(totalRaised < goal, "Goal reached");

		uint256 amount = contributions[msg.sender];
		require(amount > 0, "Nothing to refund");

		// Effects
		contributions[msg.sender] = 0;

		// Interaction
		(bool success, ) = payable(msg.sender).call{value: amount}("");
		require(success, "Refund failed");

		emit Refunded(msg.sender, amount);
	}

	/// @notice Retourne le temps restant avant la deadline
	/// @return Temps restant en secondes
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
