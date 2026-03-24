import React from 'react';

function OptionTabs({
  options,
  containerClassName,
  buttonClassName,
  getButtonClassName,
  isOptionDisabled,
  onOptionClick,
}) {
  return (
    <div className={containerClassName}>
      {options.map((item, index) => (
        <button
          key={item}
          className={getButtonClassName ? getButtonClassName(item, index) : buttonClassName}
          disabled={isOptionDisabled ? isOptionDisabled(item, index) : false}
          onClick={() => onOptionClick(item, index)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export default OptionTabs;
