import { useEffect, useContext, useRef } from 'react';
import { ModalContext } from '../context/ModalContext';

/**
 * useEscapeKey - Closes individual modal on ESC with ref support
 * @param {boolean} isOpen - Whether modal is open
 * @param {function} onClose - Callback to close modal
 * @returns {ref} - Ref to attach to modal element
 */
export const useEscapeKey = (isOpen, onClose) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return modalRef;
};

/**
 * useCloseAllModals - Listens for global closeAllModals event
 * Recommended approach for most modals - simple one-liner
 * @param {function} onClose - Callback to close modal
 * @param {boolean} isOpen - Whether modal/popup is open
 */
export const useCloseAllModals = (onClose, isOpen = true) => {
  const context = useContext(ModalContext);
  const registerModal = context?.registerModal;
  const unregisterModal = context?.unregisterModal;
  const idRef = useRef(`modal-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!registerModal || !unregisterModal) return;
    if (isOpen) {
      registerModal(idRef.current);
    } else {
      unregisterModal(idRef.current);
    }
    return () => {
      unregisterModal(idRef.current);
    };
  }, [isOpen, registerModal, unregisterModal]);

  useEffect(() => {
    if (!isOpen) return;
    const handleCloseAll = () => {
      onClose();
    };

    window.addEventListener('closeAllModals', handleCloseAll);

    return () => {
      window.removeEventListener('closeAllModals', handleCloseAll);
    };
  }, [onClose, isOpen]);
};
