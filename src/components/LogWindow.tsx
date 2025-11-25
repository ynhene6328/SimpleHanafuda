import React, { useEffect, useRef } from 'react';

interface LogWindowProps {
    logs: string[];
}

export const LogWindow: React.FC<LogWindowProps> = ({ logs }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="bg-black/80 text-white p-4 rounded-lg shadow-lg h-64 overflow-y-auto font-mono text-sm border border-gray-600">
            <h3 className="text-gray-400 font-bold mb-2 sticky top-0 bg-black/90 py-1 border-b border-gray-700">
                Action Log
            </h3>
            <div className="flex flex-col gap-1">
                {logs.map((log, index) => (
                    <div key={index} className="break-words">
                        <span className="text-gray-500 mr-2">[{index + 1}]</span>
                        {log}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
