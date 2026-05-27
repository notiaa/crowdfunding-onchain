# Crowdfunding On-Chain

> IT University Madagascar · Blockchain S14 · Mini-Projet Final

## 📖 Description du projet

Cette application permet de créer une campagne de crowdfunding on-chain sur le réseau Sepolia.

Le principe est simple :

- Un objectif de financement (ETH goal) et une deadline sont définis.
- Les utilisateurs peuvent contribuer en ETH via MetaMask.
- Si l’objectif est atteint avant la deadline :
  - le propriétaire du contrat peut retirer les fonds.
- Sinon :
  - les contributeurs peuvent récupérer automatiquement leur argent grâce au système de remboursement.

Le projet met l’accent sur :
- la sécurité des smart contracts,
- l’intégration Web3 avec MetaMask,
- l’utilisation d’Ethers.js,
- et le déploiement sur le testnet Sepolia.

---

# 👥 Membres du groupe

| Membre | Rôle | Responsabilité principale |
|---|---|---|
| Andriamalalarimanga Miora Prisca | Lead Solidity / Chef de projet | `Crowdfunding.sol`, architecture, déploiement Sepolia |
| Andriamisedra Notianiavo Filamatriniaina | Sécurité & Tests | Tests Hardhat, audit sécurité, script `deploy.js` |
| Rakotomavo Arisoa Anjamalala | Frontend | Interface HTML/CSS/JS, intégration Ethers.js, GitHub Pages |
| Randriamanalina Anja | DevOps & Documentation | GitHub repository, README, vidéo démo, coordination |

---

# 🛠️ Technologies utilisées

## Blockchain
- Solidity
- Hardhat
- OpenZeppelin
- Sepolia Testnet

## Frontend
- HTML5
- CSS3
- JavaScript
- Ethers.js

## Outils
- MetaMask
- GitHub
- GitHub Pages

---

# 🎯 Fonctionnalités principales

- Connexion avec MetaMask
- Contribution en ETH
- Affichage de l’objectif et des fonds collectés
- Vérification automatique de la deadline
- Withdraw des fonds par le owner
- Refund automatique des contributeurs si l’objectif n’est pas atteint

---

# 🔒 Sécurité

Le projet applique plusieurs bonnes pratiques de sécurité :

- Pattern CEI (Checks-Effects-Interactions)
- Protection contre la réentrance avec `ReentrancyGuard`
- Vérifications avec `require(...)`
- Gestion stricte des permissions

---

# 🚀 Déploiement

## Réseau utilisé
- Sepolia Testnet

## Adresse du contrat
```txt
TODO
```
# Installation 
```console
git clone https://github.com/notiaa/crowdfunding-onchain
cd crowdfunding-onchain
npm install
cp .env.example .env
# Remplir PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia
```

# Architecture du contrat

```
Crowdfunding.sol (is ReentrancyGuard)
│
├── Variables
│   ├── owner, goal, deadline (immutable)
│   ├── totalRaised, withdrawn
│   └── contributions (mapping address → uint256)
│
├── Events: Contributed · Withdrawn · Refunded
├── Modifiers: onlyOwner · beforeDeadline · afterDeadline · nonReentrant
│
├── contribute()   — payable, avant deadline
├── withdraw()     — owner seulement, après deadline, si goal atteint
├── refund()       — après deadline, si goal non atteint
│
└── Views: getRemainingTime() · isGoalReached() · getBalance()
```
## Sécurité
### Pattern CEI (Checks → Effects → Interactions)
Toutes les fonctions critiques suivent ce pattern :
1. **Checks** — vérification des conditions avec `require()`
2. **Effects** — mise à jour des variables d'état
3. **Interactions** — transfert ETH en dernier

Dans `refund()`, `contributions[msg.sender] = 0` est mis à zéro **avant** le transfert.

### ReentrancyGuard (OpenZeppelin)
Le contrat hérite de `ReentrancyGuard`. Le modifier `nonReentrant`
est appliqué sur `withdraw()` et `refund()` pour bloquer tout appel récursif.

### Contrôle d'accès
- `onlyOwner` — seul le déployeur peut appeler `withdraw()`
- `beforeDeadline` — contributions refusées après la deadline
- `afterDeadline` — retrait et remboursements avant la deadline impossibles

### Checklist des vulnérabilités
| Vecteur | Statut | Mécanisme |
|---|---|---|
| Overflow / underflow | Protégé | Solidity 0.8+ natif |
| Reentrancy | Protégé | ReentrancyGuard + CEI |
| Double withdraw | Protégé | `require(!withdrawn)` |
| Double refund | Protégé | Contributions mises à 0 avant transfert |
| Contribution nulle | Protégé | `require(msg.value > 0)` |
| Denial of Service | Protégé | Aucune boucle sur adresses externes |