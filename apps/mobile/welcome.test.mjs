import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
const code = transformSync(readFileSync(new URL('./WelcomeScreen.js', import.meta.url), 'utf8'), {
  babelrc: false, configFile: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
}).code;

function mount() {
  let size, starts = 0;
  const images = [];
  const react = {
    createElement: (type, props, ...children) => typeof type === 'function' ? type({...props,children}) : {type,props:{...props,children}},
    useState(initial) { size ??= initial; return [size, next => { size = next; }]; },
  };
  const exports = {};
  runInNewContext(code, {exports,require(name) {
    if (name === 'react') return {...react,default:react,__esModule:true};
    if (name === 'react-native') return {Image:'Image',Pressable:'Pressable',StatusBar:'StatusBar',Text:'Text',View:'View',StyleSheet:{create:v=>v,absoluteFill:{},absoluteFillObject:{position:'absolute',top:0,left:0,right:0,bottom:0}}};
    if (name.endsWith('.png')) {
      const bytes = readFileSync(new URL(name, import.meta.url));
      assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
      assert.ok(bytes.readUInt32BE(16)>0 && bytes.readUInt32BE(20)>0);
      images.push(name);return name;
    }
    throw new Error(`Unexpected runtime dependency: ${name}`);
  }});
  const render = () => exports.default({onStart:()=>starts++});
  return {render,images,get starts(){return starts;}};
}
function all(node) { return !node || typeof node !== 'object' ? [] : [node,...(node.props?.children||[]).flat(Infinity).flatMap(all)]; }
const style = value => Object.assign({},...(Array.isArray(value)?value:[value]));

test('welcome artwork is bundled locally and start remains usable after layout changes', () => {
  const app=mount();
  for (const [width,height] of [[320,568],[360,800],[390,780],[407,882],[430,932],[768,1024],[568,320]]) {
    all(app.render()).find(n=>n.props?.onLayout).props.onLayout({nativeEvent:{layout:{width,height}}});
    const nodes=all(app.render());
    const frame=nodes.find(n=>n.type==='View' && n.props.style?.width && n.props.style?.height);
    const button=nodes.find(n=>n.type==='Pressable');
    const rect=style(button.props.style({pressed:false}));
    assert.ok(rect.left>=0 && rect.top>=0);
    assert.ok(rect.left+rect.width<=frame.props.style.width);
    assert.ok(rect.top+rect.height<=frame.props.style.height);
    assert.ok(frame.props.style.left+rect.left>=0);
    assert.ok(frame.props.style.left+rect.left+rect.width<=width);
    assert.ok(frame.props.style.top+rect.top>=0);
    assert.ok(frame.props.style.top+rect.top+rect.height<=height);
    button.props.onPress();
    assert.equal(nodes.filter(n=>n.type==='Image').length,11);
  }
  assert.equal(app.starts,7);
  assert.ok(app.images.some(name=>name.endsWith('/background.png')));
});
