'use client';

import { motion } from 'motion/react';
import styles from './black-hole-stage.module.css';

interface BlackHoleStageProps {
  size?: 'compact' | 'hero';
}

export function BlackHoleStage({
  size = 'hero',
}: BlackHoleStageProps) {
  return (
    <div
      className={`${styles.stage} ${size === 'compact' ? styles.compact : ''}`}
    >
      <motion.div
        animate={{ rotate: 360 }}
        className={styles.orbitPrimary}
        transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
      >
        <span className={`${styles.satellite} ${styles.satellitePrimary}`} />
        <span className={`${styles.satellite} ${styles.satelliteSecondary}`} />
      </motion.div>

      <motion.div
        animate={{ rotate: -360 }}
        className={styles.orbitSecondary}
        transition={{ duration: 26, ease: 'linear', repeat: Infinity }}
      >
        <span className={`${styles.satellite} ${styles.satelliteTertiary}`} />
      </motion.div>

      <motion.div
        animate={{ scale: [1, 1.04, 0.98, 1] }}
        className={styles.ring}
        transition={{ duration: 4.8, ease: 'easeInOut', repeat: Infinity }}
      />

      <motion.div
        animate={{
          opacity: [0.94, 1, 0.94],
          scale: [1, 1.06, 0.98, 1],
        }}
        className={styles.coreWrap}
        transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
      >
        <div className={styles.core} />
      </motion.div>
    </div>
  );
}
