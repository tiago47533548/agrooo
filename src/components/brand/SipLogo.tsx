import React from 'react';

interface SipLogoProps {
  variant?: 'horizontal' | 'vertical' | 'isotipo' | 'monochrome' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSubtitle?: boolean;
}

export const SipLogo: React.FC<SipLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showSubtitle = true
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 38, text: 'text-base', sub: 'text-[11px]' },
    lg: { icon: 48, text: 'text-xl', sub: 'text-xs' },
    xl: { icon: 64, text: 'text-2xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // SVG Symbol: Leaf + Cadastral Parcel + Geo Pin + Digital Node
  const renderIsotipo = (px: number) => {
    const isMonochrome = variant === 'monochrome';
    const isWhite = variant === 'white';

    const bgPin = isWhite ? '#FFFFFF' : isMonochrome ? '#202B25' : '#27865A';
    const leafFill = isWhite ? '#174C35' : isMonochrome ? '#F5F7F5' : '#E8F2EA';
    const parcelStroke = isWhite ? '#E8F2EA' : isMonochrome ? '#78847D' : '#174C35';
    const accentNode = isWhite ? '#E9A23B' : '#E9A23B';

    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="SIP Misiones Isotipo"
      >
        {/* Diamond cadastral parcel contour */}
        <polygon
          points="50,6 92,38 78,88 22,88 8,38"
          stroke={parcelStroke}
          strokeWidth="3.5"
          strokeDasharray="5 3"
          fill="none"
          opacity="0.35"
        />

        {/* Geolocation Pin blended with Yerba Mate Sprout */}
        <path
          d="M50 14 C36 14 26 25 26 38 C26 56 50 82 50 82 C50 82 74 56 74 38 C74 25 64 14 50 14 Z"
          fill={bgPin}
        />

        {/* Inner Leaf Contour / Sprout */}
        <path
          d="M50 24 C43 32 39 42 41 52 C44 58 50 63 50 63 C50 63 56 58 59 52 C61 42 57 32 50 24 Z"
          fill={leafFill}
        />

        {/* Central Leaf Vein & Digital Node Trunk */}
        <line x1="50" y1="28" x2="50" y2="57" stroke={isWhite ? '#174C35' : '#174C35'} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="38" x2="44" y2="34" stroke={isWhite ? '#174C35' : '#174C35'} strokeWidth="2" strokeLinecap="round" />
        <line x1="50" y1="46" x2="56" y2="42" stroke={isWhite ? '#174C35' : '#174C35'} strokeWidth="2" strokeLinecap="round" />

        {/* Digital Telemetry Node at Apex */}
        <circle cx="50" cy="24" r="3" fill={accentNode} />
        <circle cx="50" cy="57" r="2.5" fill={isWhite ? '#174C35' : '#174C35'} />
      </svg>
    );
  };

  if (variant === 'isotipo') {
    return <div className={`inline-flex items-center ${className}`}>{renderIsotipo(currentSize.icon)}</div>;
  }

  const textColor = variant === 'white' 
    ? 'text-white' 
    : variant === 'monochrome' 
      ? 'text-neutral-900' 
      : 'text-[#174C35]';

  const subColor = variant === 'white' 
    ? 'text-white/80' 
    : variant === 'monochrome' 
      ? 'text-neutral-500' 
      : 'text-[#78847D]';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {renderIsotipo(currentSize.icon)}
      <div className="flex flex-col leading-tight select-none">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold tracking-tight ${currentSize.text} ${textColor}`}>
            SIP <span className={variant === 'white' ? 'text-[#E8F2EA]' : 'text-[#27865A]'}>MISIONES</span>
          </span>
        </div>
        {showSubtitle && (
          <span className={`${currentSize.sub} font-medium ${subColor} tracking-normal`}>
            Ministerio del Agro y la Producción
          </span>
        )}
      </div>
    </div>
  );
};
