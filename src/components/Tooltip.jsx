import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export default function Tooltip({ content, position = 'top', children }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-neutral-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-neutral-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-neutral-700',
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
      >
        {children || <HelpCircle className="w-4 h-4" />}
      </button>

      {show && (
        <div
          className={`absolute z-50 w-64 max-w-[min(16rem,calc(50vw-1rem))] break-words p-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl text-xs text-neutral-300 leading-relaxed ${positionClasses[position]}`}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}
