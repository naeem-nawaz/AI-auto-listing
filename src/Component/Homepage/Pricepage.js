import React, { useState } from 'react';
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { LuSend } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";

function Pricepage({ address, onBack, onSelectPrice }) {
  const [priceInput, setPriceInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const priceOptions = ['Rs 200,000', 'Rs 1,000,000+', 'Rs 350,000', 'Rs500,000', 'Rs750,000', 'Custom Price'];

  const handlePriceButtonClick = (price) => {
    if (price === 'Custom Price') {
      setIsCustomMode(true);
      return;
    }

    setIsCustomMode(false);
    setPriceInput('');
    onSelectPrice(price);
  };

  const handleSendCustomPrice = () => {
    if (!isCustomMode) return;
    if (!priceInput.trim()) return;
    onSelectPrice(priceInput.trim());
  };

  return (
    <div className="propertyPage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent">
        <div className="progressHeader">
          <span>Step 03 of 10</span>
          <span>30%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "30%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble">
              Great choice! Where is this property located? You can <br /> type the address or neighborhood.
            </div>
          </div>

          <div className="chatRow userRow">
            <div className="chatBubble userTypeBubble">
              {address || '123 Main St, Downtown'}
            </div>
            <div className="userIconWrap">
              <FaRegUser className="userTypeIcon" size={25} />
            </div>
          </div>

          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble">
              Perfect! What's the listing price?
            </div>
          </div>

          <div className="priceOptions">
            {priceOptions.map((item) => (
              <button
                key={item}
                className={`priceChip ${item === 'Custom Price' && isCustomMode ? 'activePriceChip' : ''}`}
                onClick={() => handlePriceButtonClick(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button className="backBtn" aria-label="Go back" onClick={onBack}>‹</button>

        <div className="addressInputWrap">
          <input
            type="text"
            className="addressInput"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder={isCustomMode ? "Write custom price..." : "Select Custom Price to enable"}
            disabled={!isCustomMode}
          />
          <button className="sendBtn" aria-label="Send message" onClick={handleSendCustomPrice}>
            <LuSend />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Pricepage;
