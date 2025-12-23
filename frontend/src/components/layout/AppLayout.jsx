import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { CONTACT_STATUS } from '../../utils/constants';

const AppLayout = ({ children }) => {
  const [activeStage, setActiveStage] = useState(CONTACT_STATUS.LEAD);
  
  // Mock contact counts - will be replaced with real data from API
  const [contactCounts] = useState({
    [CONTACT_STATUS.LEAD]: 12,
    [CONTACT_STATUS.MQL]: 8,
    [CONTACT_STATUS.SQL]: 5,
    [CONTACT_STATUS.OPPORTUNITY]: 3,
    [CONTACT_STATUS.CUSTOMER]: 15,
    [CONTACT_STATUS.EVANGELIST]: 4,
    [CONTACT_STATUS.DORMANT]: 2,
  });

  const handleStageChange = (stage) => {
    setActiveStage(stage);
    // TODO: This will trigger data fetching for the selected stage
    console.log('Stage changed to:', stage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar 
          activeStage={activeStage}
          onStageChange={handleStageChange}
          contactCounts={contactCounts}
        />
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Pass activeStage to children so they know which stage is selected */}
            {typeof children === 'function' 
              ? children({ activeStage, contactCounts }) 
              : children
            }
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;