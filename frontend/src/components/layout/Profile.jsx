import { User, Settings, LogOut } from "lucide-react";

const Profile = ( {user, logout, setUserMenuOpen} ) => {
    return (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
                <button
                onClick={() => {
                    setUserMenuOpen(false);
                    // TODO: Navigate to profile
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                <User className="w-4 h-4 text-gray-400" />
                My Profile
                </button>
                <button
                onClick={() => {
                    setUserMenuOpen(false);
                    // TODO: Navigate to settings
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                <Settings className="w-4 h-4 text-gray-400" />
                Settings
                </button>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 pt-2">
                <button
                onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                <LogOut className="w-4 h-4" />
                Logout
                </button>
            </div>
        </div>
    );
}
export default Profile;