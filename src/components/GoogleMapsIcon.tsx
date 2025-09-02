import React from 'react';

interface GoogleMapsIconProps {
  className?: string;
  size?: number;
}

const GoogleMapsIcon: React.FC<GoogleMapsIconProps> = ({ className, size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        fill="#EA4335"
      />
      <path
        d="M12 7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
        fill="#ffffff"
      />
    </svg>
  );
};

export default GoogleMapsIcon;

