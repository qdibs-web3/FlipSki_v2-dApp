import React, { useState, useEffect, useCallback } from "react";
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
import coinImage from "../assets/heads.png";
import headsImage from "../assets/heads.png";
import tailsImage from "../assets/tails.png";
import "../styles/CoinFlipPage.css";
import logo from "../assets/nav.png";

const CoinFlipPage = () => {
  const {
    walletAddress,
    userRelatedError,
    activeWalletInstance,
    isConnecting,
    isConnected,
  } = useWallet();

  const [selectedSide, setSelectedSide] = useState(null);
  const [wager, setWager] = useState("0.001");
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [flipResult, setFlipResult] = useState(null); // Used to track if a flip just occurred
  const [error, setError] = useState("");
  const [ethBalance, setEthBalance] = useState("0");
  const [gameHistory, setGameHistory] = useState([]);
  const presetWagers = ["0.001", "0.005", "0.01"];

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
      console.log("CoinFlipPage: Using window.ethereum as the provider for viem.");
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
    console.log(`fetchEthBalance called. isFlipping: ${isFlipping}, walletAddress: ${!!walletAddress}`);
    if (walletAddress && publicClient) {
      try {
        const balance = await publicClient.getBalance({ address: walletAddress });
        setEthBalance(formatEther(balance));
        console.log("fetchEthBalance: Balance updated.");
      } catch (err) {
        console.error("Error fetching ETH balance:", err);
        setError("Could not fetch ETH balance.");
      }
    }
  }, [walletAddress, publicClient, isFlipping]); // isFlipping added to see its state when called

  const fetchGameHistory = useCallback(async () => {
    console.log(`fetchGameHistory called. isFlipping: ${isFlipping}, walletAddress: ${!!walletAddress}`);
    if (isFlipping) {
      console.log("fetchGameHistory: Skipping fetch because isFlipping is true.");
      return;
    }
    if (!publicClient || !walletAddress) {
      console.log("fetchGameHistory: Skipping fetch because no publicClient or walletAddress.");
      return;
    }
    console.log("fetchGameHistory: Proceeding with fetch.");
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
      console.log("fetchGameHistory: History updated.");
    } catch (err) {
      console.error("Error fetching game history:", err);
    }
  }, [publicClient, walletAddress, isFlipping]);

  useEffect(() => {
    if (walletAddress) {
      console.log("Initial useEffect for balance: Fetching balance. isFlipping:", isFlipping);
      fetchEthBalance();
    }
  }, [walletAddress, fetchEthBalance]); // fetchEthBalance has isFlipping in its deps now

  useEffect(() => {
    console.log(`Polling useEffect triggered. walletAddress: ${!!walletAddress}, isFlipping: ${isFlipping}`);
    if (walletAddress && !isFlipping) {
      console.log("Polling useEffect: Condition met (walletAddress && !isFlipping), fetching history and starting interval.");
      fetchGameHistory();
      const interval = setInterval(() => {
        console.log(`Polling interval: Fetching history. isFlipping: ${isFlipping}`);
        if (!isFlipping) { // Re-check isFlipping before interval fetch
            fetchGameHistory();
        }
      }, 30000);
      return () => {
        console.log("Polling useEffect: Clearing interval.");
        clearInterval(interval);
      };
    } else {
      console.log("Polling useEffect: Condition NOT met (walletAddress && !isFlipping).");
    }
  }, [walletAddress, fetchGameHistory, isFlipping]);

  // New useEffect to fetch data AFTER animation completes
  useEffect(() => {
    console.log(`Post-animation useEffect triggered. isFlipping: ${isFlipping}, walletAddress: ${!!walletAddress}, flipResult: ${!!flipResult}`);
    // Only run if not currently flipping, a wallet is connected, AND a flip has just occurred (indicated by flipResult being set)
    if (!isFlipping && walletAddress && flipResult) {
      console.log("Post-animation useEffect: Conditions met. Fetching balance and history.");
      fetchEthBalance();
      fetchGameHistory();
    }
  }, [isFlipping, walletAddress, flipResult, fetchEthBalance, fetchGameHistory]);

  const handleDegen = async () => {
    console.log("handleDegen: Started.");
    setError("");
    setFlipResult(null); // Reset flip result at the beginning of a new flip

    if (!isConnected) {
      setError("Connect wallet first (from the navigation bar). Ensure it is fully connected.");
      setTimeout(() => setError(""), 4000);
      return;
    }
    if (!selectedSide) {
      setError("Select heads or tails.");
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
    console.log("handleDegen: setIsSubmittingTransaction(true)");
    const currentWagerForFlip = wager;

    try {
      const wagerInWei = parseEther(currentWagerForFlip);
      const choiceAsNumber = selectedSide === "heads" ? 0 : 1;
      const contractCallParams = { address: COINFLIP_CONTRACT_ADDRESS, abi: CoinFlipETHABI.abi, functionName: "flip", args: [choiceAsNumber], value: wagerInWei, account: walletClient.account, gas: BigInt(300000) };
      console.log("CoinFlipPage: Attempting to call contract with params:", contractCallParams);
      const flipTxHash = await walletClient.writeContract(contractCallParams);
      console.log("CoinFlipPage: Transaction hash received:", flipTxHash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: flipTxHash });
      console.log("CoinFlipPage: Transaction receipt received:", receipt);

      setIsSubmittingTransaction(false);
      console.log("handleDegen: setIsSubmittingTransaction(false)");
      setIsFlipping(true);
      console.log("handleDegen: setIsFlipping(true)");

      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulates animation duration
      console.log("handleDegen: Animation timeout finished.");

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
        } catch (e) { console.warn("Error decoding a log entry:", e); }
      }

      if (gameSettledEventFound) {
        const gameResultOutcome = gameSettledEventData.result === choiceAsNumber ? "win" : "loss";
        const actualSide = gameSettledEventData.result === 0 ? "heads" : "tails";
        const payoutAmount = formatEther(gameSettledEventData.payoutAmount);
        console.log(`handleDegen: Game settled. Outcome: ${gameResultOutcome}, Side: ${actualSide}`);
        setFlipResult({ outcome: gameResultOutcome, side: actualSide, wagered: currentWagerForFlip, payout: payoutAmount });
      } else {
        console.error("GameSettled event was NOT found or not correctly decoded for player:", walletAddress);
        setError("Could not determine game outcome. Check console.");
        setFlipResult({ outcome: "unknown", side: "unknown", wagered: currentWagerForFlip, payout: "0" });
      }
    } catch (err) {
      console.error("Error during flip transaction or processing:", err);
      setError(err.shortMessage || err.message || "An error occurred during the flip.");
      setFlipResult({ outcome: "error", side: "unknown", wagered: currentWagerForFlip, payout: "0" });
      if (isSubmittingTransaction) {
        setIsSubmittingTransaction(false);
        console.log("handleDegen: (catch) setIsSubmittingTransaction(false)");
      }
    } finally {
      console.log("handleDegen: Entering finally block.");
      setIsFlipping(false);
      console.log("handleDegen: (finally) setIsFlipping(false). isFlipping is now:", false); // Log the new state
      // Data fetching is now handled by the new useEffect listening to isFlipping and flipResult
    }
  };

  return (
    <div className="coinflip-container">
      <div className="coinflip-box">
        <img src={logo} alt="GuntFlip ETH" className="page-title" />
        {walletAddress && (
          <div className="wallet-info-active">
            <p>Connected: <span className="wallet-address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span></p>
            <p>Balance: <span className="balance-info">{parseFloat(ethBalance).toFixed(4)} ETH</span></p>
          </div>
        )}
        {userRelatedError && (<p className="wallet-warning">Wallet Error: {userRelatedError.message}</p>)}
        <div className="coin-display-area">
          {isFlipping ? (
            <div className="coin-flipping-animation"><img src={coinImage} alt="Flipping Coin" className="coin-image" /></div>
          ) : flipResult ? (
            <div className="flip-result-display">
              <img src={flipResult.side === "heads" ? headsImage : tailsImage} alt={flipResult.side} className="coin-image" />
              {flipResult.outcome === "win" && <p className="win-message">You Won! Wagered: {flipResult.wagered} ETH, Payout: {flipResult.payout} ETH</p>}
              {flipResult.outcome === "loss" && <p className="loss-message">You Lost. Wagered: {flipResult.wagered} ETH</p>}
              {flipResult.outcome === "unknown" && <p className="unknown-message">Outcome Unknown. Wagered: {flipResult.wagered} ETH. Check console.</p>}
              {flipResult.outcome === "error" && <p className="error-message-result">Flip Error. Wagered: {flipResult.wagered} ETH. Check console.</p>}
            </div>
          ) : (<div className="coin-placeholder">Make your coin flip bet!</div>)}
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="coinflip-controls">
          <div className="side-selection">
            <button className={selectedSide === "heads" ? "selected" : ""} onClick={() => setSelectedSide("heads")}>Heads</button>
            <button className={selectedSide === "tails" ? "selected" : ""} onClick={() => setSelectedSide("tails")}>Tails</button>
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
        <div className="game-history">
          <h3>Last 10 Games</h3>
          {gameHistory.length > 0 ? (<ul>{gameHistory.map((game) => (<li key={game.gameId} className={game.won ? "win-history" : "loss-history"}>Game #{game.gameId}: Result: {game.result} — {game.won ? `✅ Won ${game.payout} ETH` : `❌ Loss (Payout: ${game.payout} ETH)`}</li>))}</ul>) : (<p>No game history yet.</p>)}
        </div>
      </div>
    </div>
  );
};

export default CoinFlipPage;

