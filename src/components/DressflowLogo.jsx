import React from 'react'
import { motion } from 'framer-motion'

const DressflowLogo = () => (
  <motion.svg 
    viewBox="0 0 100 100" 
    className="logo-svg"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    <path d="M20,30 Q50,10 80,30 L85,45 Q50,35 15,45 Z" />
    <path d="M25,46 L25,85 Q50,95 75,85 L75,46 Q50,40 25,46" opacity="0.8" />
    <rect x="45" y="15" width="10" height="20" rx="2" />
  </motion.svg>
)

export default DressflowLogo;
