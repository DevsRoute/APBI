let googleMapsPromise = null

export function loadGoogleMaps(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser.'))
  }

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google)
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  if (!apiKey) {
    return Promise.reject(
      new Error(
        'Missing VITE_GOOGLE_MAPS_API_KEY. Copy .env.example to .env.local and set your key.',
      ),
    )
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `__apbiGoogleMapsInit_${Date.now()}`
    window[callbackName] = () => {
      resolve(window.google)
      delete window[callbackName]
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&libraries=geometry&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      googleMapsPromise = null
      delete window[callbackName]
      reject(new Error('Failed to load the Google Maps script.'))
    }
    document.head.appendChild(script)
  })

  return googleMapsPromise
}
