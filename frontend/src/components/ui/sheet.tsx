import * as React from "react"
import { cn } from "@/lib/utils"

interface SheetProps {
  children: React.ReactNode
}

interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  children: React.ReactNode
  onClick?: () => void
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left"
  children: React.ReactNode
  isOpen?: boolean
  onClose?: () => void
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const Sheet: React.FC<SheetProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <SheetContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

const SheetContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ asChild, children, onClick, ...props }, ref) => {
    const { setIsOpen } = React.useContext(SheetContext)
    
    const handleClick = () => {
      setIsOpen(true)
      onClick?.()
    }
    
    if (asChild) {
      return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, { 
        ...props, 
        onClick: handleClick 
      })
    }
    return (
      <button ref={ref} {...props} onClick={handleClick}>
        {children}
      </button>
    )
  }
)
SheetTrigger.displayName = "SheetTrigger"

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, onClose, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SheetContext)
    
    const sideClasses = {
      top: "inset-x-0 top-0 border-b",
      right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
      bottom: "inset-x-0 bottom-0 border-t",
      left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm"
    }
    
    const handleClose = () => {
      setIsOpen(false)
      onClose?.()
    }
    
    // Close on escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false)
          onClose?.()
        }
      }
      
      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
      }
    }, [isOpen, onClose, setIsOpen])
    
    return (
      <>
        {/* Bootstrap 5 offcanvas backdrop */}
        <div 
          className={cn(
            "fixed inset-0 z-40 bg-black transition-opacity duration-300",
            isOpen ? "opacity-50" : "opacity-0 pointer-events-none"
          )}
          onClick={handleClose}
        />
        {/* Bootstrap 5 offcanvas content */}
        <div
          ref={ref}
          className={cn(
            "fixed z-50 bg-white shadow-xl transform transition-transform duration-300 ease-in-out",
            sideClasses[side],
            // Bootstrap 5 offcanvas slide animations
            side === "right" ? (isOpen ? "translate-x-0" : "translate-x-full") : "",
            side === "left" ? (isOpen ? "translate-x-0" : "-translate-x-full") : "",
            side === "top" ? (isOpen ? "translate-y-0" : "-translate-y-full") : "",
            side === "bottom" ? (isOpen ? "translate-y-0" : "translate-y-full") : "",
            className
          )}
          {...props}
        >
          <div className="p-6 h-full overflow-y-auto">
            {children}
          </div>
        </div>
      </>
    )
  }
)
SheetContent.displayName = "SheetContent"

const SheetHeader: React.FC<SheetHeaderProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    >
      {children}
    </div>
  )
}

const SheetTitle: React.FC<SheetTitleProps> = ({ className, children, ...props }) => {
  return (
    <h2
      className={cn("text-lg font-semibold text-gray-900", className)}
      {...props}
    >
      {children}
    </h2>
  )
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle }
