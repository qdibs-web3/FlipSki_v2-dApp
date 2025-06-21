import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from "../context/WalletProvider";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  parseEther,
  formatEther,
  parseUnits,
  formatUnits,
  decodeEventLog,
} from "viem";
import {
  COINFLIP_CONTRACT_ADDRESS,
  COINFLIP_ERC20_CONTRACT_ADDRESS,
  FLIPSKI_TOKEN_ADDRESS,
  FLIPSKI_TOKEN_DECIMALS,
  baseMainnet,
} from "../config";
import FlipSkiBaseVRFABI from "../abis/FlipSkiBaseVRF.abi.json"; 
import FlipSkiBaseVRFerc20ABI from "../abis/FlipSkiBaseVRFerc20.abi.json";
import coinImage from "../assets/flipski4.gif";
import headsImage from "../assets/flip2.png";
import tailsImage from "../assets/ski2.png";
import "../styles/CoinFlipPage.css";
import "../styles/DualWagerTypes.css";
import LevelSystem from "../components/LevelSystem";

const isBrowser = typeof window !== 'undefined' && window.document !== undefined;

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const CoinFlipPage = () => {
  const {
    walletAddress,
    userRelatedError,
    isConnecting,
    isConnected,
    activeWalletInstance,
    connectionStatus
  } = useWallet();

  const [selectedSide, setSelectedSide] = useState(null);
  const [wager, setWager] = useState("0.001");
  const [wagerType, setWagerType] = useState("ETH"); // "ETH" or "FLIPSKI"
  const [isFlipping, setIsFlipping] = useState(false); 
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false); 
  const [flipResult, setFlipResult] = useState(null); 
  const [error, setError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [flipskiBalance, setFlipskiBalance] = useState("0");
  const [gameHistory, setGameHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentFlipAttempt, setCurrentFlipAttempt] = useState(null);
  const [activeTab, setActiveTab] = useState("history");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [lastProcessedGame, setLastProcessedGame] = useState(null);

  // Dynamic preset wagers based on wager type
  const presetWagers = useMemo(() => {
    if (wagerType === "ETH") {
      return ["0.001", "0.005", "0.01"];
    } else {
      return ["1000000", "10000000", "100000000"]; // 1M, 10M, 100M FlipSki tokens
    }
  }, [wagerType]);

  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: baseMainnet,
      transport: http(),
    });
  }, []);

  // Get current contract address and ABI based on wager type
  const getCurrentContract = useCallback(() => {
    if (wagerType === "ETH") {
      return {
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: FlipSkiBaseVRFABI.abi
      };
    } else {
      return {
        address: COINFLIP_ERC20_CONTRACT_ADDRESS,
        abi: FlipSkiBaseVRFerc20ABI.abi
      };
    }
  }, [wagerType]);

  const getWalletClient = useCallback(async () => {
    if (!isBrowser) {
      console.log("CoinFlipPage: Not in browser environment, skipping wallet client creation");
      return null;
    }
    
    if (!walletAddress) {
      console.error("CoinFlipPage: Wallet address not available for getWalletClient.");
      setError("Wallet address not found. Please ensure your wallet is connected.");
      return null;
    }
    
    if (typeof window === 'undefined' || typeof window.ethereum === "undefined") {
      console.error("CoinFlipPage: window.ethereum is not available. MetaMask or compatible provider not found.");
      setError("MetaMask (or a compatible EIP-1193 provider) not found. Please install MetaMask.");
      return null;
    }
    
    try {
      const provider = window.ethereum;
      if (!provider) {
        throw new Error("Ethereum provider is undefined");
      }
      
      return createWalletClient({
        account: walletAddress,
        chain: baseMainnet,
        transport: custom(provider),
      });
    } catch (err) {
      console.error("CoinFlipPage: Error creating wallet client with window.ethereum:", err);
      setError("Error initializing wallet client. Ensure your wallet is compatible and try again.");
      return null;
    }
  }, [walletAddress]);
  
  const ensureCorrectChain = async () => {
    if (!isBrowser || !window.ethereum) {
      setError("Browser wallet not available");
      return false;
    }
    
    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainIdDecimal = parseInt(currentChainId, 16);
      
      if (currentChainIdDecimal === baseMainnet.id) {
        return true;
      }
      
      setError(`Please switch to Base network in your wallet. Current network: Chain ID ${currentChainIdDecimal}`);
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${baseMainnet.id.toString(16)}` }],
        });
        
        const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const newChainIdDecimal = parseInt(newChainId, 16);
        
        if (newChainIdDecimal === baseMainnet.id) {
          setError("");
          return true;
        } else {
          setError(`Failed to switch to Base. Please switch manually in your wallet.`);
          return false;
        }
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${baseMainnet.id.toString(16)}`,
                  chainName: baseMainnet.name,
                  nativeCurrency: baseMainnet.nativeCurrency,
                  rpcUrls: [baseMainnet.rpcUrls.default.http[0]],
                  blockExplorerUrls: [baseMainnet.blockExplorers.default.url],
                },
              ],
            });
            
            const addedChainId = await window.ethereum.request({ method: 'eth_chainId' });
            const addedChainIdDecimal = parseInt(addedChainId, 16);
            
            if (addedChainIdDecimal === baseMainnet.id) {
              setError("");
              return true;
            } else {
              setError(`Failed to add and switch to Base. Please switch manually in your wallet.`);
              return false;
            }
          } catch (addError) {
            setError(`Failed to add Base network: ${addError.message}. Please add and switch manually.`);
            return false;
          }
        } else {
          setError(`Failed to switch to Base: ${switchError.message}. Please switch manually.`);
          return false;
        }
      }
    } catch (error) {
      console.error("Error checking or switching chain:", error);
      setError(`Error checking or switching chain: ${error.message}`);
      return false;
    }
  };

  const fetchEthBalance = useCallback(async () => {
    if (!isBrowser) return;
    
    if (walletAddress && publicClient) {
      try {
        const balance = await publicClient.getBalance({ address: walletAddress });
        setEthBalance(formatEther(balance));
      } catch (err) {
        console.error("Error fetching ETH balance:", err);
      }
    }
  }, [walletAddress, publicClient]);

  const fetchFlipskiBalance = useCallback(async () => {
    if (!isBrowser) return;
    
    if (walletAddress && publicClient) {
      try {
        const balance = await publicClient.readContract({
          address: FLIPSKI_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [walletAddress],
        });
        setFlipskiBalance(formatUnits(balance, FLIPSKI_TOKEN_DECIMALS));
      } catch (err) {
        console.error("Error fetching FlipSki balance:", err);
        setFlipskiBalance("0");
      }
    }
  }, [walletAddress, publicClient]);

  const checkTokenApproval = useCallback(async () => {
    if (!isBrowser || wagerType === "ETH" || !walletAddress || !publicClient) return;
    
    try {
      const currentContract = getCurrentContract();
      const allowance = await publicClient.readContract({
        address: FLIPSKI_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress, currentContract.address],
      });
      
      const wagerInWei = parseUnits(wager, FLIPSKI_TOKEN_DECIMALS);
      setNeedsApproval(allowance < wagerInWei);
    } catch (err) {
      console.error("Error checking token approval:", err);
      setNeedsApproval(true);
    }
  }, [walletAddress, publicClient, wager, wagerType, getCurrentContract]);

  const handleApproveToken = async () => {
    if (!isBrowser) return;
    
    setError("");
    setIsApproving(true);
    
    try {
      const walletClient = await getWalletClient();
      if (!walletClient) return;
      
      const isOnCorrectChain = await ensureCorrectChain();
      if (!isOnCorrectChain) return;
      
      const currentContract = getCurrentContract();
      const approvalAmount = parseUnits("1000000000", FLIPSKI_TOKEN_DECIMALS);
      
      const approveTxHash = await walletClient.writeContract({
        address: FLIPSKI_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [currentContract.address, approvalAmount],
        account: walletClient.account,
      });
      
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      setNeedsApproval(false);
      setError("");
    } catch (err) {
      console.error("Error approving token:", err);
      setError(`Approval failed: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const fetchLeaderboardData = useCallback(async () => {
    if (!isBrowser) return;
    
    try {
      const baseUrl = isBrowser 
        ? (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001')
        : '/api';
      
      const response = await fetch(`${baseUrl}/api/users/leaderboard`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard data: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setLeaderboardData([]);
    }
  }, []);

  // FIXED: Create separate fetch functions for each contract, but check the correct one based on currentFlipAttempt
  const fetchGameHistoryForContract = useCallback(async (contractAddress, contractAbi, wagerTypeForHistory) => {
    if (!isBrowser || !publicClient || !walletAddress) return [];
    
    try {
      if (!contractAbi) {
        console.error("HISTORY_DEBUG: Contract ABI not available");
        return [];
      }
      
      const gameSettledEventAbi = contractAbi.find(
        (item) => item && item.name === "GameSettled" && item.type === "event"
      );
      
      if (!gameSettledEventAbi) {
        console.error("HISTORY_DEBUG: GameSettled event ABI not found.");
        return [];
      }
      
      let logs = [];
      try {
        logs = await publicClient.getLogs({
          address: contractAddress,
          event: gameSettledEventAbi,
          args: { player: walletAddress },
          fromBlock: "earliest",
          toBlock: "latest",
        });
      } catch (logsError) {
        console.error("Error fetching logs:", logsError);
        logs = [];
      }
  
      const history = (logs || [])
        .filter(log => {
          return log && log.args && 
                 typeof log.args.gameId !== 'undefined' && 
                 typeof log.args.result !== 'undefined' && 
                 typeof log.args.payoutAmount !== 'undefined' && 
                 log.transactionHash;
        })
        .map((log) => {
          const rawResult = log.args.result;
          const mappedResult = Number(rawResult) === 0 ? "Heads" : "Tails";
          const payoutAmount = log.args.payoutAmount;
          const won = payoutAmount > 0n;
          
          // Format payout based on wager type
          const formattedPayout = wagerTypeForHistory === "ETH" 
            ? formatEther(payoutAmount)
            : formatUnits(payoutAmount, FLIPSKI_TOKEN_DECIMALS);
          
          return {
            gameId: log.args.gameId.toString(),
            result: mappedResult, 
            payout: formattedPayout,
            won: won,
            fulfillmentTxHash: log.transactionHash,
            vrfRequestId: log.args.vrfRequestId ? log.args.vrfRequestId.toString() : null,
            wagerType: wagerTypeForHistory,
            contractAddress: contractAddress,
          };
        });
      
      return history;
    } catch (err) {
      console.error("HISTORY_DEBUG: Error fetching game history:", err);
      return [];
    }
  }, [publicClient, walletAddress]);

  // FIXED: Fetch from current contract for display, but check specific contract for settlement
  const fetchGameHistory = useCallback(async () => {
    if (!isBrowser) return;
    
    const currentContract = getCurrentContract();
    const history = await fetchGameHistoryForContract(currentContract.address, currentContract.abi, wagerType);
    setGameHistory(history.slice(-10));
  }, [getCurrentContract, wagerType, fetchGameHistoryForContract]);

  // FIXED: Check for settlement in the specific contract where the game was submitted
  const checkForGameSettlement = useCallback(async () => {
    if (!currentFlipAttempt || !currentFlipAttempt.gameId || !currentFlipAttempt.contractAddress) return;
    
    console.log(`SETTLEMENT_DEBUG: Checking for game ${currentFlipAttempt.gameId} in contract ${currentFlipAttempt.contractAddress}`);
    
    // Determine which ABI to use based on contract address
    let contractAbi, wagerTypeForCheck;
    if (currentFlipAttempt.contractAddress.toLowerCase() === COINFLIP_CONTRACT_ADDRESS.toLowerCase()) {
      contractAbi = FlipSkiBaseVRFABI.abi;
      wagerTypeForCheck = "ETH";
    } else {
      contractAbi = FlipSkiBaseVRFerc20ABI.abi;
      wagerTypeForCheck = "FLIPSKI";
    }
    
    const history = await fetchGameHistoryForContract(currentFlipAttempt.contractAddress, contractAbi, wagerTypeForCheck);
    
    const settledGame = history.find(game => 
      game && game.gameId && game.gameId === currentFlipAttempt.gameId
    );
    
    if (settledGame) {
      console.log(`SETTLEMENT_DEBUG: Found settled game:`, settledGame);
      
      const gameResultOutcome = settledGame.won ? "win" : "loss";
      const actualSide = settledGame.result ? settledGame.result.toLowerCase() : "unknown"; 
      
      setFlipResult({
        outcome: gameResultOutcome,
        side: actualSide,
        wagered: currentFlipAttempt.wagerInEth,
        payout: settledGame.payout || "0",
        wagerType: wagerTypeForCheck,
      });
      
      // Set game result for XP system
      setLastProcessedGame(settledGame);
      
      setIsFlipping(false);
      setCurrentFlipAttempt(null);
      setError("");
      
      fetchEthBalance();
      fetchFlipskiBalance();
      fetchLeaderboardData();
      
      return true; // Found settlement
    }
    
    return false; // No settlement found
  }, [currentFlipAttempt, fetchGameHistoryForContract, fetchEthBalance, fetchFlipskiBalance, fetchLeaderboardData]);

  // Handle wager type change
  const handleWagerTypeChange = (newType) => {
    setWagerType(newType);
    setWager(newType === "ETH" ? "0.001" : "1000000");
    setError("");
    setFlipResult(null);
  };

  // Update button text based on state
  const buttonText = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (isConnecting) return "Connecting...";
    if (isApproving) return "Approving...";
    if (needsApproval && wagerType === "FLIPSKI") return "Approve FlipSki";
    if (isSubmittingTransaction) return "Confirming Request...";
    if (isFlipping) return "Flipping...Waiting on VRF";
    return "Degen Flip!";
  }, [isConnected, isConnecting, isApproving, needsApproval, wagerType, isSubmittingTransaction, isFlipping]);

  // Calculate potential earnings
  const potentialEarningsValue = useMemo(() => {
    if (!wager || isNaN(parseFloat(wager)) || parseFloat(wager) <= 0) return "0.00000";
    const wagerFloat = parseFloat(wager);
    const feePercentage = 0.1;
    const feeAmount = wagerFloat * feePercentage;
    const grossPayout = wagerFloat * 2;
    const netPayoutIfWin = grossPayout - feeAmount;
    return wagerType === "ETH" ? netPayoutIfWin.toFixed(5) : netPayoutIfWin.toFixed(0);
  }, [wager, wagerType]);

  const getSelectedSideText = () => {
    if (selectedSide === "heads") return "FLIP";
    if (selectedSide === "tails") return "SKI";
    return "";
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!showHistory) {
      setShowHistory(true);
    }
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  useEffect(() => {
    if (!isBrowser) return;
    
    if (walletAddress) {
      fetchEthBalance();
      fetchFlipskiBalance();
    }
  }, [walletAddress, fetchEthBalance, fetchFlipskiBalance]);

  useEffect(() => {
    if (!isBrowser) return;
    
    if (wagerType === "FLIPSKI") {
      checkTokenApproval();
    }
  }, [wager, wagerType, checkTokenApproval]);

  useEffect(() => {
    if (!isBrowser) return;
    
    if (walletAddress) {
      const fetchAndUpdateHistory = () => {
        if (!isSubmittingTransaction) {
          fetchGameHistory();
        }
      };
      fetchAndUpdateHistory();
      const interval = setInterval(fetchAndUpdateHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, fetchGameHistory, isSubmittingTransaction]);
  
  useEffect(() => {
    if (!isBrowser) return;
    
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  // FIXED: Use dedicated settlement checking instead of relying on gameHistory
  useEffect(() => {
    if (!isBrowser) return;
    
    if (currentFlipAttempt && currentFlipAttempt.gameId && isFlipping) {
      const checkSettlement = async () => {
        const found = await checkForGameSettlement();
        if (!found) {
          console.log(`SETTLEMENT_DEBUG: Game ${currentFlipAttempt.gameId} not settled yet, will check again in 5 seconds`);
        }
      };
      
      // Check immediately
      checkSettlement();
      
      // Then check every 5 seconds
      const interval = setInterval(checkSettlement, 5000);
      return () => clearInterval(interval);
    }
  }, [currentFlipAttempt, isFlipping, checkForGameSettlement]);

  useEffect(() => {
    if (!isBrowser) return;
    
    let timeoutId;
    if (isFlipping && currentFlipAttempt) {
      timeoutId = setTimeout(() => {
        if (isFlipping) {
          console.log(`TIMEOUT_DEBUG: Timeout reached for game ${currentFlipAttempt.gameId}`);
          setError("VRF result is taking a while. Check game history for updates.");
          setFlipResult({ 
            outcome: "unknown", 
            side: "unknown", 
            wagered: currentFlipAttempt.wagerInEth, 
            payout: "0",
            wagerType: currentFlipAttempt.wagerType || wagerType
          });
          setIsFlipping(false);
          setCurrentFlipAttempt(null);
        }
      }, 90000);
    }
    return () => clearTimeout(timeoutId);
  }, [isFlipping, currentFlipAttempt, wagerType]);

  const handleDegen = async () => {
    if (!isBrowser) return;
    
    setError("");
    setFlipResult(null);
    
    if (!isConnected) {
      setError("Connect wallet first.");
      return;
    }
    
    if (!selectedSide) {
      setError("Select FLIP (HEADS) or SKI (TAILS).");
      return;
    }

    // Check if approval is needed for ERC20
    if (wagerType === "FLIPSKI" && needsApproval) {
      await handleApproveToken();
      return;
    }

    const isOnCorrectChain = await ensureCorrectChain();
    if (!isOnCorrectChain) {
      return;
    }
    
    if (!publicClient) {
      setError("Client not initialized. Please refresh the page.");
      return;
    }
    
    const currentContract = getCurrentContract();
    
    let minWager, maxWager;
    try {
      if (!currentContract.abi) {
        setError("Contract ABI not available. Please refresh the page.");
        return;
      }
      
      const minWagerRaw = await publicClient.readContract({ 
        address: currentContract.address, 
        abi: currentContract.abi, 
        functionName: "minWager" 
      });
      const maxWagerRaw = await publicClient.readContract({ 
        address: currentContract.address, 
        abi: currentContract.abi, 
        functionName: "maxWager" 
      });
      
      if (wagerType === "ETH") {
        minWager = formatEther(minWagerRaw);
        maxWager = formatEther(maxWagerRaw);
      } else {
        minWager = formatUnits(minWagerRaw, FLIPSKI_TOKEN_DECIMALS);
        maxWager = formatUnits(maxWagerRaw, FLIPSKI_TOKEN_DECIMALS);
      }
    } catch (e) {
      console.error("Could not fetch wager limits", e);
      setError("Wager limits unavailable. Using defaults.");
      if (wagerType === "ETH") {
        minWager = "0.001";
        maxWager = "0.1";
      } else {
        minWager = "1000000";
        maxWager = "1000000000";
      }
    }
    
    if (!wager || parseFloat(wager) < parseFloat(minWager) || parseFloat(wager) > parseFloat(maxWager)) {
      setError(`Wager must be between ${minWager} and ${maxWager} ${wagerType}.`);
      return;
    }
    
    const walletClient = await getWalletClient();
    if (!walletClient) return;

    setIsSubmittingTransaction(true);
    const currentWagerForFlip = wager;
    const choiceAsNumber = selectedSide === "heads" ? 0 : 1; 

    try {
      let contractCallParams;
      
      if (wagerType === "ETH") {
        const wagerInWei = parseEther(currentWagerForFlip);
        contractCallParams = {
          address: currentContract.address,
          abi: currentContract.abi,
          functionName: "flip",
          args: [choiceAsNumber],
          value: wagerInWei,
          account: walletClient.account,
        };
      } else {
        const wagerInWei = parseUnits(currentWagerForFlip, FLIPSKI_TOKEN_DECIMALS);
        contractCallParams = {
          address: currentContract.address,
          abi: currentContract.abi,
          functionName: "flip",
          args: [choiceAsNumber, wagerInWei],
          account: walletClient.account,
        };
      }
      
      const flipTxHash = await walletClient.writeContract(contractCallParams);
      const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
      setIsSubmittingTransaction(false);

      // FIXED: Use the exact same parsing logic as the working version
      let parsedGameRequested = null;
      
      if (!currentContract.abi) {
        console.error("REQUEST_DEBUG: Contract ABI not available");
        setError("Error processing transaction. Check game history for updates.");
        return;
      }
      
      const gameRequestedEventAbi = currentContract.abi.find(
        (item) => item && item.name === "GameRequested" && item.type === "event"
      );
      
      if (!gameRequestedEventAbi) {
        console.error("REQUEST_DEBUG: GameRequested event ABI not found");
        setError("Error processing transaction. Check game history for updates.");
        return;
      }
      
      // Use the exact same log parsing logic as the working version
      for (const i in requestReceipt.logs) {
        const log = requestReceipt.logs[i];
        if (!log || !log.address || !currentContract.address) continue;
        
        if (log.address.toLowerCase() !== currentContract.address.toLowerCase()) {
            continue;
        }
        try {
          if (!log.data || !log.topics || !Array.isArray(log.topics)) continue;
          
          const decodedLog = decodeEventLog({ 
            abi: currentContract.abi, 
            data: log.data, 
            topics: log.topics 
          });
          
          if (decodedLog && decodedLog.eventName === "GameRequested") {
            if (decodedLog.args && 
                decodedLog.args.player && 
                decodedLog.args.gameId !== undefined && 
                decodedLog.args.wagerAmount !== undefined && 
                decodedLog.args.choice !== undefined) {
              if (decodedLog.args.player.toLowerCase() === walletAddress.toLowerCase()) {
                // FIXED: Use the exact same structure as the working version
                const formattedWager = wagerType === "ETH" 
                  ? formatEther(decodedLog.args.wagerAmount)
                  : formatUnits(decodedLog.args.wagerAmount, FLIPSKI_TOKEN_DECIMALS);
                
                parsedGameRequested = {
                  gameId: decodedLog.args.gameId.toString(),
                  wagerInEth: formattedWager, // Keep the same property name as working version
                  choiceAsNumber: Number(decodedLog.args.choice),
                  contractAddress: currentContract.address, // Add contract address for settlement checking
                  wagerType: wagerType, // Add wager type for display
                };
                break; 
              }
            }
          }
        } catch (e) {
          console.error(`REQUEST_DEBUG: Error decoding log at index ${i}:`, e);
        }
      }

      if (parsedGameRequested) {
        console.log(`REQUEST_DEBUG: Game requested:`, parsedGameRequested);
        setCurrentFlipAttempt(parsedGameRequested);
        setIsFlipping(true);
        setError("");
      } else {
        setError("Flip sent. Result will appear in history. Could not link for main display.");
        setFlipResult({ outcome: "unknown", side: "unknown", wagered: currentWagerForFlip, payout: "0", wagerType: wagerType });
      }

    } catch (err) {
      console.error("Error during flip transaction:", err);
      setError(err.shortMessage || err.message || "Flip transaction failed.");
      setFlipResult({ outcome: "error", side: "unknown", wagered: currentWagerForFlip, payout: "0", wagerType: wagerType });
      setIsSubmittingTransaction(false);
    } finally {
      if (walletAddress) {
        fetchEthBalance();
        fetchFlipskiBalance();
      }
    }
  };

  // If not in browser environment, return minimal content
  if (!isBrowser) {
    return <div className="coinflip-container">Loading...</div>;
  }

  return (
    <div className="coinflip-page">
      <div className="coinflip-container">
        <div className="coinflip-box">
          {walletAddress && (
            <LevelSystem walletAddress={walletAddress} gameResult={lastProcessedGame} />
          )}
          
          {walletAddress && (
            <div className="wallet-info-active">
              <p>Wallet : <span className="wallet-address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span></p>
              <p>Base Eth: <span className="balance-info">{parseFloat(ethBalance).toFixed(4)}</span></p>
              <p>$FlipSki: <span className="balance-info">{parseFloat(flipskiBalance).toFixed(0)}</span></p>
            </div>
          )}

          {userRelatedError && <p className="wallet-warning">Wallet Error: {userRelatedError.message}</p>}

          <div className="coin-display-area">
            {isFlipping ? (
              <div className="coin-flipping-animation">
                <img src={coinImage} alt="Flipping Coin" className="coin-image" />
              </div>
            ) : flipResult ? (
              <div className="flip-result-display">
                <img src={flipResult.side === "heads" ? headsImage : tailsImage} alt={flipResult.side} className="coin-image result-coin-image" />
                {flipResult.outcome === "win" && <p className="win-message">You Won! Wagered: {flipResult.wagered} {flipResult.wagerType}, Payout: {flipResult.payout} {flipResult.wagerType}</p>}
                {flipResult.outcome === "loss" && <p className="loss-message">You Lost. Wagered: {flipResult.wagered} {flipResult.wagerType}</p>}
                {flipResult.outcome === "unknown" && <p className="unknown-message">Outcome Unknown. Wagered: {flipResult.wagered} {flipResult.wagerType}. Check console.</p>}
                {flipResult.outcome === "error" && <p className="error-message-result">Flip Error. Wagered: {flipResult.wagered} {flipResult.wagerType}. Check console.</p>}
              </div>
            ) : (
              <div className="coin-placeholder">Make your wager and FLIPSKI!</div>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="controls-and-selection-display-area">
            <div className="coinflip-controls">
              {/* UPDATED: Wager Type control */}
              <div className="wager-type-control">
                <label className="control-label">Wager Type:</label>
                <div className="compact-wager-buttons">
                  <button 
                    className={wagerType === "ETH" ? "selected" : ""} 
                    onClick={() => handleWagerTypeChange("ETH")}
                  >
                    $ETH
                  </button>
                  <button 
                    className={wagerType === "FLIPSKI" ? "selected" : ""} 
                    onClick={() => handleWagerTypeChange("FLIPSKI")}
                  >
                    $FLIPSKI
                  </button>
                </div>
              </div>

              {/* UPDATED: Side Selection control */}
              <div className="side-selection-control">
                <label className="control-label">Flip or Ski:</label>
                <div className="side-selection-buttons">
                  <button className={selectedSide === "heads" ? "selected" : ""} onClick={() => setSelectedSide("heads")}>FLIP</button>
                  <button className={selectedSide === "tails" ? "selected" : ""} onClick={() => setSelectedSide("tails")}>SKI</button>
                </div>
              </div>
              <div className="wager-input">
                <input 
                  type="number" 
                  value={wager} 
                  onChange={(e) => setWager(e.target.value)} 
                  placeholder={`Enter wager in ${wagerType}`} 
                  step={wagerType === "ETH" ? "0.001" : "1000000"} 
                  min={presetWagers[0]} 
                />
                <div className="preset-wagers">
                  {presetWagers.map((amount) => (
                    <button key={amount} onClick={() => setWager(amount)}>
                      {wagerType === "ETH" ? amount : `${(parseFloat(amount) / 1000000).toFixed(0)}M`} {wagerType === "ETH" ? "ETH" : "FLIPSKI"}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                className="degen-button" 
                onClick={handleDegen} 
                disabled={!isConnected || isSubmittingTransaction || isFlipping || isConnecting || isApproving}
              >
                {buttonText}
              </button>
            </div>

            <div className="selected-coin-display">
              {selectedSide && (
                <img src={selectedSide === "heads" ? headsImage : tailsImage} alt={`${selectedSide} choice`} className="selected-choice-image" />
              )}
              {!selectedSide && !isFlipping && !flipResult && (
                   <div className="selected-choice-placeholder-text">Select: FLIP (H) or SKI (T)</div>
              )}
              <p className="preview-wager">Wager: {getSelectedSideText()} for {wager} {wagerType}</p>
              <p className="potential-earnings">Potential Payout: {potentialEarningsValue} {wagerType}</p>
            </div>
          </div>

          <div className="game-history">
            <div className="game-history-tabs">
              <button 
                onClick={() => handleTabChange("history")} 
                className={`game-history-tab ${activeTab === "history" ? "active-tab" : ""}`}
              >
                Last 10 FLIPSKI Wagers ({wagerType})
              </button>
              <button 
                onClick={() => handleTabChange("leaderboard")} 
                className={`game-history-tab ${activeTab === "leaderboard" ? "active-tab" : ""}`}
              >
                Leaderboards
              </button>
              <button onClick={toggleHistory} className="game-history-toggle">
                {showHistory ? "\u25B2" : "\u25BC"}
              </button>
            </div>
            
            {showHistory && activeTab === "history" && gameHistory.length > 0 && (
              <ul>
                {[...gameHistory]
                  .filter((game) => game.wagerType === wagerType)
                  .reverse()
                  .map((game) => (
                    <li key={game.gameId} className={game.won ? "win-history" : "loss-history"}>
                      Game #{game.gameId}: Result: {game.result === "Heads" ? "Flip" : "Ski"} — 
                      {game.won 
                        ? `✅ Won ${game.payout} ${game.wagerType}` 
                        : `❌ Loss (Payout: ${game.payout} ${game.wagerType})`}
                      {game.fulfillmentTxHash && (
                        <a 
                          href={`https://basescan.org/tx/${game.fulfillmentTxHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="history-tx-link"
                        >
                          (View VRF Tx )
                        </a>
                      )}
                    </li>
                  ))}
              </ul>
            )}

            {showHistory && activeTab === "history" && gameHistory.length === 0 && (
              <p>No wager history yet for {wagerType}.</p>
            )}
            
            {showHistory && activeTab === "leaderboard" && (
              <div className="leaderboard-container">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Top Flippers</th>
                      <th>Level</th>
                      <th>Total XP</th>
                      <th>W's</th>
                      <th>L's</th>
                      <th>W/L Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.length > 0 ? (
                      leaderboardData.map((user, index) => (
                        <tr key={index}>
                          <td>{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</td>
                          <td>{user.level}</td>
                          <td>{user.xp}</td>
                          <td>{user.wins}</td>
                          <td>{user.losses}</td>
                          <td>{user.wlRatio}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">No leaderboard data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinFlipPage;

