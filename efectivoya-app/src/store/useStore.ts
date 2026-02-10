import { create } from 'zustand';

interface AppState {
  unreadMessages: number;
  setUnreadMessages: (count: number) => void;
  incrementUnread: () => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  unreadMessages: 0,
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  incrementUnread: () =>
    set((state) => ({ unreadMessages: state.unreadMessages + 1 })),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
