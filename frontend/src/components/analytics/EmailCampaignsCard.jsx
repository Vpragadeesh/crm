import { useState, useEffect, useCallback } from 'react';
import { Mail, MousePointer, Eye, TrendingUp } from 'lucide-react';
import * as advancedAnalyticsService from '../../services/advancedAnalyticsService';
import * as cookieCache from '../../utils/cookieCache';

const EmailCampaignsCard = ({ filters, onLoadTime }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      const cached = cookieCache.getCachedReport('email-campaigns', filters);
      
      if (cached) {
        setData(cached.data);
        onLoadTime(Math.round(performance.now() - startTime), true);
        setLoading(false);
        return;
      }

      const response = await advancedAnalyticsService.getEmailCampaigns(filters);
      setData(response.data);
      cookieCache.cacheReport('email-campaigns', filters, response.data);
      onLoadTime(Math.round(performance.now() - startTime), false);
    } catch (err) {
      setError(err.message || 'Failed to load email campaign data');
    } finally {
      setLoading(false);
    }
  }, [filters, onLoadTime]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (!data) return null;

  const { overall, templates = [], timeline = [] } = data;

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Total Emails Sent</span>
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{overall.total_emails || 0}</p>
          <p className="text-xs text-blue-600 mt-1">Outbound emails</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Total Link Clicks</span>
            <MousePointer className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{overall.total_clicks || 0}</p>
          <p className="text-xs text-purple-600 mt-1">Clicked tracking links</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Overall Click Rate</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {overall.click_rate ? `${overall.click_rate}%` : '0%'}
          </p>
          <p className="text-xs text-green-600 mt-1">Clicks per sent email</p>
        </div>
      </div>

      {/* Template Performance */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Performance</h3>
        {templates.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            No template performance data available. Template tracking is not enabled for these emails.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Template</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Sent</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Clicks</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Click Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map((template, index) => (
                  <tr key={template.template_id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{template.template_name}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{template.emails_sent}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{template.clicks}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        template.click_rate >= 5 
                          ? 'bg-green-100 text-green-800' 
                          : template.click_rate >= 2 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {template.click_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      {timeline.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last 30 Days Activity</h3>
          <div className="space-y-2">
            {timeline.slice(0, 10).map((day) => {
              const maxEmails = Math.max(...timeline.map(d => d.emails_sent));
              const percentage = maxEmails > 0 ? (day.emails_sent / maxEmails) * 100 : 0;

              return (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center px-3 transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {day.emails_sent} sent
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1 font-semibold text-gray-700">
                      <MousePointer className="w-3.5 h-3.5 text-sky-500" />
                      {day.clicks || 0} clicks
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCampaignsCard;
