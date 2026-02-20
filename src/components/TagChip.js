import React from 'react';
import './TagChip.css';

const TagChip = ({ label, active = false, onClick, color = 'green', size = 'md' }) => {
  return (
    <span
      className={`tag-chip tag-chip--${color} tag-chip--${size} ${active ? 'tag-chip--active' : ''} ${onClick ? 'tag-chip--clickable' : ''}`}
      onClick={onClick}
    >
      {label}
    </span>
  );
};

export default TagChip;
