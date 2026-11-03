import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from '../../services/firebaseClient';

interface ProtectedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> { src: string; }

export const ProtectedImage: React.FC<ProtectedImageProps> = ({ src, ...props }) => {
  const [resolved, setResolved] = useState(src.startsWith('storagePath:') ? '' : src);
  useEffect(() => {
    let cancelled = false;
    setResolved(src.startsWith('storagePath:') ? '' : src);
    if (src.startsWith('storagePath:')) {
      void httpsCallable<{ path: string }, { url: string }>(firebaseFunctions, 'getResponsePhotoUrl')({ path: src.slice('storagePath:'.length) })
        .then(({ data }) => { if (!cancelled) setResolved(data.url); })
        .catch(() => { if (!cancelled) setResolved(''); });
    }
    return () => { cancelled = true; };
  }, [src]);
  return resolved ? <img {...props} src={resolved} /> : null;
};
