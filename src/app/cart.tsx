import { Platform, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { StatusBar } from 'expo-status-bar'

const CartSrceen = () => {
  return (
    <View>
      <Text>CartSrceen</Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  )
}

export default CartSrceen

const styles = StyleSheet.create({})