import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const clothesEmojis = ['👗', '👕', '👖', '🧥', '👚', '👟'];

const ClothesCarousel = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % clothesEmojis.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ height: '70px', position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', width: '100%' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.8 }}
          style={{ position: 'absolute', fontSize: '3.5rem' }}
        >
          {clothesEmojis[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ClothesCarousel;
