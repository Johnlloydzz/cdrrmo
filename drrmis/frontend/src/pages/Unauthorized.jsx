import { useNavigate } from 'react-router-dom'
import { ShieldOff, ArrowLeft } from 'lucide-react'

export default function Unauthorized() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <ShieldOff size={36} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        You don't have permission to view this page. Contact your system administrator if you believe this is a mistake.
      </p>
      <button
        onClick={() => navigate('/', { replace: true })}
        className="btn-primary flex items-center gap-2"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </div>
  )
}
