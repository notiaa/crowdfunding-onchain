const CONTRACT_ADDRESS = "TODO";
const ABI = [
  // Constructor
  "constructor(uint256 _goal, uint256 _durationDays)",

  // State variables
  "function owner() view returns (address)",
  "function goal() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function totalRaised() view returns (uint256)",
  "function withdrawn() view returns (bool)",
  "function contributions(address) view returns (uint256)",

  // Functions
  "function contribute() payable",
  "function withdraw()",
  "function refund()",
  "function getRemainingTime() view returns (uint256)",
  "function isGoalReached() view returns (bool)",
  "function getBalance() view returns (uint256)",

  // Events
  "event Contributed(address indexed contributor, uint256 amount)",
  "event Withdrawn(address indexed recipient, uint256 amount)",
  "event Refunded(address indexed contributor, uint256 amount)",
];

// ── State ──────────────────────────────────────────────────────────────────
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const btnConnect      = document.getElementById("btnConnect");
const btnContribute   = document.getElementById("btnContribute");
const btnWithdraw     = document.getElementById("btnWithdraw");
const btnRefund       = document.getElementById("btnRefund");
const walletAddress   = document.getElementById("walletAddress");
const inputAmount     = document.getElementById("inputAmount");

const elGoal          = document.getElementById("goal");
const elTotalRaised   = document.getElementById("totalRaised");
const elTimeRemaining = document.getElementById("timeRemaining");
const elStatus        = document.getElementById("status");
const elProgressFill  = document.getElementById("progressFill");
const elProgressLabel = document.getElementById("progressLabel");
const elMyContrib     = document.getElementById("myContribution");

// ── Notification ───────────────────────────────────────────────────────────
let notifTimer = null;

function showNotif(message, type = "info") {
  const el = document.getElementById("notification");
  const txt = document.getElementById("notificationText");

  el.className = `notification notification--${type}`;
  txt.textContent = message;

  if (notifTimer) clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.classList.add("hidden"), 5000);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parseError(err) {
  const reason = err?.reason || err?.data?.message || "";
  const msg    = err?.message || "";

  if (reason.includes("Goal not reached"))       return "L'objectif n'est pas encore atteint.";
  if (reason.includes("Goal already reached"))   return "L'objectif est déjà atteint, le remboursement n'est pas possible.";
  if (reason.includes("Already withdrawn"))      return "Les fonds ont déjà été retirés.";
  if (reason.includes("No contribution"))        return "Tu n'as pas contribué à cette campagne.";
  if (reason.includes("Already refunded"))       return "Tu as déjà été remboursé.";
  if (reason.includes("Deadline not passed"))    return "La campagne est encore en cours.";
  if (reason.includes("Deadline passed"))        return "La campagne est terminée, les contributions sont closes.";
  if (reason.includes("Amount must be > 0"))     return "Le montant doit être supérieur à 0 ETH.";
  if (reason.includes("Not owner"))              return "Seul le propriétaire peut effectuer cette action.";
  if (msg.includes("user rejected"))             return "Transaction annulée par l'utilisateur.";
  if (msg.includes("insufficient funds"))        return "Fonds insuffisants dans ton wallet.";
  if (msg.includes("network"))                   return "Erreur réseau — vérifie ta connexion.";
  if (reason) return reason;
  return "Une erreur est survenue. Réessaie.";
}

function formatETH(wei) {
  return parseFloat(ethers.formatEther(wei)).toFixed(4) + " ETH";
}

function formatTime(seconds) {
  const s = Number(seconds);
  if (s <= 0) return "Terminée";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span>${btn.dataset.originalText}`;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
  }
}

// ── Connect MetaMask ───────────────────────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    showNotif("MetaMask n'est pas installé. Installe l'extension MetaMask.", "error");
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) {
      showNotif("Mauvais réseau — passe sur Sepolia dans MetaMask.", "error");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
        provider = new ethers.BrowserProvider(window.ethereum);
      } catch {
        return;
      }
    }

    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    walletAddress.textContent = userAddress.slice(0, 6) + "…" + userAddress.slice(-4);
    walletAddress.classList.remove("hidden");
    btnConnect.textContent = "Connecté";
    btnConnect.disabled = true;
    btnContribute.disabled = false;

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    await loadContractData();
    showNotif("Wallet connecté avec succès.", "success");
  } catch (err) {
    showNotif("Connexion annulée ou échouée.", "error");
  }
}

// ── Load contract data ─────────────────────────────────────────────────────
async function loadContractData() {
  if (!contract) return;

  try {
    const [goal, totalRaised, timeRemaining, isGoalReached, withdrawn, ownerAddress, myContrib] =
      await Promise.all([
        contract.goal(),
        contract.totalRaised(),
        contract.getRemainingTime(),
        contract.isGoalReached(),
        contract.withdrawn(),
        contract.owner(),
        userAddress ? contract.contributions(userAddress) : Promise.resolve(0n),
      ]);

    // Affichage des données
    elGoal.textContent        = formatETH(goal);
    elTotalRaised.textContent = formatETH(totalRaised);
    elTimeRemaining.textContent = formatTime(timeRemaining);
    elMyContrib.textContent   = formatETH(myContrib);

    // Statut
    const deadlinePassed = Number(timeRemaining) === 0;
    if (!deadlinePassed) {
      elStatus.textContent = "En cours";
      elStatus.style.color = "#6c63ff";
    } else if (isGoalReached) {
      elStatus.textContent = "Financé ✓";
      elStatus.style.color = "#22c55e";
    } else {
      elStatus.textContent = "Échoué – remboursement disponible";
      elStatus.style.color = "#ef4444";
    }

    // Barre de progression
    const pct = goal > 0n
      ? Math.min(100, Math.round(Number((totalRaised * 100n) / goal)))
      : 0;
    elProgressFill.style.width = pct + "%";
    elProgressLabel.textContent = pct + "%";

    // Boutons conditionnels
    const isOwner = userAddress?.toLowerCase() === ownerAddress.toLowerCase();

    if (isOwner && deadlinePassed && isGoalReached && !withdrawn) {
      btnWithdraw.classList.remove("hidden");
    } else {
      btnWithdraw.classList.add("hidden");
    }

    if (deadlinePassed && !isGoalReached && myContrib > 0n) {
      btnRefund.classList.remove("hidden");
    } else {
      btnRefund.classList.add("hidden");
    }
  } catch {
    // Silently ignore read errors (contrat pas encore déployé ou ABI vide)
  }
}

// ── Contribute ─────────────────────────────────────────────────────────────
async function contribute() {
  const amount = inputAmount.value.trim();
  if (!amount || parseFloat(amount) <= 0) {
    showNotif("Entre un montant valide en ETH.", "error");
    return;
  }

  setLoading(btnContribute, true);
  try {
    const tx = await contract.contribute({ value: ethers.parseEther(amount) });
    showNotif("Transaction envoyée — en attente de confirmation…", "info");
    await tx.wait();
    inputAmount.value = "";
    await loadContractData();
    showNotif("Contribution confirmée !", "success");
  } catch (err) {
    const msg = parseError(err);
    showNotif(msg, "error");
  } finally {
    setLoading(btnContribute, false);
  }
}

// ── Withdraw ───────────────────────────────────────────────────────────────
async function withdraw() {
  setLoading(btnWithdraw, true);
  try {
    const tx = await contract.withdraw();
    showNotif("Retrait en cours…", "info");
    await tx.wait();
    await loadContractData();
    showNotif("Fonds retirés avec succès.", "success");
  } catch (err) {
    const msg = parseError(err);
    showNotif(msg, "error");
  } finally {
    setLoading(btnWithdraw, false);
  }
}

// ── Refund ─────────────────────────────────────────────────────────────────
async function refund() {
  setLoading(btnRefund, true);
  try {
    const tx = await contract.refund();
    showNotif("Remboursement en cours…", "info");
    await tx.wait();
    await loadContractData();
    showNotif("Remboursement reçu.", "success");
  } catch (err) {
    const msg = parseError(err);
    showNotif(msg, "error");
  } finally {
    setLoading(btnRefund, false);
  }
}

// ── Event listeners ────────────────────────────────────────────────────────
btnConnect.addEventListener("click", connectWallet);
btnContribute.addEventListener("click", contribute);
btnWithdraw.addEventListener("click", withdraw);
btnRefund.addEventListener("click", refund);

// Rafraîchissement auto toutes les 15 secondes
setInterval(loadContractData, 15000);
