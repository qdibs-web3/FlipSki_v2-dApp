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
import FlipSkiBaseVRFABI from "../abis/CoinFlipETH.json";
import coinImage from "../assets/flipski.gif";
import headsImage from "../assets/flip.png";
import tailsImage from "../assets/ski.png";
import "../styles/CoinFlipPage.css";
import logo from "../assets/logo.png";

const CoinFlipPage = () => {
  const {
    walletAddress,
    userRelatedError,
    isConnecting,
    isConnected,
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

  const publicClient = createPublicClient({
    chain: baseSepoliaChain,
    transport: http(),
  });

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
      return createWalletClient({
        account: walletAddress,
        chain: baseSepoliaChain,
        transport: custom(window.ethereum),
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

  const fetchGameHistory = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    try {
      const gameSettledEventAbi = FlipSkiBaseVRFABI.abi.find(
        (item) => item.name === "GameSettled" && item.type === "event"
      );
      if (!gameSettledEventAbi) {
        console.error("GameSettled event ABI not found.");
        return;
      }
      const logs = await publicClient.getLogs({
        address: COINFLIP_CONTRACT_ADDRESS,
        event: gameSettledEventAbi,
        args: { player: walletAddress },
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const history = logs
        .filter(log => log.args && log.args.gameId !== undefined && log.args.result !== undefined && log.args.payoutAmount !== undefined && log.transactionHash)
        .map((log) => ({
          gameId: log.args.gameId.toString(),
          result: log.args.result === 0n ? "Heads" : "Tails",
          payout: formatEther(log.args.payoutAmount),
          won: log.args.payoutAmount > 0n,
          fulfillmentTxHash: log.transactionHash,
          vrfRequestId: log.args.vrfRequestId ? log.args.vrfRequestId.toString() : null,
        }))
        .reverse();
      setGameHistory(history.slice(0, 10));
    } catch (err) {
      console.error("Error fetching game history:", err);
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

  useEffect(() => {
    if (currentFlipAttempt && currentFlipAttempt.gameId && gameHistory.length > 0) {
      const settledGame = gameHistory.find(game => game.gameId === currentFlipAttempt.gameId);
      if (settledGame) {
        const gameResultOutcome = settledGame.won ? "win" : "loss";
        const actualSide = settledGame.result.toLowerCase();
        setFlipResult({
          outcome: gameResultOutcome,
          side: actualSide,
          wagered: currentFlipAttempt.wagerInEth,
          payout: settledGame.payout,
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
    let minWagerEth, maxWagerEth;
    try {
      minWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: FlipSkiBaseVRFABI.abi, functionName: "minWager" }));
      maxWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: FlipSkiBaseVRFABI.abi, functionName: "maxWager" }));
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
      console.log("DEBUG V2: Flip request transaction sent:", flipTxHash);
      const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
      console.log("DEBUG V2: Flip request receipt received:", requestReceipt);
      setIsSubmittingTransaction(false);

      let parsedGameRequested = null;
      const gameRequestedEventAbi = FlipSkiBaseVRFABI.abi.find(
        (item) => item.name === "GameRequested" && item.type === "event"
      );
      
      if (!gameRequestedEventAbi) {
        console.error("DEBUG V2: GameRequested event ABI definition not found!");
      } else {
        console.log("DEBUG V2: GameRequested event ABI definition found.");
      }

      console.log("DEBUG V2: Iterating through receipt logs. Total logs:", requestReceipt.logs.length);
      for (const i in requestReceipt.logs) {
        const log = requestReceipt.logs[i];
        console.log(`DEBUG V2: Processing log index ${i}:`, log);
        
        // Filter out logs not from our contract
        if (log.address.toLowerCase() !== COINFLIP_CONTRACT_ADDRESS.toLowerCase()) {
            console.log(`DEBUG V2: Log at index ${i} is from a different contract (${log.address}). Skipping.`);
            continue;
        }

        try {
          const decodedLog = decodeEventLog({ abi: FlipSkiBaseVRFABI.abi, data: log.data, topics: log.topics });
          console.log(`DEBUG V2: Decoded log index ${i} (from our contract):`, decodedLog);
          console.log(`DEBUG V2: Decoded log ARGS at index ${i}:`, decodedLog.args);

          if (decodedLog && decodedLog.eventName === "GameRequested") {
            console.log(`DEBUG V2: GameRequested event found at index ${i}. Args:`, decodedLog.args);
            // Ensure all expected args are present before accessing them
            if (decodedLog.args && 
                decodedLog.args.player && 
                decodedLog.args.gameId !== undefined && 
                decodedLog.args.wagerAmount !== undefined && // Corrected from wager to wagerAmount
                decodedLog.args.choice !== undefined) {

              if (decodedLog.args.player.toLowerCase() === walletAddress.toLowerCase()) {
                console.log(`DEBUG V2: Player address matches for GameRequested event at index ${i}.`);
                parsedGameRequested = {
                  gameId: decodedLog.args.gameId.toString(),
                  wagerInEth: formatEther(decodedLog.args.wagerAmount), // Corrected
                  choiceAsNumber: Number(decodedLog.args.choice),
                };
                break; 
              } else {
                console.log(`DEBUG V2: Player address mismatch for GameRequested event at index ${i}. Expected: ${walletAddress}, Got: ${decodedLog.args.player}`);
              }
            } else {
                console.error(`DEBUG V2: GameRequested event at index ${i} is missing expected arguments. Args received:`, decodedLog.args);
            }
          } else if (decodedLog) {
            console.log(`DEBUG V2: Decoded log at index ${i} is not GameRequested. Event name: ${decodedLog.eventName}`);
          } else {
            console.log(`DEBUG V2: Could not decode log at index ${i} (from our contract).`);
          }
        } catch (e) {
          console.error(`DEBUG V2: Error decoding log at index ${i} (from our contract):`, e, "Log data:", log);
        }
      }

      if (parsedGameRequested) {
        console.log("DEBUG V2: GameRequested event successfully parsed:", parsedGameRequested);
        setCurrentFlipAttempt(parsedGameRequested);
        setIsFlipping(true);
        setError("");
      } else {
        console.error("DEBUG V2: Could not parse GameRequested event from receipt after iterating all logs.", requestReceipt);
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
    const feePercentage = 0.05;
    const feeAmount = wagerFloat * feePercentage;
    const grossPayout = wagerFloat * 2;
    const netPayoutIfWin = grossPayout - feeAmount;
    return netPayoutIfWin.toFixed(5);
  }, [wager]);

  const toggleHistory = () => setShowHistory(!showHistory);

  const getSelectedSideText = () => {
    if (selectedSide === "heads") return "FLIP";
    if (selectedSide === "tails") return "SKI";
    return "";
  };

  let buttonText = "Degen Flip!";
  if (isConnecting) buttonText = "Connecting Wallet...";
  else if (isSubmittingTransaction) buttonText = "Confirming Request...";
  else if (isFlipping) buttonText = "Flipping...";

  return (
    <div className="coinflip-container">
      <div className="coinflip-box">
        <img src={logo} alt="FlipSki ETH" className="page-title" />

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

          {selectedSide && !isFlipping && !flipResult && (
            <div className="selected-coin-display">
              <img src={selectedSide === "heads" ? headsImage : tailsImage} alt={`${selectedSide} choice`} className="selected-choice-image" />
              <p className="preview-wager">Wager: {getSelectedSideText()} for {wager} ETH</p>
              <p className="potential-earnings">Potential win (after fee): {potentialEarningsValue} ETH</p>
            </div>
          )}
        </div>

        <div className="game-history">
          <button onClick={toggleHistory} className="game-history-toggle">
            Last 10 FLIPSKI Wagers {showHistory ? "	▲" : "	▼"}
          </button>
          {showHistory && gameHistory.length > 0 && (
            <ul>
              {gameHistory.map((game) => (
                <li key={game.gameId} className={game.won ? "win-history" : "loss-history"}>
                  Game #{game.gameId}: Result: {game.result} — {game.won ? `✅ Won ${game.payout} ETH` : `❌ Loss (Payout: ${game.payout} ETH)`}
                  {game.fulfillmentTxHash && (
                    <a href={`https://sepolia.basescan.org/tx/${game.fulfillmentTxHash}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px', color: '#88aaff' }}>
                      (View VRF Tx)
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {showHistory && gameHistory.length === 0 && (
            <p>No wager history yet.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default CoinFlipPage;

