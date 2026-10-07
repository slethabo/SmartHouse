import { useState } from 'react';
import { Icon } from '../ui/Icon';

/** Plan image with a graceful placeholder when there is no URL or it fails. */
export function PlanImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`plan-placeholder ${className}`} role="img" aria-label={alt}>
        <Icon name="house" size={48} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}
