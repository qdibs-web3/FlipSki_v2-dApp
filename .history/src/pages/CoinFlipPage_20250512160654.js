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
import CoinFlipETHABI from "../abis/CoinFlipETH.json";
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
  const [showHistory, setShowHistory] = useState(false); // Task 1a: Game History Dropdown Logic

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
        setError("Could not fetch ETH balance.");
      }
    }
  }, [walletAddress, publicClient]);

  const fetchGameHistory = useCallback(async () => {
    if (!publicClient || !walletAddress) return;
    try {
      const gameSettledEventAbi = CoinFlipETHABI.abi.find(
        (item) => item.name === "GameSettled" && item.type === "event"
      );
      if (!gameSettledEventAbi) {
        console.error("GameSettled event ABI not found in provided JSON.");
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
        .filter(log => log.args && log.args.hasOwnProperty("gameId") && log.args.hasOwnProperty("result") && log.args.hasOwnProperty("payoutAmount"))
        .map((log) => {
          const payout = formatEther(log.args.payoutAmount);
          return {
            gameId: log.args.gameId.toString(),
            result: log.args.result === 0 ? "Heads" : "Tails",
            payout: payout,
            won: log.args.payoutAmount > 0n,
          };
        })
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
        if (!isSubmittingTransaction && !isFlipping) {
          fetchGameHistory();
        }
      };
      fetchAndUpdateHistory();
      const interval = setInterval(fetchAndUpdateHistory, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, fetchGameHistory, isSubmittingTransaction, isFlipping]);

  const handleDegen = async () => {
    setError("");
    setFlipResult(null);
    if (!isConnected) {
      setError("Connect wallet first (from the navigation bar). Ensure it is fully connected.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    if (!selectedSide) {
      setError("Select FLIP (HEADS) or SKI (TAILS).");
      setTimeout(() => setError(""), 3000);
      return;
    }
    let minWagerEth, maxWagerEth;
    try {
      minWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: CoinFlipETHABI.abi, functionName: "minWager" }));
      maxWagerEth = formatEther(await publicClient.readContract({ address: COINFLIP_CONTRACT_ADDRESS, abi: CoinFlipETHABI.abi, functionName: "maxWager" }));
    } catch (e) {
      console.error("Could not fetch wager limits", e);
      setError("Could not fetch wager limits. Using defaults.");
      setTimeout(() => setError(""), 3000);
      minWagerEth = "0.001";
      maxWagerEth = "0.1";
    }
    if (!wager || parseFloat(wager) < parseFloat(minWagerEth) || parseFloat(wager) > parseFloat(maxWagerEth)) {
      setError(`Enter a valid wager between ${minWagerEth} and ${maxWagerEth} ETH.`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    const walletClient = await getWalletClient();
    if (!walletClient) return;

    setIsSubmittingTransaction(true);
    const currentWagerForFlip = wager;

    try {
      const wagerInWei = parseEther(currentWagerForFlip);
      const choiceAsNumber = selectedSide === "heads" ? 0 : 1;
      const contractCallParams = {
        address: COINFLIP_CONTRACT_ADDRESS,
        abi: CoinFlipETHABI.abi,
        functionName: "flip",
        args: [choiceAsNumber],
        value: wagerInWei,
        account: walletClient.account,
        gas: BigInt(300000),
      };
      const flipTxHash = await walletClient.writeContract(contractCallParams);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });

      setIsSubmittingTransaction(false);
      setIsFlipping(true);

      await new Promise(resolve => setTimeout(resolve, 3000));

      let gameSettledEventData = null;
      let gameSettledEventFound = false;
      for (const log of receipt.logs) {
        try {
          const decodedLog = decodeEventLog({ abi: CoinFlipETHABI.abi, data: log.data, topics: log.topics });
          if (decodedLog && decodedLog.eventName === "GameSettled" && decodedLog.args.player && decodedLog.args.player.toLowerCase() === walletAddress.toLowerCase() && decodedLog.args.hasOwnProperty("result") && decodedLog.args.hasOwnProperty("payoutAmount")) {
            gameSettledEventData = decodedLog.args;
            gameSettledEventFound = true;
            break;
          }
        } catch (e) {
          console.warn("Error decoding a log entry:", e);
        }
      }

      if (gameSettledEventFound) {
        const gameResultOutcome = gameSettledEventData.result === choiceAsNumber ? "win" : "loss";
        const actualSide = gameSettledEventData.result === 0 ? "heads" : "tails";
        const payoutAmount = formatEther(gameSettledEventData.payoutAmount);
        setFlipResult({ outcome: gameResultOutcome, side: actualSide, wagered: currentWagerForFlip, payout: payoutAmount });
      } else {
        setError("Could not determine game outcome. Please check transaction or refresh history.");
        setFlipResult({ outcome: "unknown", side: "unknown", wagered: currentWagerForFlip, payout: "0" });
      }
    } catch (err) {
      console.error("Error during flip transaction or processing:", err);
      setError(err.shortMessage || err.message || "An error occurred during the flip.");
      setFlipResult({ outcome: "error", side: "unknown", wagered: currentWagerForFlip, payout: "0" });
    } finally {
      setIsFlipping(false);
      if (walletAddress) {
        fetchEthBalance();
        fetchGameHistory();
      }
    }
  };

  // Task 2: Correct Potential Earnings Formula
  const potentialEarningsValue = useMemo(() => {
    if (!wager || isNaN(parseFloat(wager)) || parseFloat(wager) <= 0) {
      return "0.00000";
    }
    const wagerFloat = parseFloat(wager);
    const winnings = wagerFloat; // Winnings match the wager
    const fee = winnings * 0.05; // 5% of winnings
    const earnings = wagerFloat + winnings - fee;
    return earnings.toFixed(5);
  }, [wager]);

  // Task 1a: Game History Dropdown Logic
  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  // Task 2: Implement Wager Preview Logic (Helper function for text)
  const getSelectedSideText = () => {
    if (selectedSide === "heads") return "FLIP";
    if (selectedSide === "tails") return "SKI";
    return "";
  };

  return (
    <div className="coinflip-container">
      <div className="coinflip-box">
        <img src={logo} alt="GuntFlip ETH" className="page-title" />

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
              {isConnecting ? "Connecting Wallet..." : isSubmittingTransaction ? "Confirming..." : isFlipping ? "Flipping..." : "Degen Flip!"}
            </button>
          </div>

          {selectedSide && (
            <div className="selected-coin-display">
              <img src={selectedSide === "heads" ? headsImage : tailsImage} alt={`${selectedSide} choice`} className="selected-choice-image" />
              <p className="preview-wager">Wager: {getSelectedSideText()} for {wager} ETH</p>
              <p className="potential-earnings">Potential win: {potentialEarningsValue} ETH</p>
            </div>
          )}
        </div>

        {/* Task 1b & 1c: Game History Dropdown UI & Logic */}
        <div className="game-history">
          <button onClick={toggleHistory} className="game-history-toggle">
            Last 10 FLIPSKI Wagers {showHistory ? "	▲" : "	▼"}
          </button>
          {showHistory && gameHistory.length > 0 && (
            <ul>{gameHistory.map((game) => (<li key={game.gameId} className={game.won ? "win-history" : "loss-history"}>Game #{game.gameId}: Result: {game.result} — {game.won ? `✅ Won ${game.payout} ETH` : `❌ Loss (Payout: ${game.payout} ETH)`}</li>))}</ul>
          )}
          {showHistory && gameHistory.length === 0 && (
            <p>No game history yet.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default CoinFlipPage;

