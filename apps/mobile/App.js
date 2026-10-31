import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import AuthFlow from './AuthFlow';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter: require('../web/public/assets/fonts/Inter.ttf'),
    NotoEmoji: require('../web/public/assets/fonts/NotoEmoji.ttf'),
  });
  if (!fontsLoaded && !fontError) return <View style={{flex:1,backgroundColor:'#17052d',alignItems:'center',justifyContent:'center'}}><Image source={require('../web/public/assets/welcome/background.png')} style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]} resizeMode="cover" fadeDuration={0}/><ActivityIndicator color="#a684ff"/></View>;
  return <AuthFlow />;
}
