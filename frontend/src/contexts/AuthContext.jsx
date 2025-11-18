import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/user/', {
        withCredentials: true
      })
      console.log('Current logged-in user:', response.data.user)
      setUser(response.data.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      // Always fetch fresh CSRF token before login
      let csrftoken = null;
      try {
        const csrfResponse = await axios.get('/api/auth/csrf/', { withCredentials: true });
        csrftoken = csrfResponse.data.csrfToken;
        console.log('CSRF token fetched successfully');
      } catch (e) {
        console.warn('Could not fetch CSRF token, trying cookie:', e);
        // Fallback to cookie
        csrftoken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
      }

      if (!csrftoken) {
        console.error('No CSRF token available');
        return { success: false, error: 'Unable to get security token. Please refresh the page.' }
      }

      const response = await axios.post(
        '/api/auth/login/',
        { username, password },
        { 
          withCredentials: true,
          headers: { 'X-CSRFToken': csrftoken }
        }
      )
      
      if (response.data.user) {
        setUser(response.data.user)
        return { success: true, user: response.data.user }
      } else {
        return { success: false, error: 'Login failed - no user data received' }
      }
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.response?.data?.message ||
                          'Login failed'
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      // Get CSRF token for logout
      let csrftoken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
      
      if (!csrftoken) {
        try {
          const csrfResponse = await axios.get('/api/auth/csrf/', { withCredentials: true });
          csrftoken = csrfResponse.data.csrfToken;
        } catch (e) {
          console.warn('Could not fetch CSRF token for logout:', e);
        }
      }

      await axios.post('/api/auth/logout/', {}, { 
        withCredentials: true,
        headers: csrftoken ? { 'X-CSRFToken': csrftoken } : {}
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear user state, even if logout request fails
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

