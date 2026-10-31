import React, { useState } from 'react';
import { Image, Pressable, StatusBar, StyleSheet, View } from 'react-native';
const artwork = {
  welcomeBrandGlow: require('../web/public/assets/welcome/brand-glow.png'),
  welcomeDivider: require('../web/public/assets/welcome/divider.png'),
  welcomeSpark: require('../web/public/assets/welcome/spark.png'),
  welcomeDot: require('../web/public/assets/welcome/dot.png'),
  welcomeButton: require('../web/public/assets/welcome/button.png'),
  welcomeEdge: require('../web/public/assets/welcome/edge.png'),
  welcomeHeading: require('../web/public/assets/welcome/heading.png'),
  welcomeTagline: require('../web/public/assets/welcome/tagline.png'),
  welcomeLabel: require('../web/public/assets/welcome/button-label.png'),
};

function Artwork({ name, left, top, width, height, scale, mirrored = false }) {
  return <Image source={artwork[name]} accessible={false} fadeDuration={0} resizeMode="stretch" style={{position:'absolute',left:left*scale,top:top*scale,width:width*scale,height:height*scale,transform:mirrored?[{scaleX:-1}]:[]}}/>;
}

export default function WelcomeScreen({ onStart }) {
  const [viewport, setViewport] = useState({width:407,height:882});
  // Keep every layer on the same artboard on phones. Crop the outer artwork,
  // rather than scaling the background and the lettering independently.
  const scale = viewport.height >= viewport.width
    ? Math.max(viewport.width / 407, viewport.height / 882)
    : Math.min(viewport.width / 407, viewport.height / 882, 1);
  const at = (left, top, width, height) => ({position:'absolute',left:left*scale,top:top*scale,width:width*scale,...(height == null ? {} : {height:height*scale})});
  return <View style={s.safe}>
    <StatusBar barStyle="light-content" translucent backgroundColor="transparent"/>
    <View onLayout={event => setViewport(event.nativeEvent.layout)} style={s.viewport}>
      <Image source={require('../web/public/assets/welcome/background.png')} style={s.background} resizeMode="cover" accessible={false} fadeDuration={0}/>
      <View style={{position:'absolute',left:(viewport.width-407*scale)/2,top:(viewport.height-882*scale)/2,width:407*scale,height:882*scale}}>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
            <Artwork name="welcomeEdge" scale={scale} left={-.5} top={0} width={7} height={882} mirrored/>
            <Artwork name="welcomeBrandGlow" scale={scale} left={57.37} top={242} width={284.724} height={143.398}/>
            <Artwork name="welcomeDivider" scale={scale} left={99} top={481.25} width={219} height={1.5}/>
            <Artwork name="welcomeSpark" scale={scale} left={178.301} top={437.843} width={50.4971} height={50.4659}/>
            <Artwork name="welcomeDot" scale={scale} left={197.1} top={473.1} width={20.8} height={19.8}/>
          </View>
          <View accessible accessibilityRole="header" accessibilityLabel="Welcome to" style={at(78.681,340.1,258,34)}><Image source={artwork.welcomeHeading} style={s.artworkFill} resizeMode="stretch" accessible={false} fadeDuration={0}/></View>
          <Image source={require('../web/public/assets/welcome/wordmark.png')} accessibilityLabel="Mancord" fadeDuration={0} resizeMode="contain" style={at(105.728,392.882,209,30)}/>
          <View accessible accessibilityLabel="Your spaces, your people." style={at(92.519,443.687,242,19)}><Image source={artwork.welcomeTagline} style={s.artworkFill} resizeMode="stretch" accessible={false} fadeDuration={0}/></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Start Your New Begining!" onPress={onStart} hitSlop={8} style={({pressed})=>[s.begin,at(106,540,212,44),{opacity:pressed ? 0.8 : 1}]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}><Artwork name="welcomeButton" scale={scale} left={-6} top={-6} width={224} height={56}/></View>
            <Image source={artwork.welcomeLabel} style={at(19.023,16.237,172,16)} resizeMode="stretch" accessible={false} fadeDuration={0}/>
          </Pressable>
      </View>
    </View>
  </View>;
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#17052d'},viewport:{flex:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},
  background:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
  artworkFill:{width:'100%',height:'100%'},
  begin:{borderRadius:103},
});
