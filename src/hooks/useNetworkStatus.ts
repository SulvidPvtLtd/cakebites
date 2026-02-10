import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

type NetworkStatus = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  online: boolean | null;
};

export default function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    let isActive = true;

    const syncInitial = async () => {
      const state = await NetInfo.fetch();
      if (!isActive) return;
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    };

    syncInitial();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!isActive) return;
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const online =
    isConnected === null && isInternetReachable === null
      ? null
      : isConnected !== false && isInternetReachable !== false;

  return { isConnected, isInternetReachable, online };
}
