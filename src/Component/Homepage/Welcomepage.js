import React from 'react'
import img1 from '../../images/bg.jpg';
import img from '../../images/14.png';
import img2 from '../../images/div.png';
import { LuSparkles } from "react-icons/lu";

function Welcomepage({ onStart }) {
  return (
    <div>
      <div className="page">
        <img src={img1} alt="Background pattern" className="pageBg" />
        <div className="data">
          <div className="image">
            <img src={img} alt="Logo" />
          </div>

          <h1>Welcome, John</h1>

          <p>
            Not sure where to begin? Our smart assistant will ask simple questions <br/>
            to create your listing.
          </p>

          <div className="layout">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>

            <div className='assistant'>
              <p>
                👋 Hello! I'm your AI property listing assistant. 
                I'll help you create a professional listing in just a few simple steps. 
                Let's get started!
              </p>
            </div>
          </div>

          <button className='btn' onClick={onStart}>
            <span className='btnIcon'><LuSparkles /></span>
            Start Creating
          </button>
        </div>

      </div>
    </div>
  )
}

export default Welcomepage