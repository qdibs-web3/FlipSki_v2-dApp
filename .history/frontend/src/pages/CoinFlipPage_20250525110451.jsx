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

  // Create client without SSR check
  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: baseSepoliaChain,
      transport: http(),
    });
  }, []);

  const getWalletClient = useCallback(async () => {
    if (!walletAddress) {
      console.error("CoinFlipPage: Wallet address not available for getWalletClient.");
      setError("Wallet address not found. Please ensure your wallet is connected.");
      return null;
    }
    
    if (typeof window.ethereum === "undefined") {
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
    try {
      // Determine the base URL dynamically based on environment
      const baseUrl = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';
      
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
    if (walletAddress) {
      fetchEthBalance();
    }
  }, [walletAddress, fetchEthBalance]);

  useEffect(() => {
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
    fetchLeaderboardData();
    const interval = setInterval(fetchLeaderboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  useEffect(() => {
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
    let timeoutId;
    if (isFlipping && currentFlipAttempt) {
      timeoutId = setTimeout(() => {
        if (isFlipping) {
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
      const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
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
          // Error handling
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

  // Rest of the component rendering code...
  return (
    <div className="coin-flip-container">
      <div className="game-section">
        <div className="coin-container">
          <div className={`coin ${isFlipping ? "flipping" : ""}`}>
            <img
              src={coinImage}
              alt="Coin"
              className="coin-image"
            />
          </div>
        </div>

        <div className="game-controls">
          <div className="side-selection">
            <h3>Choose Your Side</h3>
            <div className="side-buttons">
              <button
                className={`side-button ${selectedSide === "heads" ? "selected" : ""}`}
                onClick={() => setSelectedSide("heads")}
              >
                <img src={headsImage} alt="Heads" className="side-image" />
                <span>FLIP</span>
              </button>
              <button
                className={`side-button ${selectedSide === "tails" ? "selected" : ""}`}
                onClick={() => setSelectedSide("tails")}
              >
                <img src={tailsImage} alt="Tails" className="side-image" />
                <span>SKI</span>
              </button>
            </div>
          </div>

          <div className="wager-section">
            <h3>Set Your Wager</h3>
            <div className="wager-input-container">
              <input
                type="number"
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                className="wager-input"
                placeholder="Enter wager amount"
                disabled={isFlipping || isSubmittingTransaction}
              />
              <span className="wager-currency">ETH</span>
            </div>
            <div className="preset-wagers">
              {presetWagers.map((preset) => (
                <button
                  key={preset}
                  className="preset-wager-button"
                  onClick={() => setWager(preset)}
                  disabled={isFlipping || isSubmittingTransaction}
                >
                  {preset} ETH
                </button>
              ))}
            </div>
          </div>

          <div className="potential-earnings">
            <h3>Potential Earnings</h3>
            <p className="earnings-value">{potentialEarningsValue} ETH</p>
          </div>

          <div className="flip-button-container">
            <button
              className="flip-button"
              onClick={handleDegen}
              disabled={isFlipping || isSubmittingTransaction || !selectedSide || !isConnected}
            >
              {buttonText}
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        </div>
      </div>

      {flipResult && (
        <div className={`result-overlay ${flipResult.outcome}`}>
          <div className="result-content">
            <h2>
              {flipResult.outcome === "win"
                ? "You Won!"
                : flipResult.outcome === "loss"
                ? "You Lost!"
                : "Result Pending..."}
            </h2>
            <p>
              {flipResult.side === "heads"
                ? "FLIP (Heads)"
                : flipResult.side === "tails"
                ? "SKI (Tails)"
                : "Unknown"}
            </p>
            <p>Wagered: {flipResult.wagered} ETH</p>
            {flipResult.outcome === "win" && (
              <p>Payout: {flipResult.payout} ETH</p>
            )}
            <button onClick={() => setFlipResult(null)}>Close</button>
          </div>
        </div>
      )}

      <div className="game-info-section">
        <div className="wallet-info">
          <h3>Wallet Balance</h3>
          <p>{parseFloat(ethBalance).toFixed(5)} ETH</p>
        </div>

        <div className="history-section">
          <div className="history-header">
            <h3>Game History & Leaderboard</h3>
            <button onClick={toggleHistory} className="toggle-history-button">
              {showHistory ? "Hide" : "Show"}
            </button>
          </div>

          {showHistory && (
            <div className="history-content">
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
                <div className="history-list">
                  {gameHistory.length > 0 ? (
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
                          <tr key={index} className={game.won ? "win" : "loss"}>
                            <td>{game.result}</td>
                            <td>{game.won ? "Win" : "Loss"}</td>
                            <td>{parseFloat(game.payout).toFixed(5)} ETH</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-history">No game history yet.</p>
                  )}
                </div>
              ) : (
                <div className="leaderboard-list">
                  {leaderboardData.length > 0 ? (
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Player</th>
                          <th>Wins</th>
                          <th>Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.map((player, index) => (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>
                              {player.address.substring(0, 6)}...
                              {player.address.substring(player.address.length - 4)}
                            </td>
                            <td>{player.wins}</td>
                            <td>
                              <LevelSystem xp={player.xp} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-leaderboard">Leaderboard data not available.</p>
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
