import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  creditService,
  CreditWallet,
  CreditPack,
  InsufficientCreditsInfo,
} from "@/services/creditService";
import { CreditPurchaseModal } from "@/components/credits/CreditPurchaseModal";
import { InsufficientCreditsModal } from "@/components/credits/InsufficientCreditsModal";
import { creditEvents } from "./creditEvents";
import { useAuth } from "@/lib/auth";

interface CreditWalletContextType {
  wallet: CreditWallet | null;
  isLoading: boolean;
  error: string | null;
  packs: CreditPack[];
  isPacksLoading: boolean;
  packsError: string | null;
  isPurchaseModalOpen: boolean;
  isInsufficientModalOpen: boolean;
  insufficientInfo: InsufficientCreditsInfo | null;
  refreshWallet: (silent?: boolean) => Promise<CreditWallet | null>;
  fetchPacks: () => Promise<CreditPack[]>;
  openPurchaseModal: () => void;
  closePurchaseModal: () => void;
  openInsufficientModal: (info?: InsufficientCreditsInfo) => void;
  closeInsufficientModal: () => void;
}

const CreditWalletContext = createContext<CreditWalletContextType | undefined>(undefined);

export const CreditWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [isPacksLoading, setIsPacksLoading] = useState(false);
  const [packsError, setPacksError] = useState<string | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isInsufficientModalOpen, setIsInsufficientModalOpen] = useState(false);
  const [insufficientInfo, setInsufficientInfo] = useState<InsufficientCreditsInfo | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshWallet = useCallback(async (silent = false): Promise<CreditWallet | null> => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await creditService.getWallet();
      if (isMountedRef.current) {
        setWallet(data);
        setError(null);
      }
      return data;
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const errMsg = err instanceof Error ? err.message : "Failed to load wallet balance";
        setError(errMsg);
        console.warn("Could not fetch wallet:", errMsg);
      }
      return null;
    } finally {
      if (isMountedRef.current && !silent) {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchPacks = useCallback(async (): Promise<CreditPack[]> => {
    setIsPacksLoading(true);
    setPacksError(null);
    try {
      const data = await creditService.getPacks();
      if (isMountedRef.current) {
        setPacks(data);
      }
      return data;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to load credit packages";
      if (isMountedRef.current) {
        setPacksError(errMsg);
      }
      return [];
    } finally {
      if (isMountedRef.current) {
        setIsPacksLoading(false);
      }
    }
  }, []);

  // Fetch wallet on mount or authentication change
  useEffect(() => {
    if (isAuthenticated) {
      refreshWallet(false);
      fetchPacks();
    } else {
      setWallet(null);
      setError(null);
      setPacks([]);
    }
  }, [isAuthenticated, refreshWallet, fetchPacks]);

  // Subscribe to module-level events for seamless triggering from SSE and HTTP hooks
  useEffect(() => {
    const unsubInsufficient = creditEvents.onInsufficient((info) => {
      setInsufficientInfo(info);
      setIsInsufficientModalOpen(true);
    });

    const unsubRefresh = creditEvents.onRefresh(() => {
      refreshWallet(true);
    });

    return () => {
      unsubInsufficient();
      unsubRefresh();
    };
  }, [refreshWallet]);

  const openPurchaseModal = useCallback(() => {
    if (packs.length === 0 && !isPacksLoading) {
      fetchPacks();
    }
    setIsPurchaseModalOpen(true);
  }, [packs.length, isPacksLoading, fetchPacks]);

  const closePurchaseModal = useCallback(() => {
    setIsPurchaseModalOpen(false);
  }, []);

  const openInsufficientModal = useCallback((info?: InsufficientCreditsInfo) => {
    setInsufficientInfo(info || null);
    setIsInsufficientModalOpen(true);
  }, []);

  const closeInsufficientModal = useCallback(() => {
    setIsInsufficientModalOpen(false);
  }, []);

  return (
    <CreditWalletContext.Provider
      value={{
        wallet,
        isLoading,
        error,
        packs,
        isPacksLoading,
        packsError,
        isPurchaseModalOpen,
        isInsufficientModalOpen,
        insufficientInfo,
        refreshWallet,
        fetchPacks,
        openPurchaseModal,
        closePurchaseModal,
        openInsufficientModal,
        closeInsufficientModal,
      }}
    >
      {children}
      <CreditPurchaseModal />
      <InsufficientCreditsModal />
    </CreditWalletContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCreditWallet = (): CreditWalletContextType => {
  const context = useContext(CreditWalletContext);
  if (!context) {
    throw new Error("useCreditWallet must be used within a CreditWalletProvider");
  }
  return context;
};

export default CreditWalletContext;
