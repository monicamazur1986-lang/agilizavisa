'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import rocketMascot from '@/assets/images/rocket_mascot_1783940800845.jpg';

export function HeaderBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner on component mount
    setIsVisible(true);

    // Auto-hide after 60 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 60000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="header-agiliza-banner"
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
          }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-6 left-4 right-4 md:right-auto md:left-8 md:w-[450px] z-[100]"
        >
          {/* Cloud-like container */}
          <motion.div
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative w-full bg-white p-7 shadow-[0_30px_70px_rgba(0,149,255,0.15)] rounded-[3rem]"
          >
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-16 h-16 flex items-center justify-center shrink-0">
                <motion.div
                  animate={{ 
                    y: [0, -8, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <Image 
                    src={rocketMascot} 
                    alt="Rocket Mascot" 
                    width={48} 
                    height={48} 
                    className="w-12 h-12 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </div>

              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Novidades no Agiliza</h4>
                <p className="text-xs md:text-[13px] text-slate-600 leading-relaxed">
                  Conheça a consulta de risco sanitário por CNAE e baixe nosso material exclusivo gratuitamente.
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                id="close-banner-button"
                className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0 h-8 w-8 rounded-full"
                onClick={handleClose}
                aria-label="Fechar banner"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
