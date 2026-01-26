import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(expiryDate) - new Date();
      
      if (difference <= 0) {
        setTimeLeft("Deal Expired");
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    const timer = setInterval(calculateTime, 1000);
    calculateTime(); // Initial call

    return () => clearInterval(timer);
  }, [expiryDate]);

  return (
    <div style={{
      color: '#ff4757',
      fontSize: '0.85rem',
      fontWeight: 'bold',
      marginTop: '5px',
      background: '#fff2f2',
      padding: '2px 8px',
      borderRadius: '5px',
      display: 'inline-block'
    }}>
      ⏱ Ends in: {timeLeft}
    </div>
  );
};

export default CountdownTimer;