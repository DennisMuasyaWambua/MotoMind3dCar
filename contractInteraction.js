// Remove the import since we're using the UMD version
// import { ethers } from "https://cdn.ethers.io/lib/ethers-5.2.esm.min.js";
// import { MetaMaskSDK } from "@metamask/sdk"
// Contract configuration
const contract_address = "0xF20b91FaB40364f978Bc1AA842d384c857Eb9dc1";
const ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_insurer",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "driver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PremiumPaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "driver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newPremium",
        "type": "uint256"
      }
    ],
    "name": "PremiumUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "drivers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "riskScore",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "basePremium",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "monthlyPremium",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isRegistered",
        "type": "bool"
      }
    ],}
    ]

// Initialize variables
let provider;
let signer;
let contract;
// const ConnectWallet = async() => {
//   const MMSDK = new MetaMaskSDK({
//     dappMetadata: {
//       name: "Example JavaScript Dapp",
//       url: window.location.href,
//     },
  
//   })
  
//   const ethereum = MMSDK.getProvider()
  
//   // Connect to MetaMask
//   const accounts = await MMSDK.connect()
  
//   // Make requests
//   const result = await ethereum.request({ 
//     method: "eth_accounts", 
//     params: [] 
//   })
// }
// document.getElementById("connect-wallet").addEventListener('click', () => {
//   console.log("connect-wallet");
//   ConnectWallet();
// });
// First, define the function in the global scope
// window.connectWalletHandler = async function() {
//     console.log('Connect wallet handler called');
    
//     try {
//         // Check if MetaMask is installed
//         if (typeof window.ethereum === 'undefined') {
//             console.log('MetaMask not detected');
//             alert('Please install MetaMask!');
//             return;
//         }
        
//         console.log('MetaMask detected');

//         // Request account access
//         console.log('Requesting account access...');
//         const accounts = await window.ethereum.request({ 
//             method: 'eth_requestAccounts' 
//         });
        
//         const account = accounts[0];
//         console.log('Connected account:', account);

//         // Setup ethers
//         console.log('Setting up ethers...');
//         window.provider = new ethers.providers.Web3Provider(window.ethereum);
//         window.signer = window.provider.getSigner();
//         window.contract = new ethers.Contract(contract_address, ABI, window.signer);

//         // Update button text
//         const connectButton = document.getElementById('connect-wallet');
//         if (connectButton) {
//             connectButton.textContent = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
//             console.log('Button text updated');
//         }
        
//     } catch (error) {
//         console.error('Connection error:', error);
//         alert('Failed to connect wallet: ' + error.message);
//     }
// };

// // Function to check if button exists and add listener
// function setupConnectButton() {
//     console.log('Setting up connect button...');
//     const connectButton = document.getElementById('connect-wallet');
    
//     if (connectButton) {
//         console.log('Connect button found, adding click listener');
//         connectButton.addEventListener('click', window.connectWalletHandler);
//         console.log('Click listener added to connect button');
//     } else {
//         console.error('Connect button not found in DOM');
//     }
// }

// // Wait for the page to fully load
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('DOM fully loaded');
//     setupConnectButton();
// });

// // Backup initialization
// window.onload = function() {
//     console.log('Window loaded');
//     setupConnectButton();
// };

// // Log script loading
// console.log('ContractInteraction.js loaded');

// // Update risk display in real-time
// function updateRiskDisplay(value) {
//     const riskDisplay = document.getElementById('risk-display');
//     riskDisplay.textContent = `Risk: ${value}%`;
// }

// // Event listeners for form inputs
// function setupEventListeners() {
//     const riskScoreInput = document.getElementById('risk-score');
//     if (riskScoreInput) {
//         riskScoreInput.addEventListener('input', (e) => {
//             updateRiskDisplay(e.target.value);
//         });
//     }

//     const modalForm = document.getElementById('modal-form');
//     if (modalForm) {
//         modalForm.addEventListener('submit', async (e) => {
//             e.preventDefault();
//             await handleFormSubmission();
//         });
//     }
// }

// // Initialize when the DOM is fully loaded
// document.addEventListener('DOMContentLoaded', () => {
//     setupEventListeners();
//     console.log('Event listeners set up'); // Debug log
// });
  