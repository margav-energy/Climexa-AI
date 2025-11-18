import { useState, useEffect } from 'react'
import { automationAPI } from '../services/api'
import { Lightbulb, AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react'

const getSuggestionIcon = (type) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'info':
      return <Info className="w-5 h-5 text-blue-500" />
    default:
      return <Lightbulb className="w-5 h-5 text-yellow-500" />
  }
}

const getSuggestionColor = (type) => {
  switch (type) {
    case 'warning':
      return 'bg-orange-50 border-orange-200'
    case 'success':
      return 'bg-green-50 border-green-200'
    case 'info':
      return 'bg-blue-50 border-blue-200'
    default:
      return 'bg-yellow-50 border-yellow-200'
  }
}

export default function AISuggestions({ farmId }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSuggestions()
  }, [farmId])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      const response = await automationAPI.getAISuggestions(farmId)
      setSuggestions(response.data.suggestions || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-climexa-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-climexa-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">AI Suggestions</h3>
        </div>
        <div className="animate-pulse text-gray-400 text-sm">Loading intelligent suggestions...</div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-climexa-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-climexa-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Suggestions</h3>
            <p className="text-xs text-gray-500">Personalized recommendations for your farm</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border ${getSuggestionColor(suggestion.type)} transition-all hover:shadow-md hover:scale-[1.01]`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-800">{suggestion.title}</h4>
                  <span className="text-2xl">{suggestion.icon}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {suggestion.message}
                </p>
                {suggestion.priority && (
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-700' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {suggestion.priority} priority
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

