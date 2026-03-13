import React from 'react';

function OptionTabs({
  options,
  containerClassName,
  buttonClassName,
  getButtonClassName,
  onOptionClick,
}) {
  return (
    <div className={containerClassName}>
      {options.map((item, index) => (
        <button
          key={item}
          className={getButtonClassName ? getButtonClassName(item, index) : buttonClassName}
          onClick={() => onOptionClick(item, index)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default OptionTabs;
