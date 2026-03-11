import React from 'react';
import { LuSparkles, LuMapPin, LuRuler, LuBedDouble, LuBath, LuCheck } from "react-icons/lu";

function Publishpage({ propertyType, address, price, size, bedrooms, bathrooms, feature, images }) {
  const heroImage = images && images.length ? images[0] : '';

  return (
    <div className="publishPageWrap">
      <div className="publishCard">
        <div className="publishHeader">
          <div className="publishHeaderRow">
            <span className="publishSparkle"><LuSparkles /></span>
            <div>
              <h2>Your AI-Generated Listing</h2>
              <p>Review and publish your property</p>
            </div>
          </div>
        </div>

        <div
          className="publishHero"
          style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
        >
          <span className="publishType">{propertyType || 'Apartment'}</span>
        </div>

        <div className="publishBody">
          <h3>{price || 'Rs 350,000'}</h3>
          <p className="publishAddress"><LuMapPin /> {address || '123 Main St, Downtown'}</p>

          <div className="publishMeta">
            <div><span><LuRuler /></span> <strong>Size</strong><em>{size || '850 sq ft'}</em></div>
            <div><span><LuBedDouble /></span> <strong>Bedrooms</strong><em>{bedrooms || '5'}</em></div>
            <div><span><LuBath /></span> <strong>Bathrooms</strong><em>{bathrooms || '4'}</em></div>
          </div>

          <h4>Key Features</h4>
          <div className="publishFeatures">
            <span><LuCheck /> {feature || 'Central AC'}</span>
            <span><LuCheck /> Walk-in Closets</span>
            <span><LuCheck /> Gym/Fitness Center</span>
          </div>

          <div className="publishActions">
            <button className="publishBtn"><LuSparkles /> Publish Listing</button>
            <button className="saveBtn">Save for later</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Publishpage;
