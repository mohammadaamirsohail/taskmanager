import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../api';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed', overdue: 'Overdue' };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.get()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const stats = data?.task_stats || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👋 Hey, {user?.name?.split(' ')[0]}!</h1>
          <p className="page-subtitle">Here's what's happening across your projects</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value stat-accent">{data?.total_projects || 0}</div>
          <div className="stat-label">📁 Projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todo || 0}</div>
          <div className="stat-label">📋 To Do</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-warning">{stats.in_progress || 0}</div>
          <div className="stat-label">⚡ In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-success">{stats.completed || 0}</div>
          <div className="stat-label">✅ Completed</div>
        </div>
      </div>

      {parseInt(stats.overdue) > 0 && (
        <div style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.25)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''} need your attention</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>📌 My Open Tasks</h3>
          {data?.my_tasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="icon">🎉</div>
              <p>No pending tasks!</p>
            </div>
          ) : (
            data?.my_tasks?.map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span>
                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  <span className="task-assignee">📁 {task.project_name}</span>
                  {task.due_date && (
                    <span className="task-assignee">📅 {new Date(task.due_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>🕐 Recent Activity</h3>
          {data?.recent_tasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="icon">📭</div>
              <p>No recent tasks</p>
            </div>
          ) : (
            data?.recent_tasks?.slice(0, 6).map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span>
                  <span className="task-assignee">📁 {task.project_name}</span>
                  {task.assigned_to_name && <span className="task-assignee">👤 {task.assigned_to_name}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
