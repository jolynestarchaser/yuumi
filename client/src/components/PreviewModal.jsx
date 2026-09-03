import { useDesktopStore } from '../store/desktopStore.js';

export default function PreviewModal() {
  const item = useDesktopStore((state) => state.previewItem); const close = useDesktopStore((state) => state.setPreview);
  if (!item) return null;
  const body = item.type === 'image' ? <img className="preview-image" src={item.asset?.secureUrl} alt={item.name} /> : item.type === 'video' ? <video className="preview-video" src={item.asset?.secureUrl} poster={item.asset?.thumbnailUrl} controls preload="metadata" /> : item.type === 'link' ? <section className="link-preview"><img src={item.metadata?.previewImage} alt="" /><p>{item.metadata?.siteName}</p><h2>{item.metadata?.title || item.name}</h2><p>{item.metadata?.description}</p><a href={item.url} target="_blank" rel="noreferrer">Visit site ↗</a></section> : <section className="note-preview"><p>{item.content}</p></section>;
  return <div className="modal-backdrop" role="presentation" onMouseDown={() => close(null)}><section className="preview-modal" role="dialog" aria-modal="true" aria-label={item.name} onMouseDown={(e) => e.stopPropagation()}><header><span>{item.name}</span><button onClick={() => close(null)} aria-label="Close preview">×</button></header>{body}</section></div>;
}

