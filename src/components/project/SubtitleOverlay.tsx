import React, { useState, useEffect } from 'react';

interface SubtitleOverlayProps {
    text: string;
    styleType: 'minimal' | 'classic' | 'bold';
    isVisible: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ text, styleType, isVisible }) => {
    const [displayText, setDisplayText] = useState('');
    const [fade, setFade] = useState(false);

    useEffect(() => {
        setFade(false);
        const timeout = setTimeout(() => {
            setDisplayText(text);
            setFade(true);
        }, 150);
        return () => clearTimeout(timeout);
    }, [text]);

    const getStyle = () => {
        switch (styleType) {
            case 'bold': return { fontSize: '3.2cqw', fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '-0.02em' };
            case 'classic': return { fontSize: '2.8cqw', fontWeight: 500 };
            default: return { fontSize: '2.4cqw', fontWeight: 300, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)' };
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '4.5cqw',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 6cqw',
        zIndex: 50,
        transition: 'all 1000ms ease-out',
        opacity: fade && isVisible ? 1 : 0,
        transform: fade && isVisible ? 'translateY(0)' : 'translateY(1cqw)'
    };

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: '75cqw', textAlign: 'center' }}>
                <p
                    className="leading-relaxed drop-shadow-[0_0.1cqw_0.5cqw_rgba(0,0,0,0.8)]"
                    style={getStyle()}
                >
                    {displayText}
                </p>
            </div>
        </div>
    );
};
