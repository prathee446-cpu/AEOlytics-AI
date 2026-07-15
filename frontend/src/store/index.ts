import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import articleReducer from './slices/articleSlice';
import aiReducer from './slices/aiSlice';
import importReducer from './slices/importSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    articles: articleReducer,
    ai: aiReducer,
    import: importReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
