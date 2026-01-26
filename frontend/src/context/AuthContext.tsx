import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import authService from "../services/authService";
import socketService from "../services/socketService";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  lastRefresh: Date | null;
  login: (email: string, password: string) => Promise<any>;
  register: (
    userData: Partial<UserProfile> & { password: string },
  ) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await authService.getProfile();
      setUser(response.user);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authService.getProfile();
          setUser(response.user);
          setLastRefresh(new Date());

          socketService.connect();
          if (response.user?.id) {
            socketService.joinUserRoom(response.user.id);
          }

          socketService.onProfileRefresh(() => {
            console.log("✨ Backend change detected - Auto-refreshing profile");
            fetchProfile();
          });

          socketService.onUserUpdate((data) => {
            console.log("✨ Backend change detected - User data updated", data);
            fetchProfile();
          });
        } catch (error) {
          console.error("Auth initialization error:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    return () => {
      socketService.removeListener("profile_refresh");
      socketService.removeListener("user_updated");
    };
  }, [token, fetchProfile]);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    localStorage.setItem("token", response.token);
    setToken(response.token);
    setUser(response.user);

    socketService.connect();
    if (response.user?.id) {
      socketService.joinUserRoom(response.user.id);
    }

    return response;
  };

  const register = async (
    userData: Partial<UserProfile> & { password: string },
  ) => {
    const response = await authService.register(userData);
    localStorage.setItem("token", response.token);
    setToken(response.token);
    setUser(response.user);

    socketService.connect();
    if (response.user?.id) {
      socketService.joinUserRoom(response.user.id);
    }

    return response;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    socketService.disconnect();
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    lastRefresh,
    login,
    register,
    logout,
    refreshProfile,
    isAuthenticated: Boolean(token && user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
