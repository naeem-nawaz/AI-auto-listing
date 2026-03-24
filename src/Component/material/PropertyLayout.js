import React from 'react';
import bg from '../../images/bg.jpg';

function PropertyLayout({
  stepText,
  progressPercent,
  showProgress = true,
  onBack,
  children,
  footer,
  pageClassName = '',
  contentClassName = '',
}) {
  const pageClass = pageClassName ? `propertyPage ${pageClassName}` : 'propertyPage';
  const contentClass = contentClassName ? `propertyContent ${contentClassName}` : 'propertyContent';

  return (
    <div className={pageClass}>
      <img src={bg} alt="Background pattern" className="propertyBg" />
      <div className={contentClass}>
        {showProgress && (
          <>
            <div className="progressHeader">
              <span>{stepText}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="progressTrack">
              <div className="progressFill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </>
        )}
        {children}
        {onBack && (
          <button className="backBtn" aria-label="Go back" onClick={onBack}>
            ‹
          </button>
        )}
        {footer}
      </div>
    </div>
  );
}

export default PropertyLayout; 
