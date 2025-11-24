import React from 'react';

interface KoiKoiModalProps {
    onKoiKoi: () => void;
    onShobu: () => void;
    yakuName: string;
    score: number;
}

export const KoiKoiModal: React.FC<KoiKoiModalProps> = ({
    onKoiKoi,
    onShobu,
    yakuName,
    score,
}) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl text-center border-4 border-red-600 max-w-md w-full mx-4">
                <h2 className="text-3xl font-bold mb-4 text-red-600">役成立！</h2>
                <div className="mb-6">
                    <p className="text-xl font-bold text-gray-800">{yakuName}</p>
                    <p className="text-lg text-gray-600">{score} 文</p>
                </div>
                <p className="mb-8 text-gray-700">勝負しますか？こいこいしますか？</p>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={onShobu}
                        className="px-6 py-3 bg-gray-800 text-white rounded-full font-bold hover:bg-gray-700 transition-colors shadow-lg"
                    >
                        勝負 (Shobu)
                    </button>
                    <button
                        onClick={onKoiKoi}
                        className="px-6 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-500 transition-colors shadow-lg animate-pulse"
                    >
                        こいこい (Koi-Koi)
                    </button>
                </div>
            </div>
        </div>
    );
};
