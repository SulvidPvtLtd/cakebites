import { useAuth } from "@providers/AuthProvider";
import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator } from "react-native";

const index = () => {
  const { session, loading, isAdmin, activeGroup } = useAuth();
  // console.log(session); // check if we have access to the session.
  if (loading) {
    return <ActivityIndicator />;
  }
  if (!session) {
    return <Redirect href={"/sign-in"} />;
  }

  if (isAdmin) {
    if (!activeGroup) {
      return <Redirect href={"/admin-choice"} />;
    }
    if (activeGroup === "ADMIN") {
      return <Redirect href={"/(admin)"} />;
    }
    return <Redirect href={"/(user)"} />;
  }

  if (activeGroup === "ADMIN") {
    return <Redirect href={"/(admin)"} />;
  }

  return <Redirect href={"/(user)"} />;

  return null;
};

export default index;
