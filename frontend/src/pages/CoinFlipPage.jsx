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
  FLIPSKI_V2_CONTRACT_ADDRESS,
  FLIPSKI_TOKEN_ADDRESS,
  FLIPSKI_TOKEN_DECIMALS,
  ETH_ADDRESS,
  baseMainnet,
} from "../config";
import FlipSkiV2ABI from "../abis/FlipSkiV2.abi.json"; 
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
  const [selectedToken, setSelectedToken] = useState(null); // V2: Selected token object
  const [availableTokens, setAvailableTokens] = useState([]); // V2: Available tokens from contract
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

  // V2: Dynamic preset wagers based on selected token
  const presetWagers = useMemo(() => {
    if (!selectedToken) return ["0.001", "0.005", "0.01"];
    
    if (selectedToken.address === ETH_ADDRESS) {
      return ["0.001", "0.005", "0.01"];
    } else if (selectedToken.symbol === "FLIPSKI") {
      return ["1000000", "10000000", "100000000"]; // 1M, 10M, 100M FlipSki tokens
    } else {
      // For other tokens, use min wager as base
      const minWager = parseFloat(selectedToken.minWagerFormatted);
      return [
        minWager.toString(),
        (minWager * 10).toString(),
        (minWager * 100).toString()
      ];
    }
  }, [selectedToken]);

  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: baseMainnet,
      transport: http(),
    });
  }, []);

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

  // V2: Fetch available tokens from contract
  const fetchAvailableTokens = useCallback(async () => {
    if (!isBrowser || !publicClient) return;
    
    try {
      const tokensData = await publicClient.readContract({
        address: FLIPSKI_V2_CONTRACT_ADDRESS,
        abi: FlipSkiV2ABI.abi,
        functionName: "getActiveTokens",
      });
      
      if (tokensData && tokensData[0] && tokensData[1]) {
        const [addresses, configs] = tokensData;
        const processedTokens = addresses.map((address, index) => ({
          address,
          ...configs[index],
          minWagerFormatted: formatUnits(configs[index].minWager, configs[index].decimals),
          maxWagerFormatted: formatUnits(configs[index].maxWager, configs[index].decimals),
        })).filter(token => token.isActive && !token.isPaused);
        
        setAvailableTokens(processedTokens);
        
        // Set default token (ETH if available, otherwise first token)
        if (processedTokens.length > 0 && !selectedToken) {
          const ethToken = processedTokens.find(t => t.address === ETH_ADDRESS);
          if (ethToken) {
            setSelectedToken(ethToken);
            setWager("0.001"); // Default ETH wager
          } else {
            setSelectedToken(processedTokens[0]);
            setWager(processedTokens[0].minWagerFormatted);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching available tokens:", err);
    }
  }, [publicClient, selectedToken]);

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

  // V2: Check token approval for ERC20 tokens
  const checkTokenApproval = useCallback(async () => {
    if (!isBrowser || !selectedToken || selectedToken.address === ETH_ADDRESS || !walletAddress || !publicClient) return;
    
    try {
      const allowance = await publicClient.readContract({
        address: selectedToken.address,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletAddress, FLIPSKI_V2_CONTRACT_ADDRESS],
      });
      
      const wagerInWei = parseUnits(wager, selectedToken.decimals);
      setNeedsApproval(allowance < wagerInWei);
    } catch (err) {
      console.error("Error checking token approval:", err);
      setNeedsApproval(true);
    }
  }, [walletAddress, publicClient, wager, selectedToken]);

  // V2: Handle token approval
  const handleApproveToken = async () => {
    if (!isBrowser || !selectedToken || selectedToken.address === ETH_ADDRESS) return;
    
    setError("");
    setIsApproving(true);
    
    try {
      const walletClient = await getWalletClient();
      if (!walletClient) return;
      
      const isOnCorrectChain = await ensureCorrectChain();
      if (!isOnCorrectChain) return;
      
      const approvalAmount = parseUnits("1000000000", selectedToken.decimals);
      
      const approveTxHash = await walletClient.writeContract({
        address: selectedToken.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [FLIPSKI_V2_CONTRACT_ADDRESS, approvalAmount],
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

  // V2: Handle token selection change
  const handleTokenChange = (tokenAddress) => {
    const token = availableTokens.find(t => t.address === tokenAddress);
    if (token) {
      setSelectedToken(token);
      setWager(token.minWagerFormatted); // Set to minimum wager for new token
      setNeedsApproval(false); // Reset approval state
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

  // V2: Fetch game history from unified contract
  const fetchGameHistory = useCallback(async () => {
    if (!isBrowser || !publicClient || !walletAddress) return;
    
    try {
      const gameSettledEventAbi = FlipSkiV2ABI.abi.find(
        (item) => item && item.name === "GameSettled" && item.type === "event"
      );
      
      if (!gameSettledEventAbi) {
        console.error("HISTORY_DEBUG: GameSettled event ABI not found.");
        return;
      }
      
      let logs = [];
      try {
        logs = await publicClient.getLogs({
          address: FLIPSKI_V2_CONTRACT_ADDRESS,
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
          const won = log.args.playerWon;
          const tokenAddress = log.args.tokenAddress;
          
          // Find token info for formatting
          const token = availableTokens.find(t => t.address === tokenAddress);
          const isEth = tokenAddress === ETH_ADDRESS;
          const decimals = token ? token.decimals : (isEth ? 18 : 18);
          const symbol = token ? token.symbol : (isEth ? "ETH" : "TOKEN");
          
          const formattedPayout = formatUnits(payoutAmount, decimals);
          
          return {
            gameId: log.args.gameId.toString(),
            result: mappedResult,
            won: won,
            payout: formattedPayout,
            wagerType: symbol, // Use token symbol instead of hardcoded type
            tokenAddress: tokenAddress,
            fulfillmentTxHash: log.transactionHash,
          };
        })
        .sort((a, b) => parseInt(b.gameId) - parseInt(a.gameId));

      setGameHistory(history);
    } catch (error) {
      console.error("Error fetching game history:", error);
    }
  }, [publicClient, walletAddress, availableTokens]);

  // V2: Check for game settlement
  const checkForGameSettlement = useCallback(async () => {
    if (!currentFlipAttempt || !currentFlipAttempt.gameId || !publicClient) {
      return false;
    }

    try {
      const gameData = await publicClient.readContract({
        address: FLIPSKI_V2_CONTRACT_ADDRESS,
        abi: FlipSkiV2ABI.abi,
        functionName: "getGame",
        args: [BigInt(currentFlipAttempt.gameId)],
      });

      if (gameData && gameData.settled) {
        console.log(`SETTLEMENT_DEBUG: Game ${currentFlipAttempt.gameId} is settled:`, gameData);
        
        const won = gameData.payoutAmount > 0n;
        const resultSide = Number(gameData.result) === 0 ? "heads" : "tails";
        const token = availableTokens.find(t => t.address === gameData.tokenAddress);
        const decimals = token ? token.decimals : (gameData.tokenAddress === ETH_ADDRESS ? 18 : 18);
        const symbol = token ? token.symbol : (gameData.tokenAddress === ETH_ADDRESS ? "ETH" : "TOKEN");
        
        const formattedPayout = formatUnits(gameData.payoutAmount, decimals);
        
        setFlipResult({
          outcome: won ? "win" : "loss",
          side: resultSide,
          wagered: currentFlipAttempt.wagerInEth,
          payout: formattedPayout,
          wagerType: symbol
        });

        setLastProcessedGame({
          won: won,
          wagerAmount: currentFlipAttempt.wagerInEth,
          wagerType: symbol
        });

        setIsFlipping(false);
        setCurrentFlipAttempt(null);
        
        // Refresh game history
        setTimeout(() => {
          fetchGameHistory();
        }, 2000);

        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`SETTLEMENT_DEBUG: Error checking settlement for game ${currentFlipAttempt.gameId}:`, error);
      return false;
    }
  }, [currentFlipAttempt, publicClient, availableTokens, fetchGameHistory]);

  // V2: Calculate potential earnings
  const potentialEarningsValue = useMemo(() => {
    if (!wager || isNaN(parseFloat(wager)) || parseFloat(wager) <= 0) return "0.00000";
    const wagerFloat = parseFloat(wager);
    const feePercentage = 0.1;
    const feeAmount = wagerFloat * feePercentage;
    const grossPayout = wagerFloat * 2;
    const netPayoutIfWin = grossPayout - feeAmount;
    
    if (!selectedToken) return netPayoutIfWin.toFixed(5);
    
    // Format based on token decimals
    if (selectedToken.address === ETH_ADDRESS) {
      return netPayoutIfWin.toFixed(5);
    } else if (selectedToken.symbol === "FLIPSKI") {
      return netPayoutIfWin.toFixed(0);
    } else {
      return netPayoutIfWin.toFixed(2);
    }
  }, [wager, selectedToken]);

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

  // V2: Updated button text logic
  const buttonText = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    if (isConnecting) return "Connecting...";
    if (!selectedToken) return "Loading Tokens...";
    if (selectedToken.address !== ETH_ADDRESS && needsApproval) return `Approve ${selectedToken.symbol}`;
    if (isApproving) return "Approving...";
    if (isSubmittingTransaction) return "Submitting...";
    if (isFlipping) return "Flipping...";
    if (!selectedSide) return "Select FLIP or SKI";
    if (!wager || parseFloat(wager) <= 0) return "Enter Wager Amount";
    
    // Check wager limits
    if (selectedToken) {
      const wagerAmount = parseFloat(wager);
      const minWager = parseFloat(selectedToken.minWagerFormatted);
      const maxWager = parseFloat(selectedToken.maxWagerFormatted);
      
      if (wagerAmount < minWager) return `Min: ${selectedToken.minWagerFormatted} ${selectedToken.symbol}`;
      if (wagerAmount > maxWager) return `Max: ${selectedToken.maxWagerFormatted} ${selectedToken.symbol}`;
    }
    
    return `FLIPSKI for ${wager} ${selectedToken.symbol}`;
  }, [isConnected, isConnecting, selectedToken, needsApproval, isApproving, isSubmittingTransaction, isFlipping, selectedSide, wager]);

  // V2: Updated degen handler
  const handleDegen = async () => {
    if (!selectedToken || !selectedSide || !wager) {
      setError("Please select a token, side, and enter wager amount");
      return;
    }

    // Check if approval is needed for ERC20 tokens
    if (selectedToken.address !== ETH_ADDRESS && needsApproval) {
      await handleApproveToken();
      return;
    }

    setError("");
    setFlipResult(null);
    setIsSubmittingTransaction(true);

    try {
      const walletClient = await getWalletClient();
      if (!walletClient) return;

      const isOnCorrectChain = await ensureCorrectChain();
      if (!isOnCorrectChain) return;

      const choiceAsNumber = selectedSide === "heads" ? 0 : 1;
      const currentWagerForFlip = wager;

      let contractCallParams;
      
      if (selectedToken.address === ETH_ADDRESS) {
        // ETH game
        const wagerInWei = parseEther(currentWagerForFlip);
        contractCallParams = {
          address: FLIPSKI_V2_CONTRACT_ADDRESS,
          abi: FlipSkiV2ABI.abi,
          functionName: "flipCoin",
          args: [choiceAsNumber, ETH_ADDRESS, wagerInWei],
          value: wagerInWei,
          account: walletClient.account,
        };
      } else {
        // ERC20 game
        const wagerInWei = parseUnits(currentWagerForFlip, selectedToken.decimals);
        contractCallParams = {
          address: FLIPSKI_V2_CONTRACT_ADDRESS,
          abi: FlipSkiV2ABI.abi,
          functionName: "flipCoin",
          args: [choiceAsNumber, selectedToken.address, wagerInWei],
          account: walletClient.account,
        };
      }
      
      const flipTxHash = await walletClient.writeContract(contractCallParams);
      const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
      setIsSubmittingTransaction(false);

      // Parse GameRequested event
      let parsedGameRequested = null;
      
      const gameRequestedEventAbi = FlipSkiV2ABI.abi.find(
        (item) => item && item.name === "GameRequested" && item.type === "event"
      );
      
      if (!gameRequestedEventAbi) {
        console.error("REQUEST_DEBUG: GameRequested event ABI not found");
        setError("Error processing transaction. Check game history for updates.");
        return;
      }
      
      for (const i in requestReceipt.logs) {
        const log = requestReceipt.logs[i];
        if (!log || !log.address || !FLIPSKI_V2_CONTRACT_ADDRESS) continue;
        
        if (log.address.toLowerCase() !== FLIPSKI_V2_CONTRACT_ADDRESS.toLowerCase()) {
            continue;
        }
        try {
          if (!log.data || !log.topics || !Array.isArray(log.topics)) continue;
          
          const decodedLog = decodeEventLog({ 
            abi: FlipSkiV2ABI.abi, 
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
                const formattedWager = formatUnits(decodedLog.args.wagerAmount, selectedToken.decimals);
                
                parsedGameRequested = {
                  gameId: decodedLog.args.gameId.toString(),
                  wagerInEth: formattedWager,
                  choiceAsNumber: Number(decodedLog.args.choice),
                  contractAddress: FLIPSKI_V2_CONTRACT_ADDRESS,
                  wagerType: selectedToken.symbol,
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
        setFlipResult({ 
          outcome: "unknown", 
          side: "unknown", 
          wagered: currentWagerForFlip, 
          payout: "0", 
          wagerType: selectedToken.symbol 
        });
      }

    } catch (err) {
      console.error("Error during flip transaction:", err);
      setError(err.shortMessage || err.message || "Flip transaction failed.");
      setFlipResult({ 
        outcome: "error", 
        side: "unknown", 
        wagered: wager, 
        payout: "0", 
        wagerType: selectedToken ? selectedToken.symbol : "TOKEN" 
      });
      setIsSubmittingTransaction(false);
    } finally {
      if (walletAddress) {
        fetchEthBalance();
        fetchFlipskiBalance();
      }
    }
  };

  // Effects
  useEffect(() => {
    if (!isBrowser) return;
    
    if (walletAddress) {
      fetchEthBalance();
      fetchFlipskiBalance();
      fetchAvailableTokens(); // V2: Fetch available tokens
    }
  }, [walletAddress, fetchEthBalance, fetchFlipskiBalance, fetchAvailableTokens]);

  useEffect(() => {
    if (!isBrowser) return;
    
    if (selectedToken && selectedToken.address !== ETH_ADDRESS) {
      checkTokenApproval();
    }
  }, [wager, selectedToken, checkTokenApproval]);

  useEffect(() => {
    if (!isBrowser) return;
    
    if (walletAddress && availableTokens.length > 0) {
      const fetchAndUpdateHistory = () => {
        if (!isSubmittingTransaction) {
          fetchGameHistory();
        }
      };
      fetchAndUpdateHistory();
      const interval = setInterval(fetchAndUpdateHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, fetchGameHistory, isSubmittingTransaction, availableTokens]);
  
  useEffect(() => {
    if (!isBrowser) return;
    
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  useEffect(() => {
    if (!isBrowser) return;
    
    if (currentFlipAttempt && currentFlipAttempt.gameId && isFlipping) {
      const checkSettlement = async () => {
        const found = await checkForGameSettlement();
        if (!found) {
          console.log(`SETTLEMENT_DEBUG: Game ${currentFlipAttempt.gameId} not settled yet, will check again in 5 seconds`);
        }
      };
      
      checkSettlement();
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
            wagerType: currentFlipAttempt.wagerType 
          });
          setIsFlipping(false);
          setCurrentFlipAttempt(null);
        }
      }, 120000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isFlipping, currentFlipAttempt]);

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
              <p>$FlipSki : <span className="balance-info">{parseFloat(flipskiBalance).toFixed(0)}</span></p>
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
              {/* V2: Token Selection control */}
              <div className="wager-type-control">
                <label className="control-label">Select Token:</label>
                <div className="token-selector-dropdown">
                  <select 
                    value={selectedToken?.address || ''} 
                    onChange={(e) => handleTokenChange(e.target.value)}
                    className="token-select"
                  >
                    {availableTokens.map((token) => (
                      <option key={token.address} value={token.address}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Side Selection control */}
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
                  placeholder={selectedToken ? `Enter wager in ${selectedToken.symbol}` : 'Loading...'} 
                  step={selectedToken?.address === ETH_ADDRESS ? "0.001" : "1000000"} 
                  min={selectedToken?.minWagerFormatted || "0"} 
                  max={selectedToken?.maxWagerFormatted || "999999999"}
                />
                <div className="preset-wagers">
                  {presetWagers.map((amount) => (
                    <button key={amount} onClick={() => setWager(amount)}>
                      {selectedToken?.address === ETH_ADDRESS 
                        ? `${amount} ETH`
                        : selectedToken?.symbol === "FLIPSKI"
                        ? `${(parseFloat(amount) / 1000000).toFixed(0)}M ${selectedToken.symbol}`
                        : `${amount} ${selectedToken?.symbol || 'TOKEN'}`
                      }
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                className="degen-button" 
                onClick={handleDegen} 
                disabled={!isConnected || isSubmittingTransaction || isFlipping || isConnecting || isApproving || !selectedToken}
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
              {/* V2: Dynamic wager text */}
              <p className="preview-wager">
                Wager: {getSelectedSideText()} for {wager} {selectedToken?.symbol || 'TOKEN'}
              </p>
              <p className="potential-earnings">
                Potential Payout: {potentialEarningsValue} {selectedToken?.symbol || 'TOKEN'}
              </p>
            </div>
          </div>

          <div className="game-history">
            <div className="game-history-tabs">
              <button 
                onClick={() => handleTabChange("history")} 
                className={`game-history-tab ${activeTab === "history" ? "active-tab" : ""}`}
              >
                Last 10 FLIPSKI Wagers ({selectedToken?.symbol || 'ALL'})
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
                  .filter((game) => !selectedToken || game.wagerType === selectedToken.symbol)
                  .reverse()
                  .slice(0, 10)
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
              <p>No wager history yet for {selectedToken?.symbol || 'any token'}.</p>
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

