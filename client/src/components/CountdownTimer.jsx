import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ expiryDate, maniaActivatedAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      let targetDate;

      // If this is a Mania timer, calculate 24 hours from activation
      if (maniaActivatedAt) {
        targetDate = new Date(new Date(maniaActivatedAt).getTime() + 24 * 60 * 60 * 1000);
      } else {
        // Fallback to standard expiryDate prop
        targetDate = new Date(expiryDate);
      }

      const difference = targetDate - new Date();
      
      if (difference <= 0) {
        setTimeLeft("Deal Expired");
        return;
      }

      // Logic for Days, Hours, Minutes, Seconds
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      // Display days only if there's more than 24h left, otherwise show h/m/s
      const displayTime = days > 0 
        ? `${days}d ${hours}h ${minutes}m` 
        : `${hours}h ${minutes}m ${seconds}s`;

      setTimeLeft(displayTime);
    };

    const timer = setInterval(calculateTime, 1000);
    calculateTime(); // Initial call

    return () => clearInterval(timer);
  }, [expiryDate, maniaActivatedAt]);

  return (
    <div style={{
      color: '#ff4757',
      fontSize: '0.85rem',
      fontWeight: 'bold',
      marginTop: '5px',
      background: '#fff2f2',
      padding: '2px 8px',
      borderRadius: '5px',
      display: 'inline-block',
      border: '1px solid #ff4757'
    }}>
      ⏱ Ends in: {timeLeft}
    </div>
  );
};

export default CountdownTimer;