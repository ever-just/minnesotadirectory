import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface DecodedToken {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

class AuthService {
  private token: string | null = null;
  private user: User | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeFromStorage();
  }

  private initializeFromStorage() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        try {
          this.user = JSON.parse(storedUser);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          this.clearStorage();
        }
      }

      // Validate token if it exists
      if (this.token && !this.isTokenValid(this.token)) {
        this.clearStorage();
      }
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  private setAuthData(token: string, user: User) {
    this.token = token;
    this.user = user;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    this.scheduleTokenRefresh(token);
  }

  private clearStorage() {
    this.token = null;
    this.user = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  private scheduleTokenRefresh(token: string) {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      const currentTime = Date.now();
      const expTime = decoded.exp * 1000;
      const refreshTime = expTime - currentTime - 5 * 60 * 1000; // Refresh 5 minutes before expiry

      if (refreshTime > 0) {
        this.refreshTimeout = setTimeout(() => {
          this.refreshToken();
        }, refreshTime);
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const response = await fetch('/.netlify/functions/auth-refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        if (data.success && data.token && data.user) {
          this.setAuthData(data.token, data.user);
        }
      } else {
        // Token refresh failed, logout user
        this.logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
      // Use relative URL for Netlify functions (works in both dev and production)
      const response = await fetch('/.netlify/functions/auth-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.token && data.user) {
        this.setAuthData(data.token, data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.token && data.user) {
        this.setAuthData(data.token, data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  }

  async verifyToken(): Promise<boolean> {
    if (!this.token) return false;

    if (!this.isTokenValid(this.token)) {
      this.clearStorage();
      return false;
    }

    try {
      const response = await fetch('/.netlify/functions/auth-verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          this.user = data.user;
          if (typeof window !== 'undefined') {
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          }
          return true;
        }
      }

      this.clearStorage();
      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      this.clearStorage();
      return false;
    }
  }

  logout(): void {
    this.clearStorage();
    
    // Optional: Call logout endpoint to invalidate token on server
    if (this.token) {
      fetch('/.netlify/functions/auth-logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }).catch(() => {
        // Ignore logout endpoint errors
      });
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null && this.isTokenValid(this.token);
  }

  getUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  // Method to get authorization headers for API calls
  getAuthHeaders(): { [key: string]: string } {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
