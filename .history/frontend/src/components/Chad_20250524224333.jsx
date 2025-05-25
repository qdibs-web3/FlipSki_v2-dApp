import React, { useState, useEffect } from "react";
import Moralis from "moralis";
import "../styles/Chad.css";

function Chad() {
  const [holders, setHolders] = useState([]);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Initialize Moralis only once
  useEffect(() => {
    const initializeMoralis = async () => {
      try {
        const apiKey = import.meta.env.VITE_MORALIS_API_KEY;
        if (!apiKey) {
          throw new Error("Moralis API key is missing.");
        }
        if (!Moralis.Core.isStarted) {
          await Moralis.start({ apiKey });
          console.log("Moralis initialized");
        }
      } catch (e) {
        console.error("Moralis initialization failed:", e);
        setError("Failed to initialize Moralis. Please try again later.");
      }
    };

    initializeMoralis();
  }, []); // Empty dependency array ensures this only runs once

  useEffect(() => {
    const fetchHolders = async () => {
      try {
        // Fetch token holders with headers
        const response = await Moralis.EvmApi.token.getTokenOwners({
          chain: "8453",
          limit: "30",
          order: "DESC",
          tokenAddress: "0x768BE13e1680b5ebE0024C42c896E3dB59ec0149",
        },);
  
        console.log(response); // Log the response to check its structure
  
        // Check if response contains data and set holders
        if (response.result) {
          setHolders(response.result);
        } else {
          setError("No token holders found.");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to fetch token holders. Please try again later.");
      }
    };
  
    fetchHolders();
  }, []); // Empty dependency array to fetch once when component mounts
  

  const paginateHolders = () => {
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    return holders.slice(indexOfFirst, indexOfLast);
  };

  const nextPage = () => {
    if (currentPage < Math.ceil(holders.length / itemsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (error) {
    return <div className="chad-container"><p>{error}</p></div>;
  }

  return (
    <div className="chad-container">
      {holders.length === 0 ? (
        <p>Loading holders...</p>
      ) : (
        <ul>
          {paginateHolders().map((holder, index) => {
            const rank = (currentPage - 1) * itemsPerPage + index + 1;

            return (
              <li key={index}>
                <p><span className="label">Holder Rank:</span> <span className="value">#{rank}</span></p>
                <p><span className="label">Holder Address:</span>{" "}<span className="value">
    {holder.ownerAddress ? `${holder.ownerAddress.slice(0, 6)}...${holder.ownerAddress.slice(-4)}` : "N/A"}
  </span>
</p>
                <p><span className="label">$FLIPSKI Balance:</span> <span className="value">{parseFloat(holder.balanceFormatted ?? 0).toFixed(2)}</span></p>
                <p><span className="label">Percent of Supply:</span> <span className="value">{parseFloat(holder.percentageRelativeToTotalSupply ?? 0).toFixed(2)}%</span></p>
              </li>
            );
          })}
        </ul>
      )}
      <div className="pagination">
        <button onClick={prevPage} disabled={currentPage === 1}>Previous</button>
        <button onClick={nextPage} disabled={currentPage === Math.ceil(holders.length / itemsPerPage)}>Next</button>
      </div>
    </div>
  );
}

export default Chad;