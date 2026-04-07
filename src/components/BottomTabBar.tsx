import { Home, Wallet, ClipboardList, Clock, Plus } from 'lucide-react';

export type TabId = 'home' | 'wallet' | 'plan' | 'history';

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onFabClick: () => void;
  fabOpen: boolean;
}

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'plan', label: 'Plan', icon: ClipboardList },
  { id: 'history', label: 'History', icon: Clock },
];

export default function BottomTabBar({ activeTab, onTabChange, onFabClick, fabOpen }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-2xl mx-auto flex items-center px-2">
        <div className="flex flex-1 justify-around items-center">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                aria-label={label}
                aria-selected={isActive}
                role="tab"
                className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-[56px] min-h-[44px] transition-colors ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
              </button>
            );
          })}
        </div>
        <button
          onClick={onFabClick}
          aria-label={fabOpen ? 'Close menu' : 'Add new'}
          className="ml-2 mr-1 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-layered-md shadow-glow-primary transition-transform active:scale-95"
        >
          <Plus
            size={24}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
          />
        </button>
      </div>
    </nav>
  );
}
