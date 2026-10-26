import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import AuthFlow from './AuthFlow';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter: require('../web/public/assets/fonts/Inter.ttf'),
    NotoEmoji: require('../web/public/assets/fonts/NotoEmoji.ttf'),
  });
  if (!fontsLoaded && !fontError) return <View style={{flex:1,backgroundColor:'#000',alignItems:'center',justifyContent:'center'}}><ActivityIndicator color="#a684ff"/></View>;
  return <AuthFlow />;
}
