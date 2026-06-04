import { useState, useEffect } from 'react';
import { Phone, Mail, DollarSign, Star } from 'lucide-react';
import * as advancedAnalyticsService from '../../services/advancedAnalyticsService';
import * as cookieCache from '../../utils/cookieCache';

const TeamPerformanceCard = ({ filters, onLoadTime }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      const cached = cookieCache.getCachedReport('team-performance', filters);
      
      if (cached) {
        setData(cached.data);
        onLoadTime(Math.round(performance.now() - startTime), true);
        setLoading(false);
        return;
      }

      const response = await advancedAnalyticsService.getTeamPerformance(filters);
      setData(response.data);
      cookieCache.cacheReport('team-performance', filters, response.data);
      onLoadTime(Math.round(performance.now() - startTime), false);
    } catch (err) {
      setError(err.message || 'Failed to load team performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-gray-600">No team performance data available</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Team Leaderboard</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Employee</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Contacts</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Calls</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Emails</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Sessions</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Deals</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((emp, index) => (
              <tr key={emp.emp_id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {index < 3 && (
                      <span className="text-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.department || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-sm font-medium text-gray-900">{emp.total_contacts}</div>
                  <div className="text-xs text-green-600">{emp.customers_converted} converted</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">{emp.total_calls}</span>
                  </div>
                  <div className="text-xs text-gray-500">{Math.round((Number(emp.avg_call_duration) || 0) / 60)}m avg</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Mail className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-900">{emp.total_emails_sent}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {Number(emp.total_emails_sent) > 0 
                      ? `${Math.round((Number(emp.emails_clicked || 0) / Number(emp.total_emails_sent)) * 100)}% clicked`
                      : '0% clicked'
                    }
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-900">{emp.total_sessions}</span>
                  </div>
                  <div className="text-xs text-gray-500">{Number(emp.avg_session_rating || 0).toFixed(1)} avg rating</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-sm font-medium text-gray-900">{emp.total_deals}</div>
                  <div className="text-xs text-gray-500">${Math.round(Number(emp.avg_deal_value) || 0).toLocaleString()} avg</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-bold text-green-600">
                      ${Math.round(Number(emp.total_deal_value) || 0).toLocaleString()}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamPerformanceCard;
