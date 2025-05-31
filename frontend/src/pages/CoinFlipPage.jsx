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
import coinImage from "../assets/flipski2.gif";
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

  const [timedOutGameIds, setTimedOutGameIds] = useState([]);
  // Modify your timeout handler
  useEffect(() => {
    if (!isBrowser) return; // Skip during SSR
    
    let timeoutId;
    if (isFlipping && currentFlipAttempt) {
      timeoutId = setTimeout(() => {
        if (isFlipping) {
          try {
            // Wrap in try-catch to prevent any errors from breaking the UI
            setError("VRF result is taking a while. Check game history for updates.");
            setFlipResult({ outcome: "unknown", side: "unknown", wagered: currentFlipAttempt.wagerInEth, payout: "0" });
            setIsFlipping(false);
            
            // Instead of nullifying currentFlipAttempt, track its ID
            if (currentFlipAttempt.gameId) {
              setTimedOutGameIds(prev => [...prev, currentFlipAttempt.gameId]);
            }
            setCurrentFlipAttempt(null);
          } catch (err) {
            console.error("Error handling VRF timeout:", err);
          }
        }
      }, 90000);
    }
    return () => clearTimeout(timeoutId);
  }, [isFlipping, currentFlipAttempt]);

  // Add this effect to check for completed timed-out games
  useEffect(() => {
    if (!isBrowser || !gameHistory.length || !timedOutGameIds.length) return;
    
    // Check if any timed-out games have completed
    const completedTimedOutGame = gameHistory.find(game => 
      timedOutGameIds.includes(game.gameId)
    );
    
    if (completedTimedOutGame) {
      // Update lastProcessedGame with this result
      setLastProcessedGame(completedTimedOutGame);
      
      // Remove this game ID from the timed-out list
      setTimedOutGameIds(prev => prev.filter(id => id !== completedTimedOutGame.gameId));
    }
  }, [gameHistory, timedOutGameIds]);

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
  else if (isFlipping) buttonText = "Flipping...Waiting on VRF";

    // Track the last game result for XP updates
  const [lastProcessedGame, setLastProcessedGame] = useState(null);

  // Update lastProcessedGame when a new game result is available
  useEffect(() => {
    if (!isBrowser) return; // Skip during SSR
    
    if (gameHistory.length > 0 && (!lastProcessedGame || lastProcessedGame.gameId !== gameHistory[0].gameId)) {
      setLastProcessedGame(gameHistory[0]);
    }
  }, [gameHistory]);

  // If not in browser environment, return minimal content
  if (!isBrowser) {
    return <div className="coinflip-container">Loading...</div>;
  }

  useEffect(() => {
    console.log("Wallet Connection Debug:", {
      walletAddress,
      isConnected,
      signer: !!activeWalletInstance,
      connectionStatus
    });
  }, [walletAddress, isConnected, activeWalletInstance, connectionStatus]);
  

  return (
    <div className="coinflip-container">
      <div className="coinflip-box">
      {walletAddress && (
        <LevelSystem walletAddress={walletAddress} gameResult={lastProcessedGame} />
      )}

        {walletAddress && (
          <div className="wallet-info-active">
            <p>Wallet : <span className="wallet-address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span></p>
            <p>Balance: <span className="balance-info">{parseFloat(ethBalance).toFixed(4)} ETH</span></p>
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
              {flipResult.outcome === "win" && <p className="win-message">You Won! Wagered: {flipResult.wagered} ETH, Payout: {flipResult.payout} ETH</p>}
              {flipResult.outcome === "loss" && <p className="loss-message">You Lost. Wagered: {flipResult.wagered} ETH</p>}
              {flipResult.outcome === "unknown" && <p className="unknown-message">Outcome Unknown. Wagered: {flipResult.wagered} ETH. Check console.</p>}
              {flipResult.outcome === "error" && <p className="error-message-result">Flip Error. Wagered: {flipResult.wagered} ETH. Check console.</p>}
            </div>
          ) : (
            <div className="coin-placeholder">Make your wager and FLIPSKI!</div>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="controls-and-selection-display-area">
          <div className="coinflip-controls">
            <div className="side-selection">
              <button className={selectedSide === "heads" ? "selected" : ""} onClick={() => setSelectedSide("heads")}>FLIP</button>
              <button className={selectedSide === "tails" ? "selected" : ""} onClick={() => setSelectedSide("tails")}>SKI</button>
            </div>
            <div className="wager-input">
              <input type="number" value={wager} onChange={(e) => setWager(e.target.value)} placeholder="Enter wager in ETH" step="0.001" min={presetWagers[0]} />
              <div className="preset-wagers">
                {presetWagers.map((amount) => (<button key={amount} onClick={() => setWager(amount)}>{amount} ETH</button>))}
              </div>
            </div>
            <button className="degen-button" onClick={handleDegen} disabled={!isConnected || isSubmittingTransaction || isFlipping || isConnecting}>
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
            <p className="preview-wager">Wager: {getSelectedSideText()} for {wager} ETH</p>
            <p className="potential-earnings">Potential Payout: {potentialEarningsValue} ETH</p>
          </div>
        </div>

        {/* User's requested JSX for game history with VRF link and corrected logic */}
        <div className="game-history">
          <div className="game-history-tabs">
            <button 
              onClick={() => handleTabChange("history")} 
              className={`game-history-tab ${activeTab === "history" ? "active-tab" : ""}`}
            >
              Last 10 FLIPSKI Wagers
            </button>
            <button 
              onClick={() => handleTabChange("leaderboard")} 
              className={`game-history-tab ${activeTab === "leaderboard" ? "active-tab" : ""}`}
            >
              Leaderboards
            </button>
            <button onClick={toggleHistory} className="game-history-toggle">
              {showHistory ? "\u25B2" : "\u25BC"} {/* Unicode for up/down triangles */}
            </button>
          </div>
          
          {showHistory && activeTab === "history" && gameHistory.length > 0 && (
            <ul>
              {gameHistory.map((game) => (
                <li key={game.gameId} className={game.won ? "win-history" : "loss-history"}>
                  Game #{game.gameId}: Result: {game.result} — {game.won ? `✅ Won ${game.payout} ETH` : `❌ Loss (Payout: ${game.payout} ETH)`}
                  {game.fulfillmentTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${game.fulfillmentTxHash}`} target="_blank" rel="noopener noreferrer" className="history-tx-link">
                      (View VRF Tx)
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {showHistory && activeTab === "history" && gameHistory.length === 0 && (
            <p>No wager history yet.</p>
          )}
          
          {showHistory && activeTab === "leaderboard" && (
            <div className="leaderboard-container">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>User</th>
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
  );
};

export default CoinFlipPage;
