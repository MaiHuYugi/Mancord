export default function Avatar({ person, small = false }) {
  const isVideo = person.mediaType?.startsWith('video/');
  return <div className={`avatar ${person.color || 'blue'} ${small ? 'small' : ''} ${person.mediaUrl ? 'media-avatar' : ''}`}>
    {person.mediaUrl ? (isVideo ? <video src={person.mediaUrl} autoPlay muted loop playsInline /> : <img src={person.mediaUrl} alt="" />) : person.avatar}
    <i />
  </div>;
}

