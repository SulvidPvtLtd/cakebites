import { useAuth } from "@providers/AuthProvider";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator } from "react-native";

const index = () => {
  const { session, loading, profile, isAdmin } = useAuth();
  // console.log(session); // check if we have access to the session.
  if (loading) {
    return <ActivityIndicator />;
  }
  if (!session) {
    return <Redirect href={"/sign-in"} />;
  }

  if (isAdmin || profile?.group === "ADMIN") {
    return <Redirect href={"/(admin)"} />;
  }

  return <Redirect href={"/(user)"} />;

  return null;
};

export default index;
