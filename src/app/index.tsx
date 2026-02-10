import { useAuth } from "@providers/AuthProvider";
import { Redirect } from "expo-router";
import React from "react";
import AuthLoadingFallback from "@/src/components/AuthLoadingFallback";

const index = () => {
  const { session, loading, isAdmin, loadingTimedOut, refresh } = useAuth();
  // console.log(session); // check if we have access to the session.
  if (loading) {
    return <AuthLoadingFallback timedOut={loadingTimedOut} onRetry={refresh} />;
  }
  if (!session) {
    return <Redirect href={"/(auth)/sign-in"} />;
  }

  if (isAdmin) {
    return <Redirect href={"/role-select"} />;
  }

  return <Redirect href={"/(user)"} />;

  return null;
};

export default index;
