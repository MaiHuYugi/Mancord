import React, { useEffect, useState } from 'react';
import { useAssets } from 'expo-asset';
import { SvgXml } from 'react-native-svg';
import { readSvgAsset } from './svgAsset';

const assets = {
  dmButton: require('../web/public/assets/dm/button-overlay.svg'),
  textBackground: require('../web/public/assets/text-channel/background.svg'),
  textHeader: require('../web/public/assets/text-channel/header.svg'),
  textBack: require('../web/public/assets/text-channel/back.svg'),
  textOnline: require('../web/public/assets/text-channel/online.svg'),
  textSearch: require('../web/public/assets/text-channel/search.svg'),
  textComposer: require('../web/public/assets/text-channel/composer.svg'),
  textPlus: require('../web/public/assets/text-channel/plus.svg'),
  textDivider: require('../web/public/assets/text-channel/divider.svg'),
  textSmile: require('../web/public/assets/text-channel/smile.svg'),
  textEye: require('../web/public/assets/text-channel/eye.svg'),
  textMouth: require('../web/public/assets/text-channel/mouth.svg'),
  authUser: require('../web/public/assets/auth/user.svg'),
  authMail: require('../web/public/assets/auth/mail.svg'),
  authLock: require('../web/public/assets/auth/lock.svg'),
  authApple: require('../web/public/assets/auth/apple.svg'),

  logo: require('../web/public/assets/design/f99ab.svg'),
  bolt: require('../web/public/assets/design/cda8a.svg'),
  addServer: require('../web/public/assets/design/c6c93.svg'),
  down: require('../web/public/assets/design/baa4a.svg'),
  bell: require('../web/public/assets/design/45459.svg'),
  plus: require('../web/public/assets/design/007a4.svg'),
  voice: require('../web/public/assets/design/2ff42.svg'),
  mic: require('../web/public/assets/design/1068d.svg'),
  headphones: require('../web/public/assets/design/85bec.svg'),
  settings: require('../web/public/assets/design/f0701.svg'),
  camera: require('../web/public/assets/design/d76ab.svg'),
  back: require('../web/public/assets/design/eb472.svg'),
  editCamera: require('../web/public/assets/design/8d397.svg'),
  user: require('../web/public/assets/design/a20a2.svg'),
  right: require('../web/public/assets/design/22d38.svg'),
  mail: require('../web/public/assets/design/a5583.svg'),
  lock: require('../web/public/assets/design/d2e5b.svg'),
  status: require('../web/public/assets/design/aae42.svg'),
  dm: require('../web/public/assets/design/838a5.svg'),
  activity: require('../web/public/assets/design/676f8.svg'),
  notifications: require('../web/public/assets/design/bcf2e.svg'),
  mention: require('../web/public/assets/design/0f2e7.svg'),
  announcement: require('../web/public/assets/design/2bdac.svg'),
  trash: require('../web/public/assets/design/e0f74.svg'),
  dangerRight: require('../web/public/assets/design/f78b6.svg'),
  serverBack: require('../web/public/assets/design/4f198.svg'),
  serverCamera: require('../web/public/assets/design/93329.svg'),
  serverName: require('../web/public/assets/design/6b721.svg'),
  description: require('../web/public/assets/design/22450.svg'),
  region: require('../web/public/assets/design/8ca59.svg'),
  members: require('../web/public/assets/design/c5481.svg'),
  invite: require('../web/public/assets/design/7795f.svg'),
  bans: require('../web/public/assets/design/45fc8.svg'),
  roles: require('../web/public/assets/design/d3a91.svg'),
  permissions: require('../web/public/assets/design/e2df1.svg'),
  bots: require('../web/public/assets/design/7221d.svg'),
  channels: require('../web/public/assets/design/5a0d7.svg'),
  categories: require('../web/public/assets/design/4d58a.svg'),
  transfer: require('../web/public/assets/design/e5bda.svg'),
  transferRight: require('../web/public/assets/design/3481d.svg'),
  interestsBack: require('../web/public/assets/design/d4fed.svg'),
};
export default function DesignAsset({ name, size }) {
  const [loadedAssets] = useAssets([assets[name]]);
  const asset = loadedAssets?.[0];
  const [xml, setXml] = useState(null);

  useEffect(() => {
    let active = true;
    setXml(null);
    if (asset) {
      readSvgAsset(asset).then(
        source => { if (active) setXml(source); },
        () => { if (active) setXml(null); },
      );
    }
    return () => { active = false; };
  }, [asset]);

  return xml ? (size ? <SvgXml xml={xml} width={size} height={size}/> : <SvgXml xml={xml}/>) : null;
}
