const icons = {
  logo: 'f99ab', bolt: 'cda8a', addServer: 'c6c93', down: 'baa4a', bell: '45459',
  plus: '007a4', voice: '2ff42', mic: '1068d', headphones: '85bec', settings: 'f0701',
  camera: 'd76ab', back: 'eb472', editCamera: '8d397', user: 'a20a2', right: '22d38',
  mail: 'a5583', lock: 'd2e5b', status: 'aae42', dm: '838a5', activity: '676f8',
  notifications: 'bcf2e', mention: '0f2e7', announcement: '2bdac', trash: 'e0f74', dangerRight: 'f78b6',
  serverBack: '4f198', serverCamera: '93329', serverName: '6b721', description: '22450',
  region: '8ca59', members: 'c5481', invite: '7795f', bans: '45fc8', roles: 'd3a91',
  permissions: 'e2df1', bots: '7221d', channels: '5a0d7', categories: '4d58a', transfer: 'e5bda', transferRight: '3481d',
  interestsBack: 'd4fed',
};

export default function DesignIcon({ name, className = '' }) {
  return <img className={`design-icon ${className}`} src={`/assets/design/${icons[name]}.svg`} alt="" aria-hidden="true"/>;
}

export function Glyph({ children, className = '' }) { return <span className={`design-glyph ${className}`} aria-hidden="true">{children}</span>; }
