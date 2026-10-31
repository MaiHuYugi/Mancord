import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require=createRequire(import.meta.url);
const {transformSync}=require('@babel/core');
const source=transformSync(readFileSync(new URL('./UpdatedAuthScreen.js',import.meta.url),'utf8'),{babelrc:false,configFile:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']}).code;
function mount(register,busy=false){
  let size;const changes=[],modes=[];let submits=0;
  const react={createElement:(type,props,...children)=>typeof type==='function'?type({...props,children}):{type,props:{...props,children}},useState(initial){size??=initial;return[size,v=>size=v];}};
  const exports={};runInNewContext(source,{exports,require(name){
    if(name==='react')return {...react,default:react,__esModule:true};
    if(name==='react-native')return {...Object.fromEntries(['Image','KeyboardAvoidingView','Pressable','SafeAreaView','ScrollView','StatusBar','Text','TextInput','View'].map(n=>[n,n])),Platform:{OS:'android'},StyleSheet:{create:s=>s}};
    if(name.endsWith('.png')){assert.ok(readFileSync(new URL(name,import.meta.url)).length>0);return name;}
    throw new Error(`Unexpected service dependency: ${name}`);
  }});
  const props={register,busy,setMode:v=>modes.push(v),email:'',setEmail:v=>changes.push(['email',v]),password:'',setPassword:v=>changes.push(['password',v]),confirm:'',setConfirm:v=>changes.push(['confirm',v]),username:'',setUsername:v=>changes.push(['username',v]),submit:()=>submits++,ContinueButton:'ContinueButton'};
  return {render:()=>exports.default(props),props,changes,modes,get submits(){return submits;}};
}
function all(node){return !node||typeof node!=='object'?[]:[node,...(node.props.children||[]).flat(Infinity).flatMap(all)];}

test('updated registration retains controlled fields, confirmation, errors, and existing submit callback',()=>{
  const app=mount(true);let nodes=all(app.render());
  const fields=nodes.filter(n=>n.type==='TextInput');assert.equal(fields.length,4);
  fields.forEach((field,i)=>field.props.onChangeText(`value-${i}`));
  assert.deepEqual(app.changes.map(([name])=>name),['username','email','password','confirm']);
  assert.equal(fields[2].props.secureTextEntry,true);assert.equal(fields[3].props.secureTextEntry,true);
  nodes.find(n=>n.type==='ContinueButton').props.onPress();assert.equal(app.submits,1);
  app.props.error='Passwords do not match';nodes=all(app.render());assert.ok(nodes.some(n=>n.type==='Text'&&n.props.children.includes(app.props.error)));
});

test('updated login preserves email sign-in, navigation, busy states, and disabled social providers',()=>{
  const app=mount(false,true);let nodes=all(app.render());
  assert.deepEqual(nodes.filter(n=>n.type==='TextInput').map(n=>n.props.accessibilityLabel),['Email Address','Password']);
  assert.ok(nodes.filter(n=>n.type==='TextInput').every(n=>n.props.editable===false));
  assert.equal(nodes.find(n=>n.type==='ContinueButton').props.busy,true);
  assert.ok(nodes.filter(n=>n.type==='Pressable').every(n=>n.props.disabled));
  app.props.busy=false;nodes=all(app.render());
  nodes.find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Back to welcome').props.onPress();
  nodes.find(n=>n.type==='Pressable'&&!n.props.accessibilityLabel).props.onPress();
  assert.deepEqual(app.modes,['welcome','register']);
});
