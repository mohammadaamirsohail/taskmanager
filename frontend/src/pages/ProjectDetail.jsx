import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, tasksAPI, usersAPI } from '../api';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed', overdue: 'Overdue' };
const priorityOptions = ['low', 'medium', 'high'];

function TaskModal({ projectId, members, task, onClose, onSave }) {
  const [form, setForm] = useState(task || { title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, project_id: projectId, assigned_to: form.assigned_to || null, due_date: form.due_date || null };
      let res;
      if (task) { res = await tasksAPI.update(task.id, payload); }
      else { res = await tasksAPI.create(payload); }
      onSave(res.data, !!task);
      toast.success(task ? 'Task updated!' : 'Task created!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="Task title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {priorityOptions.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-input" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={form.due_date?.split('T')[0] || ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (task ? 'Update' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  useEffect(() => { usersAPI.getAll().then((res) => setUsers(res.data)); }, []);

  const handleAdd = async () => {
    if (!selectedUser) return toast.error('Select a user');
    setLoading(true);
    try {
      await projectsAPI.addMember(projectId, { user_id: selectedUser, role });
      toast.success('Member added!');
      onAdd();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Member</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="form-group">
          <label className="form-label">User</label>
          <select className="form-input" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="">Select user...</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');
  const [filterStatus, setFilterStatus] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const isProjectAdmin = project?.my_role === 'admin';

  const loadProject = () => {
    projectsAPI.getOne(id).then((res) => setProject(res.data)).catch(console.error);
  };

  const loadTasks = () => {
    const params = { project_id: id };
    if (filterStatus) params.status = filterStatus;
    tasksAPI.getAll(params).then((res) => setTasks(res.data)).catch(console.error);
  };

  useEffect(() => {
    Promise.all([
      projectsAPI.getOne(id),
      tasksAPI.getAll({ project_id: id })
    ]).then(([projRes, taskRes]) => {
      setProject(projRes.data);
      setTasks(taskRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (project) loadTasks(); }, [filterStatus]);

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await projectsAPI.delete(id);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await projectsAPI.removeMember(id, memberId);
      toast.success('Member removed');
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleTaskSave = (savedTask, isEdit) => {
    if (isEdit) {
      setTasks(tasks.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } else {
      setTasks([savedTask, ...tasks]);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!project) return <div className="loading">Project not found.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, cursor: 'pointer' }} onClick={() => navigate('/projects')}>
            ← Back to Projects
          </div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isProjectAdmin && <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Add Task</button>}
          {isProjectAdmin && <button className="btn btn-ghost" onClick={() => setShowMemberModal(true)}>+ Member</button>}
          {(isProjectAdmin || isAdmin) && <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>
          Tasks ({tasks.length})
        </button>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          Members ({project.members?.length || 0})
        </button>
      </div>

      {tab === 'tasks' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['', ...statusOptions].map((s) => (
              <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilterStatus(s)}>
                {s ? statusLabel[s] : 'All'}
              </button>
            ))}
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>{isProjectAdmin ? 'No tasks yet. Add your first task!' : 'No tasks found.'}</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Assigned To</th>
                      <th>Due Date</th>
                      {isProjectAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                          {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}</div>}
                        </td>
                        <td><span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span></td>
                        <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                        <td style={{ fontSize: 13 }}>{task.assigned_to_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                        <td style={{ fontSize: 13 }}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                        {isProjectAdmin && (
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingTask(task); setShowTaskModal(true); }}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)}>Del</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'members' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {isProjectAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {project.members?.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        {m.name} {m.id === user?.id && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(you)</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{m.email}</td>
                    <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                    <td style={{ fontSize: 13 }}>{new Date(m.joined_at).toLocaleDateString()}</td>
                    {isProjectAdmin && (
                      <td>
                        {m.id !== user?.id && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTaskModal && (
        <TaskModal
          projectId={id}
          members={project.members || []}
          task={editingTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSave={handleTaskSave}
        />
      )}

      {showMemberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowMemberModal(false)}
          onAdd={loadProject}
        />
      )}
    </div>
  );
}

