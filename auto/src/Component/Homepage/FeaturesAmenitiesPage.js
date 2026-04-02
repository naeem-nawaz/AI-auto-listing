import React from 'react';
import PropertyLayout from '../material/PropertyLayout';
import { BotMessage, UserMessage } from '../material/ChatMaterial';
import FeaturesAmenitiesPanel, { DEFAULT_SUBTITLE_EN } from './FeaturesAmenitiesPanel';

export default function FeaturesAmenitiesPage({
  bathrooms,
  onBack,
  onComplete,
  apiAmenityNames = [],
  amenitiesLoading = false,
}) {
  return (
    <PropertyLayout
      stepText="Step 07 of 10"
      progressPercent={75}
      onBack={onBack}
      pageClassName="featuresAmenitiesPropertyPage"
      contentClassName="propertyContent featuresAmenitiesContent"
    >
      <div className="chatBlock ppAmenityContextChat">
        <BotMessage>And how many bathrooms?</BotMessage>
        <UserMessage>{bathrooms}</UserMessage>
      </div>
      <FeaturesAmenitiesPanel
        apiAmenityNames={apiAmenityNames}
        amenitiesLoading={amenitiesLoading}
        onCancel={onBack}
        onSubmit={onComplete}
        subtitle={DEFAULT_SUBTITLE_EN}
      />
    </PropertyLayout>
  );
}
