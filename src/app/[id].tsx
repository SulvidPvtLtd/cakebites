import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

const ProductDetailsScreen = () => {

  const {id} = useLocalSearchParams();

  return (
    <View>
      <Text style={{ color: 'orange', fontSize:20 }}> Product Details Screen for id: {id}</Text>
    </View>
  )
}

export default ProductDetailsScreen;

