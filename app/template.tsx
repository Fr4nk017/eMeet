'use client'

import { motion } from 'framer-motion'

/**
 * template.tsx — se re-instancia en cada navegación (a diferencia de layout.tsx
 * que persiste). Esto permite que Framer Motion anime la entrada de cada página.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}
