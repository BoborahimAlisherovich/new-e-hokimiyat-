import { useState, useEffect, useCallback, useRef } from 'react'

// Generic debounce hook
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay]) as T
}

// Generic throttle hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current < delay) {
      return
    }
    
    lastRun.current = Date.now()
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay]) as T
}

// Local storage hook
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue)
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key, setStoredValue])

  return [storedValue, setValue]
}

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// Intersection observer hook
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry)
    }, options)

    observer.observe(element)

    return () => observer.disconnect()
  }, [elementRef, options])

  return entry
}

// Click outside hook
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [ref, handler])
}

// Keyboard shortcut hook
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrl = false, alt = false, shift = false } = options
      
      const keyMatches = keys.includes(event.key)
      const modifierMatches = 
        (ctrl === undefined || event.ctrlKey === ctrl) &&
        (alt === undefined || event.altKey === alt) &&
        (shift === undefined || event.shiftKey === shift)
      
      if (keyMatches && modifierMatches) {
        event.preventDefault()
        callback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [keys, callback, options])
}

// Async state hook
export function useAsyncState<T>(
  initialValue: T
): [T, (value: T | Promise<T>) => void, boolean] {
  const [state, setState] = useState<T>(initialValue)
  const [loading, setLoading] = useState(false)

  const setAsyncState = useCallback(async (value: T | Promise<T>) => {
    setLoading(true)
    try {
      const resolvedValue = await Promise.resolve(value)
      setState(resolvedValue)
    } finally {
      setLoading(false)
    }
  }, [])

  return [state, setAsyncState, loading]
}

// Form validation hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: (values: T) => Record<string, string>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = useCallback(() => {
    if (!validationSchema) return {}
    return validationSchema(values)
  }, [values, validationSchema])

  const setValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    setTouched(prev => ({ ...prev, [name]: true }))
  }, [])

  const setError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const isValid = Object.keys(errors).length === 0

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setError,
    clearErrors,
    validate
  }
}
