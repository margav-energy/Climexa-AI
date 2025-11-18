import axios from 'axios'

// Function to get CSRF token from cookies
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Function to get CSRF token from Django
async function getCsrfToken() {
  try {
    const response = await axios.get('/api/auth/csrf/', {
      withCredentials: true
    });
    return response.data.csrfToken;
  } catch (error) {
    // Try to get from cookie
    return getCookie('csrftoken');
  }
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Add CSRF token to requests
api.interceptors.request.use((config) => {
  const csrftoken = getCookie('csrftoken');
  if (csrftoken) {
    config.headers['X-CSRFToken'] = csrftoken;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
})

// Farmer API endpoints
export const farmerAPI = {
  getFarms: () => api.get('/farmer/farms/'),
  getFarm: (id) => api.get(`/farmer/farms/${id}/`),
  getFarmStatus: (id) => api.get(`/farmer/farms/${id}/status/`),
  getFarmDashboard: (id) => api.get(`/farmer/farms/${id}/dashboard/`),
  getSensors: (farmId) => api.get(`/sensors/sensors/?farm_id=${farmId}`),
  getSensorReadings: (sensorId, hours = 24) => 
    api.get(`/sensors/sensors/${sensorId}/readings/?hours=${hours}`),
}

// Climexa API endpoints
export const climexaAPI = {
  getDashboard: () => api.get('/climexa/dashboard/'),
  getFarmDetail: (farmId) => api.get(`/climexa/farms/${farmId}/`),
  getAlerts: () => api.get('/climexa/alerts/'),
}

// Automation API
export const automationAPI = {
  updateStatus: (farmId) => api.post(`/automation/update/${farmId}/`),
  updateAllStatuses: () => api.post('/automation/update-all/'),
  getWeatherForecast: (farmId) => api.get(`/automation/weather/${farmId}/`),
  getAISuggestions: (farmId) => api.get(`/automation/suggestions/${farmId}/`),
}

export default api

