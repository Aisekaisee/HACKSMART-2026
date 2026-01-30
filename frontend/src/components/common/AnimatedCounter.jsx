import { useState, useEffect } from 'react';

const useCountUp = (end, duration = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const start = 0;
    
    // If end is not a number (e.g. null/undefined), don't animate properly
    if (typeof end !== 'number') return;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(start + progress * (end - start));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
};

const AnimatedCounter = ({ value, duration = 1000, decimals = 0, prefix = '', suffix = '' }) => {
    const count = useCountUp(value, duration);
    return (
        <span>
            {prefix}{count.toFixed(decimals)}{suffix}
        </span>
    );
};

export default AnimatedCounter;
