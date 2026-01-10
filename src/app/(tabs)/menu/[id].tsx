import { Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'

const ProductDetailsScreen = () => {

  const {id} = useLocalSearchParams();

  return (
    <View>
      <Stack.Screen options={{ title: "Details: " + id }}/>
      <Text style={{ color: 'orange', fontSize:20 }}> Product Details Screen for id: {id}</Text>
    </View>
  )
}

export default ProductDetailsScreen;

