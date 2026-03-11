import React from 'react'
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';

function Propertytype({ onSelectPropertyType, onBack }) {
  const propertyTypes = ['Apartment', 'House', 'Condo', 'Townhouse', 'Villa', 'Studio'];

  return (
    <div className="propertyPage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent">
        <div className="progressHeader">
          <span>Step 01 of 10</span>
          <span>10%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "10%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow">
            <div className="bot">
                         <img src={img2} alt="Assistant icon" />
                       </div>
            <div className="chatBubble">
              👋 Hello! I'm your AI property listing assistant. I'll help you create a professional listing in just a few simple steps. Let's get started!
            </div>
          </div>

          <div className="chatRow">
            <div className="bot">
                         <img src={img2} alt="Assistant icon" />
                       </div>
            <div className="chatBubble questionBubble">
              What type of property would you like to list?
            </div>
          </div>

          <div className="typeOptions">
            {propertyTypes.map((item) => (
              <button
                key={item}
                className="typeChip"
                onClick={() => onSelectPropertyType(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button className="backBtn" aria-label="Go back" onClick={onBack}>‹</button>
      </div>
    </div>
  )
}

export default Propertytype