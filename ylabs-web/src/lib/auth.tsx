import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import authService from '../services/authService';

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  roles?: {
    ycode?: string;
    ylabs?: string;
  };
  is_active?: boolean;
  date_joined?: string;
  last_login?: string;
  github_connected?: boolean;
  profile?: {
    about?: string;
    avatar?: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

export interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

const getInitialState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    };
  }

  const accessToken = localStorage.getItem('access');
  const storedUser = localStorage.getItem('user');

  let user = null;
  if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
    try {
      user = JSON.parse(storedUser);
    } catch (e) {
      console.warn('Failed to parse stored user data:', e);
      localStorage.removeItem('user');
    }
  }

  if (accessToken) {
    return {
      user,
      token: accessToken,
      isLoading: true,
      isAuthenticated: true,
    };
  }
  return {
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, getInitialState());

  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      localStorage.setItem('access', state.token);
      authService.setAuthToken(state.token);
    } else {
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
    }
  }, [state.isAuthenticated, state.token]);

  useEffect(() => {
    const accessToken = localStorage.getItem('access');

    if (accessToken) {
      authService.setAuthToken(accessToken);
      authService.initializeFromStorage();

      authService
        .getCurrentUser()
        .then((userData) => {
          localStorage.setItem('user', JSON.stringify(userData));
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: userData, token: accessToken },
          });
        })
        .catch((error) => {
          console.error('Failed to fetch user on load:', error);
          if (error.status === 401) {
            authService.logoutUser();
            dispatch({ type: 'LOGIN_FAILURE' });
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = (user: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user, token },
    });
  };

  const logout = () => {
    localStorage.removeItem('user');
    authService.logoutUser();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
