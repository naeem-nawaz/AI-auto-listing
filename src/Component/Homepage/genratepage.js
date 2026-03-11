import React, { useEffect } from 'react';
import bg from '../../images/bg.jpg';
import { LuSparkles } from "react-icons/lu";

function Genratepage({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="propertyPage genratePage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent genrateContent">
        <div className="genrateCenterBox">
          <div className="genrateIconArea">
            <div className="genrateIconGlow"></div>
            <div className="genrateIconWrap">
              <LuSparkles />
            </div>
          </div>

          <p className="genrateText">Generating your perfect listing...</p>

          <div className="genrateDots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Genratepage;
