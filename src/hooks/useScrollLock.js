import { useEffect } from 'react';

let lockCount = 0;

export default function useScrollLock(isOpen) {
  useEffect(() => {
    if (isOpen) {
      lockCount++;
      document.body.classList.add('modal-open');
    }

    return () => {
      if (isOpen) {
        lockCount--;
        if (lockCount <= 0) {
          lockCount = 0;
          document.body.classList.remove('modal-open');
        }
      }
    };
  }, [isOpen]);
}

