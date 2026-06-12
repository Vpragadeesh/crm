import { useEffect, memo, useState, lazy, Suspense } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useAdmin } from '../context/AdminContext';
import { AnalyticsTab } from '../components/admin';
import { BarChart3, Package } from 'lucide-react';

const AdvancedAnalyticsPage = lazy(() => import('./AdvancedAnalyticsPage'));

/**
 * AdminAnalyticsPage - Company-wide analytics dashboard for admins
 * Shows overall company performance, not individual employee metrics
 * Uses cached data from AdminContext for optimal performance
 */
const AdminAnalyticsPage = memo(() => {
  const { formatCompact, format: formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Get shared data from context (persists across navigation)
  const {
    analytics,
    analyticsLoading,
    analyticsError,
    fetchAnalytics
  } = useAdmin();

  // Fetch analytics on mount (uses cache if available)
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 -mx-6 px-6 pt-2">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'advanced'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Advanced Analytics</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' ? (
        <AnalyticsTab
          analytics={analytics}
          analyticsLoading={analyticsLoading}
          analyticsError={analyticsError}
          onRetry={() => fetchAnalytics(true)}
          formatCompact={formatCompact}
          formatCurrency={formatCurrency}
        />
      ) : (
        <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading Advanced Analytics...</div>}>
          <AdvancedAnalyticsPage />
        </Suspense>
      )}
    </div>
  );
});

AdminAnalyticsPage.displayName = 'AdminAnalyticsPage';

export default AdminAnalyticsPage;
