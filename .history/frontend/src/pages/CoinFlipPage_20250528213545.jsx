import React, { useState, useEffect, useCallback, useMemo } from "react";
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

const isBrowser = typeof window !== 'undefined' && window.document !== undefined;

const CoinFlipPage = () => {
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

  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: baseSepoliaChain,
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
  
  // Add function to check and switch chains before transactions
  const ensureCorrectChain = async () => {
    if (!isBrowser || !window.ethereum) {
      setError("Browser wallet not available");
      return false;
    }
    
    try {
      // Get current chain ID from the wallet
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainIdDecimal = parseInt(currentChainId, 16);
      
      // Check if already on the correct chain
      if (currentChainIdDecimal === baseSepoliaChain.id) {
        return true;
      }
      
      // Display error and prompt user to switch
      setError(`Please switch to Base Sepolia network in your wallet. Current network: Chain ID ${currentChainIdDecimal}`);
      
      // Attempt to switch the chain programmatically
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${baseSepoliaChain.id.toString(16)}` }],
        });
        
        // Verify the switch was successful
        const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const newChainIdDecimal = parseInt(newChainId, 16);
        
        if (newChainIdDecimal === baseSepoliaChain.id) {
          setError(""); // Clear error message
          return true;
        } else {
          setError(`Failed to switch to Base Sepolia. Please switch manually in your wallet.`);
          return false;
        }
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${baseSepoliaChain.id.toString(16)}`,
                  chainName: baseSepoliaChain.name,
                  nativeCurrency: baseSepoliaChain.nativeCurrency,
                  rpcUrls: [baseSepoliaChain.rpcUrls.default.http[0]],
                  blockExplorerUrls: [baseSepoliaChain.blockExplorers.default.url],
                },
              ],
            });
            
            // Check if adding and switching was successful
            const addedChainId = await window.ethereum.request({ method: 'eth_chainId' });
            const addedChainIdDecimal = parseInt(addedChainId, 16);
            
            if (addedChainIdDecimal === baseSepoliaChain.id) {
              setError(""); // Clear error message
              return true;
            } else {
              setError(`Failed to add and switch to Base Sepolia. Please switch manually in your wallet.`);
              return false;
            }
          } catch (addError) {
            setError(`Failed to add Base Sepolia network: ${addError.message}. Please add and switch manually.`);
            return false;
          }
        } else {
          setError(`Failed to switch to Base Sepolia: ${switchError.message}. Please switch manually.`);
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
      
      // Add try-catch around getLogs
      let logs = [];
      try {
        logs = await publicClient.getLogs({
          address: COINFLIP_CONTRACT_ADDRESS,
          event: gameSettledEventAbi,
          args: { player: walletAddress },
          fromBlock: "earliest",
          toBlock: "latest",
        });
      } catch (logsError) {
        console.error("Error fetching logs:", logsError);
        logs = []; // Ensure logs is an array even on error
      }
  
      // Add defensive checks in filter and map
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
          
          return {
            gameId: log.args.gameId.toString(),
            result: mappedResult, 
            payout: formatEther(payoutAmount),
            won: won,
            fulfillmentTxHash: log.transactionHash,
            vrfRequestId: log.args.vrfRequestId ? log.args.vrfRequestId.toString() : null,
          };
        })
        .reverse();
      
      setGameHistory(history.slice(0, 10));
    } catch (err) {
      console.error("HISTORY_DEBUG: Error fetching game history:", err);
      setGameHistory([]); // Set to empty array on error
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
      const interval = setInterval(fetchAndUpdateHistory, 10000);
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
        
        // Auto-update ETH balance and leaderboard data after game result
        fetchEthBalance();
        fetchLeaderboardData();
      }
    }
  }, [gameHistory, currentFlipAttempt, fetchEthBalance, fetchLeaderboardData]);  

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
    
    // Check and ensure correct chain before proceeding
    const isOnCorrectChain = await ensureCorrectChain();
    if (!isOnCorrectChain) {
      return; // Stop if not on correct chain
    }
    
    // Add defensive checks for publicClient
    if (!publicClient) {
      setError("Client not initialized. Please refresh the page.");
      return;
    }
    
    let minWagerEth, maxWagerEth;
    try {
      // Add defensive checks for ABI
      if (!FlipSkiBaseVRFABI || !FlipSkiBaseVRFABI.abi) {
        setError("Contract ABI not available. Please refresh the page.");
        return;
      }
      
      minWagerEth = formatEther(await publicClient.readContract({ 
        address: COINFLIP_CONTRACT_ADDRESS, 
        abi: FlipSkiBaseVRFABI.abi, 
        functionName: "minWager" 
      }));
      maxWagerEth = formatEther(await publicClient.readContract({ 
        address: COINFLIP_CONTRACT_ADDRESS, 
        abi: FlipSkiBaseVRFABI.abi, 
        functionName: "maxWager" 
      }));
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
      const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
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
  else if (isFlipping) buttonText = "Flipping...Waiting for VRF";

  // Render the main game UI
  return (
    <div className="coin-flip-container">
      <div className="game-section">
        <div className="coin-section">
          <div className="coin-container">
            {!flipResult && !isFlipping && (
              <img 
                src={coinImage} 
                alt="Coin" 
                className={`coin ${isFlipping ? 'flipping' : ''}`} 
              />
            )}
            
            {isFlipping && (
              <div className="flipping-animation">
                <img 
                  src={coinImage} 
                  alt="Flipping Coin" 
                  className="coin flipping" 
                />
              </div>
            )}
            
            {flipResult && (
              <div className={`result-container ${flipResult.outcome}`}>
                <img 
                  src={flipResult.side === "heads" ? headsImage : tailsImage} 
                  alt={flipResult.side === "heads" ? "Heads" : "Tails"} 
                  className="result-image" 
                />
                <div className="result-text">
                  {flipResult.outcome === "win" && (
                    <span className="win-text">WIN! +{flipResult.payout} ETH</span>
                  )}
                  {flipResult.outcome === "loss" && (
                    <span className="loss-text">LOSS! -{flipResult.wagered} ETH</span>
                  )}
                  {flipResult.outcome === "error" && (
                    <span className="error-text">ERROR!</span>
                  )}
                  {flipResult.outcome === "unknown" && (
                    <span className="unknown-text">PENDING...</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="side-selection">
            <button 
              className={`side-button ${selectedSide === "heads" ? "selected" : ""}`}
              onClick={() => setSelectedSide("heads")}
              disabled={isFlipping || isSubmittingTransaction}
            >
              <img src={headsImage} alt="Heads" className="side-image" />
              <span>FLIP</span>
            </button>
            <button 
              className={`side-button ${selectedSide === "tails" ? "selected" : ""}`}
              onClick={() => setSelectedSide("tails")}
              disabled={isFlipping || isSubmittingTransaction}
            >
              <img src={tailsImage} alt="Tails" className="side-image" />
              <span>SKI</span>
            </button>
          </div>
        </div>
        
        <div className="game-controls">
          <div className="wager-section">
            <div className="wager-input-container">
              <label htmlFor="wager-input">Wager (ETH):</label>
              <input
                id="wager-input"
                type="number"
                min="0.001"
                step="0.001"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                disabled={isFlipping || isSubmittingTransaction}
                className="wager-input"
              />
            </div>
            
            <div className="preset-wagers">
              {presetWagers.map((presetWager) => (
                <button
                  key={presetWager}
                  onClick={() => setWager(presetWager)}
                  disabled={isFlipping || isSubmittingTransaction}
                  className={`preset-wager-button ${wager === presetWager ? "selected" : ""}`}
                >
                  {presetWager} ETH
                </button>
              ))}
            </div>
          </div>
          
          <div className="potential-earnings">
            <span>Potential Win: {potentialEarningsValue} ETH</span>
            <span className="balance">Balance: {parseFloat(ethBalance).toFixed(5)} ETH</span>
          </div>
          
          <button
            onClick={handleDegen}
            disabled={!isConnected || isFlipping || isSubmittingTransaction || !selectedSide}
            className="flip-button"
          >
            {buttonText}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
      
      <div className="level-and-history">
        {walletAddress && (
          <div className="level-container">
            <LevelSystem walletAddress={walletAddress} gameResult={flipResult && flipResult.outcome !== "unknown" ? {
              gameId: currentFlipAttempt?.gameId || `manual-${Date.now()}`,
              won: flipResult.outcome === "win"
            } : null} />
          </div>
        )}
        
        <div className="history-section">
          <div className="history-header">
            <button onClick={toggleHistory} className="toggle-history-button">
              {showHistory ? "Hide History" : "Show History"}
            </button>
          </div>
          
          {showHistory && (
            <div className="history-content">
              <div className="history-tabs">
                <button 
                  className={`history-tab ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => handleTabChange("history")}
                >
                  Your History
                </button>
                <button 
                  className={`history-tab ${activeTab === "leaderboard" ? "active" : ""}`}
                  onClick={() => handleTabChange("leaderboard")}
                >
                  Leaderboard
                </button>
              </div>
              
              {activeTab === "history" ? (
                <div className="game-history">
                  {gameHistory.length === 0 ? (
                    <p className="no-history">No game history yet. Play a game!</p>
                  ) : (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Result</th>
                          <th>Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameHistory.map((game, index) => (
                          <tr key={index} className={game.won ? "win-row" : "loss-row"}>
                            <td>{game.result}</td>
                            <td>{game.won ? `+${game.payout} ETH` : "0 ETH"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div className="leaderboard">
                  {leaderboardData.length === 0 ? (
                    <p className="no-leaderboard">Loading leaderboard data...</p>
                  ) : (
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Address</th>
                          <th>Level</th>
                          <th>W/L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.slice(0, 10).map((user, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td className="address-cell">
                              {user.walletAddress.substring(0, 6)}...
                              {user.walletAddress.substring(user.walletAddress.length - 4)}
                            </td>
                            <td>{user.level}</td>
                            <td>{user.wlRatio}</td>
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
      </div>
    </div>
  );
};

export default CoinFlipPage;
