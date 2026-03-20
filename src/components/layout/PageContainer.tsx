'use client'

interface PageContainerProps {
  children: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  centered?: boolean
}

export function PageContainer({ children, title, subtitle, action, centered }: PageContainerProps) {
  return (
    <div className="flex flex-col gap-y-[50px]">
      {(title || action) && (
        <div className={`flex items-center ${centered ? 'justify-center text-center' : 'justify-between'}`}>
          <div className={`flex flex-col gap-y-1.5 ${centered ? 'items-center' : ''}`}>
            {title && (
              <div className="font-montserrat font-bold text-[26px] text-[#171717] m-0 uppercase">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="font-montserrat font-normal text-sm text-[#737373] m-0 max-w-2xl">
                {subtitle}
              </div>
            )}
          </div>
          {!centered && action}
        </div>
      )}
      {children}
    </div>
  )
}
