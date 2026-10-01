import { useState } from 'react';

interface ImageSlotProps {
  slotKey: string;
  src?: string;
  alt?: string;
  className?: string;
  aspectRatio?: string;
}

export default function ImageSlot({ slotKey, src, alt = '', className = '', aspectRatio = '16 / 9' }: ImageSlotProps) {
  const [failed, setFailed] = useState(false);
  const imageSrc = src && !failed ? src : '/assets/swoosh.webp';
  return (
    <div className={`image-slot ${className}`} data-slot-key={slotKey} style={{ aspectRatio }}>
      <img src={imageSrc} alt={imageSrc === '/assets/swoosh.webp' ? '' : alt} aria-hidden={imageSrc === '/assets/swoosh.webp'} loading="lazy" decoding="async" width="800" height="450" onError={() => setFailed(true)} />
    </div>
  );
}
