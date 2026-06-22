import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
<<<<<<< HEAD
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
=======
    onChange()
>>>>>>> ea7fb57a502bb3e44839d80d58b2f794f8c8deb2
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
