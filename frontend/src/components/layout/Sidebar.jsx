import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Target, 
  Crown, 
  Star, 
  Moon,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = ({ activeStage, onStageChange, contactCounts = {}, collapsed = false, onToggle }) => {
  const stages = [
    { 
      id: 'LEAD', 
      label: 'Lead', 
      icon: UserPlus, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      activeColor: 'bg-gray-600 text-white'
    },
    { 
      id: 'MQL', 
      label: 'MQL', 
      icon: Users, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      activeColor: 'bg-blue-600 text-white'
    },
    { 
      id: 'SQL', 
      label: 'SQL', 
      icon: UserCheck, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      activeColor: 'bg-purple-600 text-white'
    },
    { 
      id: 'OPPORTUNITY', 
      label: 'Opportunity', 
      icon: Target, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      activeColor: 'bg-yellow-600 text-white'
    },
    { 
      id: 'CUSTOMER', 
      label: 'Customer', 
      icon: Crown, 
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      activeColor: 'bg-green-600 text-white'
    },
    { 
      id: 'EVANGELIST', 
      label: 'Evangelist', 
      icon: Star, 
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      activeColor: 'bg-pink-600 text-white'
    },
    { 
      id: 'DORMANT', 
      label: 'Dormant', 
      icon: Moon, 
      color: 'text-slate-500',
      bgColor: 'bg-slate-100',
      activeColor: 'bg-slate-500 text-white'
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-sm z-30 w-64 flex flex-col">
      {/* Logo - Always visible and static */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="font-bold text-gray-800 text-lg">CRM Pro</span>
        </div>
      </div>

      {/* Scrollable Pipeline Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Pipeline Header with Toggle */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pipeline
            </h3>
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>

          {/* Pipeline Navigation */}
          <nav className={`space-y-1 transition-all duration-300 ${collapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            {stages.map((stage) => {
              const Icon = stage.icon;
              const isActive = activeStage === stage.id;
              const count = contactCounts[stage.id] || 0;
              
              return (
                <button
                  key={stage.id}
                  onClick={() => onStageChange(stage.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive 
                      ? stage.activeColor + ' shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : stage.color}`} />
                  <span className="flex-1 text-left font-medium text-sm">{stage.label}</span>
                  {count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? 'bg-white/20' : stage.bgColor + ' ' + stage.color
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Collapsed State - Show only icons */}
          {collapsed && (
            <nav className="space-y-1">
              {stages.map((stage) => {
                const Icon = stage.icon;
                const isActive = activeStage === stage.id;
                
                return (
                  <button
                    key={stage.id}
                    onClick={() => onStageChange(stage.id)}
                    className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-all ${
                      isActive 
                        ? stage.activeColor + ' shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title={stage.label}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? '' : stage.color}`} />
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-gray-100 my-2"></div>

        {/* Other Menu Items */}
        <div className="p-4">
          <h3 className={`text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 ${collapsed ? 'sr-only' : ''}`}>
            Insights
          </h3>
          <nav className="space-y-1">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${collapsed ? 'justify-center' : ''}`}
              title="Analytics"
            >
              <BarChart3 className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Analytics</span>}
            </button>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all ${collapsed ? 'justify-center' : ''}`}
              title="Settings"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm">Settings</span>}
            </button>
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;