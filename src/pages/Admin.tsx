import { useState, useEffect } from 'react'
import type { Page, Profile } from '../types'
import { ShieldAlert, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../services/supabase'

interface AdminProps {
  profile: Profile | null
  onNavigate: (page: Page) => void
}

const Admin = ({ profile, onNavigate }: AdminProps) => {
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const isAdmin = profile?.role === 'mentor' && !(profile as any).verified_by

  useEffect(() => {
    if (!isAdmin) return
    fetchPending()
  }, [isAdmin])

  const fetchPending = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('role', 'pending_mentor')
      .order('created_at', { ascending: true })
    setPending(data ?? [])
    setLoading(false)
  }

  const approve = async (userId: string) => {
    setActing(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'mentor', verified_by: profile!.id })
      .eq('id', userId)
    if (!error) setPending(prev => prev.filter(p => p.id !== userId))
    else alert(error.message)
    setActing(null)
  }

  const reject = async (userId: string) => {
    setActing(userId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'learner' })
      .eq('id', userId)
    if (!error) setPending(prev => prev.filter(p => p.id !== userId))
    else alert(error.message)
    setActing(null)
  }

  if (!isAdmin) {
    return (
      <div className="page centered">
        <ShieldAlert size={48} className="muted-icon" />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--muted)' }}>This area is restricted.</p>
        <button className="primary-btn" onClick={() => onNavigate('home')}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Mentor Requests</h1>
          <p className="admin-sub">Review and approve people requesting mentor access.</p>
        </div>
        <button className="admin-refresh-btn" onClick={fetchPending} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="lib-empty">Loading requests…</div>
      ) : pending.length === 0 ? (
        <div className="admin-empty">
          <CheckCircle size={36} style={{ color: 'var(--muted)' }} />
          <p>No pending requests right now.</p>
        </div>
      ) : (
        <div className="admin-list">
          {pending.map(p => (
            <div key={p.id} className="admin-card">
              <div className="admin-card-info">
                <span className="admin-card-name">{p.full_name ?? 'Unnamed'}</span>
                <span className="admin-card-date">
                  Requested {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="admin-card-actions">
                <button
                  className="admin-btn approve"
                  onClick={() => approve(p.id)}
                  disabled={acting === p.id}
                >
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  className="admin-btn reject"
                  onClick={() => reject(p.id)}
                  disabled={acting === p.id}
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Admin
