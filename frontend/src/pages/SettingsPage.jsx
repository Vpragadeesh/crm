import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout';
import { Button } from '../components/ui';
import { getConnectionStatus, getConnectUrl, disconnectEmail } from '../services/emailService';
import { Mail, Check, X, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailError, setEmailError] = useState(null);
  const [connectingEmail, setConnectingEmail] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  ];

  // Check for OAuth callback params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('email_connected') === 'true') {
      setEmailConnected(true);
      setActiveTab('integrations');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('email_error')) {
      setEmailError('Failed to connect Gmail account. Please try again.');
      setActiveTab('integrations');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check email connection status on mount
  useEffect(() => {
    checkEmailStatus();
  }, []);

  const checkEmailStatus = async () => {
    try {
      setEmailLoading(true);
      const status = await getConnectionStatus();
      setEmailConnected(status.connected);
    } catch (error) {
      console.error('Failed to check email status:', error);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConnectEmail = async () => {
    try {
      setConnectingEmail(true);
      setEmailError(null);
      const { authUrl } = await getConnectUrl();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      setEmailError('Failed to initiate connection. Please try again.');
      setConnectingEmail(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? You will not be able to send emails until you reconnect.')) {
      return;
    }
    
    try {
      setEmailLoading(true);
      await disconnectEmail();
      setEmailConnected(false);
    } catch (error) {
      setEmailError('Failed to disconnect. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Settings Header */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-sky-100 p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-sky-100 p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-sky-100 text-sky-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-sky-100 p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        defaultValue={user?.phone}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.department}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button>Save Changes</Button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">Email Notifications</h3>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">Lead Updates</h3>
                        <p className="text-sm text-gray-600">Get notified when leads change status</p>
                      </div>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">Deal Alerts</h3>
                        <p className="text-sm text-gray-600">Notifications for deal milestones</p>
                      </div>
                      <input type="checkbox" className="rounded" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">Integrations</h2>
                  <p className="text-gray-600">Connect your accounts to enable additional features</p>
                  
                  {emailError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-800">{emailError}</p>
                      </div>
                      <button onClick={() => setEmailError(null)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Gmail Integration Card */}
                  <div className="border border-gray-200 rounded-xl p-5 hover:border-sky-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                          <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">Gmail</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Send emails to contacts directly from your Gmail account
                          </p>
                          {emailConnected && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-sm text-green-600">Connected as {user?.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        {emailLoading ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Checking...</span>
                          </div>
                        ) : emailConnected ? (
                          <button
                            onClick={handleDisconnectEmail}
                            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={handleConnectEmail}
                            disabled={connectingEmail}
                            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {connectingEmail ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                Connect
                                <ExternalLink className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {!emailConnected && !emailLoading && (
                      <div className="mt-4 p-4 bg-sky-50 rounded-lg">
                        <h4 className="text-sm font-medium text-sky-800 mb-2">Why connect Gmail?</h4>
                        <ul className="text-sm text-sky-700 space-y-1">
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Send emails to contacts directly from CRM
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Emails appear from your own address
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Track email opens and clicks
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Keep email history with contacts
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Future Integrations */}
                  <div className="border border-dashed border-gray-200 rounded-xl p-5 opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl">📅</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-500">Google Calendar</h3>
                        <p className="text-sm text-gray-400">Coming soon - Sync meetings and events</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">Security Settings</h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-green-800">Google OAuth Connected</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Your account is secured with Google authentication
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-800 mb-2">Account Role</h3>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-sm text-gray-600 capitalize">
                          {user?.role?.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-800">Preferences</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Pipeline View
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                        <option>Lead</option>
                        <option>MQL</option>
                        <option>SQL</option>
                        <option>Opportunity</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Items per Page
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                        <option>100</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;