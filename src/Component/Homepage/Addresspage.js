import React, { useState } from 'react'
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { LuSend } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";

function Addresspage({ selectedPropertyType, onBack, onSendAddress }) {
  const [address, setAddress] = useState('123 Main St, Downtown');

  return (
    <div>
       <div className="propertyPage">
            <img src={bg} alt="Background pattern" className="propertyBg" />
      
            <div className="propertyContent">
              <div className="progressHeader">
                <span>Step 01 of 10</span>
                <span>20%</span>
              </div>
      
              <div className="progressTrack">
             <div className="progressFill" style={{ width: "20%" }}></div>
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

              <div className="chatRow userRow">
                <div className="chatBubble userTypeBubble">
                  {selectedPropertyType}
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
                  Great choice! Where is this property located? You can <br /> type the address or neighborhood.
                </div>
              </div>
              </div>
      
              <button className="backBtn" aria-label="Go back" onClick={onBack}>‹</button>
              <div className="addressInputWrap">
                <input
                  type="text"
                  className="addressInput"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Type address..."
                />
                <button
                  className="sendBtn"
                  aria-label="Send address"
                  onClick={() => onSendAddress(address)}
                >
                  <LuSend />
                </button>
              </div>
            </div>
          </div>
    </div>
  )
}

export default Addresspage
