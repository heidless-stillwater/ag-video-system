import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface CounterInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    className?: string;
    label?: string;
}

export const CounterInput: React.FC<CounterInputProps> = ({
    value,
    onChange,
    min = 0,
    max,
    step = 1,
    unit = '',
    className = '',
    label
}) => {
    const handleDecrement = () => {
        const newValue = Math.max(min, value - step);
        onChange(newValue);
    };

    const handleIncrement = () => {
        const newValue = max !== undefined ? Math.min(max, value + step) : value + step;
        onChange(newValue);
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {label}
                </label>
            )}
            <div className="flex items-center bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
                <button
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="p-2 hover:bg-white/5 disabled:opacity-20 text-slate-400 transition-colors"
                    title="Decrement"
                >
                    <Minus size={14} />
                </button>
                
                <div className="flex-1 relative flex items-center justify-center min-w-[60px]">
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) onChange(val);
                        }}
                        className="w-full bg-transparent border-none text-center text-sm text-white focus:outline-none focus:ring-0 font-mono py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {unit && (
                        <span className="absolute right-2 text-[10px] font-mono text-slate-600 pointer-events-none">
                            {unit}
                        </span>
                    )}
                </div>

                <button
                    onClick={handleIncrement}
                    disabled={max !== undefined && value >= max}
                    className="p-2 hover:bg-white/5 disabled:opacity-20 text-slate-400 transition-colors"
                    title="Increment"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};
