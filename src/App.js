import './App.css';
import { useState } from 'react';
import Welcomepage from './Component/Homepage/Welcomepage';
import Propertytype from './Component/Homepage/Propertytype';
import Addresspage from './Component/Homepage/Addresspage';
import Pricepage from './Component/Homepage/Pricepage';
import Propertysize from './Component/Homepage/propertysize';
import Ammentiespage from './Component/Homepage/Ammentiespage';
import Ammentiespage2 from './Component/Homepage/Ammentiespage2';
import Ammentiespage3 from './Component/Homepage/Ammentiespage3';
import Ammentiespage4 from './Component/Homepage/Ammentiespage4';
import Uploadpage from './Component/Homepage/Uploadpage';
import Picturepage from './Component/Homepage/picturepage';
import Genratepage from './Component/Homepage/genratepage';
import Publishpage from './Component/Homepage/publishpage';



function App() {
  const [selectedPropertyType, setSelectedPropertyType] = useState('Apartment');
  const [selectedAddress, setSelectedAddress] = useState('123 Main St, Downtown');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedSize, setSelectedSize] = useState('1500');
  const [selectedBedrooms, setSelectedBedrooms] = useState('5');
  const [selectedBathrooms, setSelectedBathrooms] = useState('2');
  const [selectedFeature, setSelectedFeature] = useState('Security');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentPage, setCurrentPage] = useState('welcome');

  const handlePropertyTypeSelect = (type) => {
    setSelectedPropertyType(type);
    setCurrentPage('address');
  };

  const handleBackToPropertyType = () => {
    setCurrentPage('propertyType');
  };

  const handleAddressSubmit = (address) => {
    setSelectedAddress(address);
    setCurrentPage('price');
  };

  const handleBackToAddress = () => {
    setCurrentPage('address');
  };

  const handlePriceSelect = (price) => {
    setSelectedPrice(price);
    setCurrentPage('review');
  };

  const handleBackToPrice = () => {
    setCurrentPage('price');
  };

  const handleSizeSubmit = (sizeValue) => {
    setSelectedSize(sizeValue);
    setCurrentPage('ammenties');
  };

  const handleBackToSize = () => {
    setCurrentPage('review');
  };

  const handleBedroomsSubmit = (bedrooms) => {
    setSelectedBedrooms(bedrooms);
    setCurrentPage('ammenties2');
  };

  const handleBackToAmmenties = () => {
    setCurrentPage('ammenties');
  };

  const handleBathroomsSubmit = (bathrooms) => {
    setSelectedBathrooms(bathrooms);
    setCurrentPage('ammenties3');
  };

  const handleBackToAmmenties2 = () => {
    setCurrentPage('ammenties2');
  };

  const handleFeaturesSubmit = (feature) => {
    setSelectedFeature(feature);
    setCurrentPage('ammenties4');
  };

  const handleBackToAmmenties3 = () => {
    setCurrentPage('ammenties3');
  };

  const handleDoneFeatures = () => {
    setCurrentPage('upload');
  };

  const handleBackToAmmenties4 = () => {
    setCurrentPage('ammenties4');
  };

  const handleUploadComplete = (files) => {
    const newImages = files.map((file) => URL.createObjectURL(file));
    setUploadedImages((prev) => [...prev, ...newImages]);
    setCurrentPage('picture');
  };

  const handleBackToUpload = () => {
    setCurrentPage('upload');
  };

  const handleContinueToGenerate = () => {
    setCurrentPage('genrate');
  };

  const handleGenerateComplete = () => {
    setCurrentPage('publish');
  };

  const handleStartCreating = () => {
    setCurrentPage('propertyType');
  };

  const handleBackToWelcome = () => {
    setCurrentPage('welcome');
  };

  return (
<div>
  {currentPage === 'welcome' && <Welcomepage onStart={handleStartCreating} />}
  {currentPage === 'propertyType' && (
    <Propertytype
      onSelectPropertyType={handlePropertyTypeSelect}
      onBack={handleBackToWelcome}
    />
  )}
  {currentPage === 'address' && (
    <Addresspage
      selectedPropertyType={selectedPropertyType}
      onBack={handleBackToPropertyType}
      onSendAddress={handleAddressSubmit}
    />
  )}
  {currentPage === 'price' && (
    <Pricepage
      address={selectedAddress}
      onBack={handleBackToAddress}
      onSelectPrice={handlePriceSelect}
    />
  )}
  {currentPage === 'review' && (
    <Propertysize
      propertyType={selectedPropertyType}
      address={selectedAddress}
      price={selectedPrice}
      onBack={handleBackToPrice}
      onSendSize={handleSizeSubmit}
    />
  )}
  {currentPage === 'ammenties' && (
    <Ammentiespage
      size={selectedSize}
      onBack={handleBackToSize}
      onSendBedrooms={handleBedroomsSubmit}
    />
  )}
  {currentPage === 'ammenties2' && (
    <Ammentiespage2
      bedrooms={selectedBedrooms}
      onBack={handleBackToAmmenties}
      onSendBathrooms={handleBathroomsSubmit}
    />
  )}
  {currentPage === 'ammenties3' && (
    <Ammentiespage3
      bathrooms={selectedBathrooms}
      onBack={handleBackToAmmenties2}
      onSendFeatures={handleFeaturesSubmit}
    />
  )}
  {currentPage === 'ammenties4' && (
    <Ammentiespage4
      feature={selectedFeature}
      onBack={handleBackToAmmenties3}
      onSendFeature={handleFeaturesSubmit}
      onDoneFeatures={handleDoneFeatures}
    />
  )}
  {currentPage === 'upload' && (
    <Uploadpage
      feature={selectedFeature}
      onBack={handleBackToAmmenties4}
      onUploadComplete={handleUploadComplete}
    />
  )}
  {currentPage === 'picture' && (
    <Picturepage
      feature={selectedFeature}
      images={uploadedImages}
      onBack={handleBackToUpload}
      onAddMoreImages={handleUploadComplete}
      onContinue={handleContinueToGenerate}
    />
  )}
  {currentPage === 'genrate' && <Genratepage onComplete={handleGenerateComplete} />}
  {currentPage === 'publish' && (
    <Publishpage
      propertyType={selectedPropertyType}
      address={selectedAddress}
      price={selectedPrice}
      size={selectedSize}
      bedrooms={selectedBedrooms}
      bathrooms={selectedBathrooms}
      feature={selectedFeature}
      images={uploadedImages}
    />
  )}
 
</div>
  )
}

export default App;
