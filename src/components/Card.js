import React from 'react';
import './Card.css';

const Card = ({ children, className = '', style = {}, onClick }) => {
  return (
    <div
      className={`glass-card ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
