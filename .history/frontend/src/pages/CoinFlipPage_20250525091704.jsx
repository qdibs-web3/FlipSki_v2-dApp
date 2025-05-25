import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWallet } from "../context/WalletProvider";
import {
  createPublicClient,
  http,
  createWalletClient,
  custom,
  parseEther,
  formatEther,
  decodeEventLog,
} from "viem";
import {
  COINFLIP_CONTRACT_ADDRESS,
  baseSepoliaChain,
} from "../config";
import FlipSkiBaseVRFABI from "../abis/FlipSkiBaseVRF.abi.json"; 
import coinImage from "../assets/flipski1.gif";
import headsImage from "../assets/flip1.png";
import tailsImage from "../assets/ski1.png";
import "../styles/CoinFlipPage.css";
import LevelSystem from "../components/LevelSystem";

// Enhanced SSR safety check
const isBrowser = typeof window !== 'undefined' && window.document !== undefined;

const CoinFlipPage = () => {
  // Use refs to prevent undefined values during hydration
  const initializedRef = useRef(false);
  
  const {
    walletAddress,
    userRelatedError,
    isConnecting,
    isConnected,
    activeWalletInstance, // Add this line to get access to the signer
    connectionStatus
  } = useWallet();

  const [selectedSide, setSelectedSide] = useState(null);
  const [wager, setWager] = useState("0.001");
  const [isFlipping, setIsFlipping] = useState(false); 
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false); 
  const [flipResult, setFlipResult] = useState(null); 
  const [error, setError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [gameHistory, setGameHistory] = useState([]);
  const presetWagers = ["0.001", "0.005", "0.01"];
  const [showHistory, setShowHistory] = useState(false);
  const [currentFlipAttempt, setCurrentFlipAttempt] = useState(null);
  const [activeTab, setActiveTab] = useState("history"); // "history" or "leaderboard"
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [networkStatus, setNetworkStatus] = useState("unknown");

  // Only create client if in browser environment with enhanced error handling
  const publicClient = useMemo(() => {
    if (!isBrowser) return null;
    
    try {
      return createPublicClient({
        chain: baseSepoliaChain,
        transport: http({
          timeout: 15000, // Increase timeout for slow networks
          fetchOptions: {
            cache: "no-store",
          },
          retryCount: 3, // Add automatic retries
          retryDelay: 1000, // Start with 1s delay between retries
        }),
      });
    } catch (error) {
      console.error("Error creating public client:", error);
      setError("Failed to initialize blockchain connection. Please refresh the page.");
      return null;
    }
  }, []);

  // Add network status monitoring
  useEffect(() => {
    if (!isBrowser) return;
    
    const checkNetworkStatus = async () => {
      if (!publicClient) {
        setNetworkStatus("unavailable");
        return;
      }
      
      try {
        // Try a simple request to check network status
        await publicClient.getChainId();
        setNetworkStatus("connected");
      } catch (error) {
        console.error("Network check failed:", error);
        setNetworkStatus("disconnected");
        // Set a user-friendly error message
        setError("Network connection to Base Sepolia testnet is unavailable. Some features may not work correctly.");
      }
    };
    
    // Check immediately and then periodically
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 30000);
    
    return () => clearInterval(interval);
  }, [publicClient]);

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
    
    // Add a check for window existence first (important for SSR/Vercel)
    if (typeof window === 'undefined' || typeof window.ethereum === "undefined") {
      console.error("CoinFlipPage: window.ethereum is not available. MetaMask or compatible provider not found.");
      setError("MetaMask (or a compatible EIP-1193 provider) not found. Please install MetaMask.");
      return null;
    }
    
    try {
      // Add defensive check for ethereum object
      const provider = window.ethereum;
      if (!provider) {
        throw new Error("Ethereum provider is undefined");
      }
      
      return createWalletClient({
        account: walletAddress,
        chain: baseSepoliaChain,
        transport: custom(provider),
      });
    } catch (err) {
      console.error("CoinFlipPage: Error creating wallet client with window.ethereum:", err);
      setError("Error initializing wallet client. Ensure your wallet is compatible and try again.");
      return null;
    }
  }, [walletAddress]);
  

  const fetchEthBalance = useCallback(async () => {
    if (!isBrowser) return; // Skip during SSR
    
    if (walletAddress && publicClient) {
      try {
        const balance = await publicClient.getBalance({ address: walletAddress });
        setEthBalance(formatEther(balance));
      } catch (err) {
        console.error("Error fetching ETH balance:", err);
      }
    }
  }, [walletAddress, publicClient]);

  const fetchLeaderboardData = useCallback(async () => {
    if (!isBrowser) return; // Skip during SSR
    
    try {
      // Determine the base URL dynamically based on environment with SSR safety
      const baseUrl = isBrowser 
        ? (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001')
        : '/api'; // Fallback for SSR
      
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

  const fetchGameHistory = useCallback(async () => {
    if (!isBrowser) return; // Skip during SSR
    if (!publicClient || !walletAddress) return;
    
    try {
      // Add defensive checks for ABI
      if (!FlipSkiBaseVRFABI || !FlipSkiBaseVRFABI.abi) {
        console.error("HISTORY_DEBUG: FlipSkiBaseVRFABI or its abi property is undefined");
        return;
      }
      
      const gameSettledEventAbi = FlipSkiBaseVRFABI.abi.find(
        (item) => item && item.name === "GameSettled" && item.type === "event"
      );
      
      if (!gameSettledEventAbi) {
        console.error("HISTORY_DEBUG: GameSettled event ABI not found.");
        return;
      }
      
      // Add try-catch around getLogs with network error handling
      let logs = [];
      try {
        // Add timeout and retry logic for network requests
        const fetchWithTimeout = async (retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              return await publicClient.getLogs({
                address: COINFLIP_CONTRACT_ADDRESS,
                event: gameSettledEventAbi,
                args: { player: walletAddress },
                fromBlock: "earliest",
                toBlock: "latest",
              });
            } catch (error) {
              // Check if this is a network error or service unavailable
              if (error.message && (
                  error.message.includes("503") || 
                  error.message.includes("Service Unavailable") ||
                  error.message.includes("network") ||
                  error.message.includes("timeout")
                )) {
                console.warn(`Network error fetching logs (attempt ${i+1}/${retries}):`, error);
                if (i < retries - 1) {
                  // Wait before retrying
                  await new Promise(resolve => setTimeout(resolve, delay));
                  // Increase delay for next retry (exponential backoff)
                  delay *= 1.5;
                  continue;
                }
              }
              // For non-network errors or if we've exhausted retries, rethrow
              throw error;
            }
          }
          // If we get here, all retries failed
          throw new Error("Failed to fetch logs after multiple attempts");
        };
        
        logs = await fetchWithTimeout();
      } catch (logsError) {
        console.error("Error fetching logs:", logsError);
        logs = []; // Ensure logs is an array even on error
        // Set a user-friendly error message
        setError("Unable to fetch game history. The network may be unavailable. Please try again later.");
      }
  
      // Add defensive checks in filter and map
      const history = Array.isArray(logs) ? logs
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
          
          return {
            gameId: log.args.gameId.toString(),
            result: mappedResult, 
            payout: formatEther(payoutAmount),
            won: won,
            fulfillmentTxHash: log.transactionHash,
            vrfRequestId: log.args.vrfRequestId ? log.args.vrfRequestId.toString() : null,
          };
        })
        .reverse() : [];
      
      setGameHistory(history.slice(0, 10));
    } catch (err) {
      console.error("HISTORY_DEBUG: Error fetching game history:", err);
      setGameHistory([]); // Set to empty array on error
      setError("Error loading game history. Please try again later.");
    }
  }, [publicClient, walletAddress]);
  

  useEffect(() => {
    if (!isBrowser) return; // Skip during SSR
    
    if (walletAddress) {
      fetchEthBalance();
    }
  }, [walletAddress, fetchEthBalance]);

  useEffect(() => {
    if (!isBrowser) return; // Skip during SSR
    
    if (walletAddress) {
      const fetchAndUpdateHistory = () => {
        if (!isSubmittingTransaction) {
          fetchGameHistory();
        }
      };
      fetchAndUpdateHistory();
      const interval = setInterval(fetchAndUpdateHistory, 15000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, fetchGameHistory, isSubmittingTransaction]);
  
  // Fetch leaderboard data when component mounts and periodically
  useEffect(() => {
    if (!isBrowser) return; // Skip during SSR
    
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  useEffect(() => {
    if (!isBrowser) return; // Skip during SSR
    
    if (currentFlipAttempt && currentFlipAttempt.gameId && 
        gameHistory && Array.isArray(gameHistory) && gameHistory.length > 0) {
      const settledGame = gameHistory.find(game => 
        game && game.gameId && game.gameId === currentFlipAttempt.gameId
      );
      if (settledGame) {
        const gameResultOutcome = settledGame.won ? "win" : "loss";
        const actualSide = settledGame.result ? settledGame.result.toLowerCase() : "unknown"; 
        setFlipResult({
          outcome: gameResultOutcome,
          side: actualSide,
          wagered: currentFlipAttempt.wagerInEth,
          payout: settledGame.payout || "0",
        });
        setIsFlipping(false);
        setCurrentFlipAttempt(null);
        setError("");
      }
    }
  }, [gameHistory, currentFlipAttempt]);
  

  useEffect(() => {
    if (!isBrowser) return; // Skip during SSR
    
    let timeoutId;
    if (isFlipping && currentFlipAttempt) {
      timeoutId = setTimeout(() => {
        if (isFlipping) {
          // console.log("MAIN_DISPLAY_DEBUG: Timeout reached for VRF fulfillment.");
          setError("VRF result is taking a while. Check game history for updates.");
          setFlipResult({ outcome: "unknown", side: "unknown", wagered: currentFlipAttempt.wagerInEth, payout: "0" });
          setIsFlipping(false);
          setCurrentFlipAttempt(null);
        }
      }, 90000);
    }
    return () => clearTimeout(timeoutId);
  }, [isFlipping, currentFlipAttempt]);

  // Ensure initialization only happens once in browser
  useEffect(() => {
    if (isBrowser && !initializedRef.current) {
      initializedRef.current = true;
      console.log("CoinFlipPage: Initialized in browser environment");
    }
  }, []);

  const handleDegen = async () => {
    if (!isBrowser) return; // Skip during SSR
    
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
    
    // Add defensive checks for publicClient
    if (!publicClient) {
      setError("Client not initialized. Please refresh the page.");
      return;
    }
    
    // Check network status before proceeding
    if (networkStatus !== "connected") {
      setError("Network connection to Base Sepolia testnet is unavailable. Please try again later.");
      return;
    }
    
    let minWagerEth, maxWagerEth;
    try {
      // Add defensive checks for ABI
      if (!FlipSkiBaseVRFABI || !FlipSkiBaseVRFABI.abi) {
        setError("Contract ABI not available. Please refresh the page.");
        return;
      }
      
      // Add timeout and retry for contract reads
      const readContractWithRetry = async (functionName, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await publicClient.readContract({ 
              address: COINFLIP_CONTRACT_ADDRESS, 
              abi: FlipSkiBaseVRFABI.abi, 
              functionName 
            });
          } catch (error) {
            console.warn(`Error reading contract ${functionName} (attempt ${i+1}/${retries}):`, error);
            if (i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 1.5;
              continue;
            }
            throw error;
          }
        }
        throw new Error(`Failed to read contract ${functionName} after multiple attempts`);
      };
      
      minWagerEth = formatEther(await readContractWithRetry("minWager"));
      maxWagerEth = formatEther(await readContractWithRetry("maxWager"));
    } catch (e) {
      console.error("Could not fetch wager limits", e);
      setError("Wager limits unavailable. Using defaults.");
      minWagerEth = "0.001";
      maxWagerEth = "0.1";
    }
    if (!wager || parseFloat(wager) < parseFloat(minWagerEth) || parseFloat(wager) > parseFloat(maxWagerEth)) {
      setError(`Wager must be between ${minWagerEth} and ${maxWagerEth} ETH.`);
      return;
    }
    const walletClient = await getWalletClient();
    if (!walletClient) return;

    setIsSubmittingTransaction(true);
    const currentWagerForFlipEth = wager;
    const choiceAsNumber = selectedSide === "heads" ? 0 : 1; 

    try {
      const wagerInWei = parseEther(currentWagerForFlipEth);
      const contractCallParams = {
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: FlipSkiBaseVRFABI.abi,
        functionName: "flip",
        args: [choiceAsNumber],
        value: wagerInWei,
        account: walletClient.account,
      };
      const flipTxHash = await walletClient.writeContract(contractCallParams);
      // console.log("REQUEST_DEBUG: Flip request transaction sent:", flipTxHash);
      
      // Add timeout and retry for transaction receipt
      const getReceiptWithRetry = async (hash, retries = 3, delay = 2000) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await publicClient.waitForTransactionReceipt({ hash });
          } catch (error) {
            console.warn(`Error getting transaction receipt (attempt ${i+1}/${retries}):`, error);
            if (i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 1.5;
              continue;
            }
            throw error;
          }
        }
        throw new Error("Failed to get transaction receipt after multiple attempts");
      };
      
      const requestReceipt = await getReceiptWithRetry(flipTxHash);
      // console.log("REQUEST_DEBUG: Flip request receipt received:", requestReceipt);
      setIsSubmittingTransaction(false);

      let parsedGameRequested = null;
      // Add defensive check for ABI
      if (!FlipSkiBaseVRFABI || !FlipSkiBaseVRFABI.abi) {
        console.error("REQUEST_DEBUG: FlipSkiBaseVRFABI or its abi property is undefined");
        setError("Error processing transaction. Check game history for updates.");
        return;
      }
      
      const gameRequestedEventAbi = FlipSkiBaseVRFABI.abi.find(
        (item) => item && item.name === "GameRequested" && item.type === "event"
      );
      
      if (!gameRequestedEventAbi) {
        console.error("REQUEST_DEBUG: GameRequested event ABI not found");
        setError("Error processing transaction. Check game history for updates.");
        return;
      }
      
      // Removed debug logs for brevity, can be re-added if needed
      for (const i in requestReceipt.logs) {
        const log = requestReceipt.logs[i];
        if (!log || !log.address || !COINFLIP_CONTRACT_ADDRESS) continue;
        
        if (log.address.toLowerCase() !== COINFLIP_CONTRACT_ADDRESS.toLowerCase()) {
            continue;
        }
        try {
          if (!log.data || !log.topics || !Array.isArray(log.topics)) continue;
          
          const decodedLog = decodeEventLog({ 
            abi: FlipSkiBaseVRFABI.abi, 
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
                parsedGameRequested = {
                  gameId: decodedLog.args.gameId.toString(),
                  wagerInEth: formatEther(decodedLog.args.wagerAmount),
                  choiceAsNumber: Number(decodedLog.args.choice),
                };
                break; 
              }
            }
          }
        } catch (e) {
          // console.error(`REQUEST_DEBUG: Error decoding log at index ${i} (from our contract):`, e, "Log data:", log);
        }
      }

      if (parsedGameRequested) {
        setCurrentFlipAttempt(parsedGameRequested);
        setIsFlipping(true);
        setError("");
      } else {
        setError("Flip sent. Result will appear in history. Could not link for main display.");
        setFlipResult({ outcome: "unknown", side: "unknown", wagered: currentWagerForFlipEth, payout: "0" });
      }

    } catch (err) {
      console.error("Error during flip transaction:", err);
      setError(err.shortMessage || err.message || "Flip transaction failed.");
      setFlipResult({ outcome: "error", side: "unknown", wagered: currentWagerForFlipEth, payout: "0" });
      setIsSubmittingTransaction(false);
    } finally {
      if (walletAddress) {
        fetchEthBalance();
      }
    }
  };

  const potentialEarningsValue = useMemo(() => {
    if (!wager || isNaN(parseFloat(wager)) || parseFloat(wager) <= 0) return "0.00000";
    const wagerFloat = parseFloat(wager);
    const feePercentage = 0.1;
    const feeAmount = wagerFloat * feePercentage;
    const grossPayout = wagerFloat * 2;
    const netPayoutIfWin = grossPayout - feeAmount;
    return netPayoutIfWin.toFixed(5);
  }, [wager]);

  const toggleHistory = () => setShowHistory(!showHistory);
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!showHistory) {
      setShowHistory(true);
    }
  };

  const getSelectedSideText = () => {
    if (selectedSide === "heads") return "FLIP";
    if (selectedSide === "tails") return "SKI";
    return "";
  };

  let buttonText = "Degen Flip!";
  if (isConnecting) buttonText = "Connecting Wallet...";
  else if (isSubmittingTransaction) buttonText = "Confirming Request...";
  else if (isFlipping) buttonText = "Flipping...Waiting on VRF";

  // Track the last game result for XP updates
  const [lastProcessedGame, setLastProcessedGame] = useState(null);

  // Early return with fallback UI if network is unavailable
  if (networkStatus === "disconnected") {
    return (
      <div className="network-error-container">
        <h2>Network Connection Issue</h2>
        <p>We're having trouble connecting to the Base Sepolia testnet. This could be due to:</p>
        <ul>
          <li>Temporary testnet outage</li>
          <li>Network connectivity issues</li>
          <li>High network congestion</li>
        </ul>
        <p>Please try again later or check the network status at <a href="https://status.base.org" target="_blank" rel="noopener noreferrer">Base Status Page</a>.</p>
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }

  // Rest of the component render code remains the same
  return (
    <div className="coin-flip-container">
      {/* Network status warning */}
      {networkStatus !== "connected" && (
        <div className="network-status-warning">
          {networkStatus === "disconnected" ? 
            "⚠️ Network connection unavailable. Some features may not work." : 
            networkStatus === "unavailable" ? 
            "⚠️ Network client not initialized." : 
            ""}
        </div>
      )}
      
      <div className="coin-flip-game">
        <div className="game-header">
          <div className="balance-display">
            <span>Balance: {parseFloat(ethBalance).toFixed(4)} ETH</span>
          </div>
        </div>
        
        <div className="coin-container">
          {isFlipping ? (
            <div className="flipping-coin">
              <img src={coinImage} alt="Flipping Coin" className="coin-image flipping" />
            </div>
          ) : flipResult ? (
            <div className={`result-coin ${flipResult.outcome}`}>
              <img 
                src={flipResult.side === "heads" ? headsImage : tailsImage} 
                alt={flipResult.side === "heads" ? "Heads" : "Tails"} 
                className="coin-image" 
              />
              <div className="result-overlay">
                {flipResult.outcome === "win" ? "WIN!" : flipResult.outcome === "loss" ? "LOSS" : "?"}
              </div>
            </div>
          ) : (
            <div className="static-coin">
              <img src={coinImage} alt="Coin" className="coin-image" />
            </div>
          )}
        </div>
        
        <div className="side-selection">
          <button 
            className={`side-button ${selectedSide === "heads" ? "selected" : ""}`}
            onClick={() => setSelectedSide("heads")}
            disabled={isFlipping || isSubmittingTransaction}
          >
            FLIP (HEADS)
          </button>
          <button 
            className={`side-button ${selectedSide === "tails" ? "selected" : ""}`}
            onClick={() => setSelectedSide("tails")}
            disabled={isFlipping || isSubmittingTransaction}
          >
            SKI (TAILS)
          </button>
        </div>
        
        <div className="wager-section">
          <div className="wager-input-container">
            <label htmlFor="wager-input">Wager (ETH):</label>
            <input
              id="wager-input"
              type="number"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              min="0.001"
              step="0.001"
              disabled={isFlipping || isSubmittingTransaction}
            />
          </div>
          
          <div className="preset-wagers">
            {presetWagers.map((presetWager) => (
              <button
                key={presetWager}
                className={`preset-wager-button ${wager === presetWager ? "selected" : ""}`}
                onClick={() => setWager(presetWager)}
                disabled={isFlipping || isSubmittingTransaction}
              >
                {presetWager} ETH
              </button>
            ))}
          </div>
        </div>
        
        <div className="potential-earnings">
          <span>Potential Earnings: {potentialEarningsValue} ETH</span>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="flip-button-container">
          <button 
            className="flip-button"
            onClick={handleDegen}
            disabled={isFlipping || isSubmittingTransaction || !isConnected}
          >
            {buttonText}
          </button>
        </div>
        
        <div className="game-details">
          {selectedSide && (
            <div className="selection-display">
              Your Selection: {getSelectedSideText()}
            </div>
          )}
          
          {flipResult && (
            <div className="result-details">
              <div>Result: {flipResult.side === "heads" ? "FLIP" : "SKI"}</div>
              <div>Wagered: {flipResult.wagered} ETH</div>
              {flipResult.outcome === "win" && (
                <div>Payout: {flipResult.payout} ETH</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="game-history-section">
        <button className="history-toggle" onClick={toggleHistory}>
          {showHistory ? "Hide History & Leaderboard" : "Show History & Leaderboard"}
        </button>
        
        {showHistory && (
          <div className="history-container">
            <div className="history-tabs">
              <button 
                className={`tab-button ${activeTab === "history" ? "active" : ""}`}
                onClick={() => handleTabChange("history")}
              >
                Your History
              </button>
              <button 
                className={`tab-button ${activeTab === "leaderboard" ? "active" : ""}`}
                onClick={() => handleTabChange("leaderboard")}
              >
                Leaderboard
              </button>
            </div>
            
            {activeTab === "history" ? (
              <div className="game-history">
                <h3>Your Recent Games</h3>
                {gameHistory.length === 0 ? (
                  <p>No game history yet. Start flipping!</p>
                ) : (
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Result</th>
                        <th>Outcome</th>
                        <th>Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameHistory.map((game, index) => (
                        <tr key={index} className={game.won ? "win-row" : "loss-row"}>
                          <td>{game.result}</td>
                          <td>{game.won ? "WIN" : "LOSS"}</td>
                          <td>{game.won ? `${game.payout} ETH` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="leaderboard">
                <h3>Top Players</h3>
                {leaderboardData.length === 0 ? (
                  <p>Loading leaderboard data...</p>
                ) : (
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Level</th>
                        <th>XP</th>
                        <th>Wins</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((player, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{player.address.substring(0, 6)}...{player.address.substring(player.address.length - 4)}</td>
                          <td>{player.level}</td>
                          <td>{player.xp}</td>
                          <td>{player.wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <LevelSystem />
    </div>
  );
};

export default CoinFlipPage;
