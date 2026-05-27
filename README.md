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
