import { usePhoto } from '../utils/profilePhoto'

export const initialsOf = (name = '') =>
  (name || 'U').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

// Shows the user's picture when they have one, otherwise their initials.
// Put it inside a rounded, overflow-hidden box.
export default function Avatar({ user, className = 'text-white text-xs font-bold' }) {
  const photo = usePhoto(user?.id)
  if (photo) return <img src={photo} alt="" className="w-full h-full object-cover" />
  return <span className={className}>{user?.avatar || initialsOf(user?.name)}</span>
}