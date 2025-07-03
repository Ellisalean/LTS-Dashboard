import React from 'react';
import { User } from '../types.ts';
import { LogoutIcon } from './Icons.tsx';

interface HeaderProps {
    user: User;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
    return (
        <header className="flex items-center justify-end h-20 px-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
            <div className="flex items-center">
                <div className="text-right mr-4">
                    <p className="font-semibold text-gray-800 dark:text-white">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <img className="h-12 w-12 rounded-full object-cover" src={user.avatarUrl} alt="User Avatar" />
                 <button onClick={onLogout} className="ml-6 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-white focus:outline-none transition-colors">
                    <LogoutIcon className="h-6 w-6" />
                </button>
            </div>
        </header>
    );
};

export default Header;