'use client';

import { BackgroundBlackHole } from '@/shared/ui/background-black-hole/background-black-hole';
import styles from './site-background-black-hole.module.css';

export function SiteBackgroundBlackHole() {
  return (
    <div aria-hidden="true" className={styles.wrap}>
      <BackgroundBlackHole />
    </div>
  );
}
