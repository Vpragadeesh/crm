import { createContext, useCallback, useRef, useEffect } from 'react';

export const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const modalsRef = useRef(new Set());

  // Register a modal when it opens
  const registerModal = useCallback((id) => {
    modalsRef.current.add(id);
  }, []);

  // Unregister a modal when it closes
  const unregisterModal = useCallback((id) => {
    modalsRef.current.delete(id);
  }, []);

  // Check if any modals are open
  const hasOpenModals = useCallback(() => {
    return modalsRef.current.size > 0;
  }, []);

  // Global ESC key handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle ESC key
      if (event.key !== 'Escape') return;

      // Check if any modals are open
      if (!hasOpenModals()) return;

      // Dispatch global close event
      const closeEvent = new CustomEvent('closeAllModals');
      window.dispatchEvent(closeEvent);

      // Prevent default ESC behavior and stop propagation
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    // Add listener on capture phase for highest priority
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [hasOpenModals]);

  const value = {
    registerModal,
    unregisterModal,
    hasOpenModals,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};
