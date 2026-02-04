
import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-4">Yuvro Code</div>
                    <p className="text-gray-400 mb-8">
                        Empowering the next generation of developers
                    </p>
                    <div className="flex justify-center space-x-6">
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
