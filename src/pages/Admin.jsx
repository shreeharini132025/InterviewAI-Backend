import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllQuestions, addQuestion, updateQuestion, deleteQuestion, getAdminUsers, deleteAdminUser } from '../api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import './Admin.css';

export default function Admin() {
  const { user, authLogout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('questions');
  const [menuOpen, setMenuOpen] = useState(false);

  const tabClass = (tab) => (activeTab === tab ? 'nav-link active' : 'nav-link');

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [usersStats, setUsersStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    premiumUsers: 0,
    avgInterviewScore: 0,
  });
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const pageSize = 5;

  const [selectedUser, setSelectedUser] = useState(null);
  const [openUserMenuId, setOpenUserMenuId] = useState(null);
  
  const [formData, setFormData] = useState({
    category: 'hr',
    difficulty: 'medium',
    question_text: '',
    expected_keywords: '',
    ideal_answer: '',
    time_limit: 120
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (activeTab !== 'users') return;
    fetchUsers(userSearch);
    setSelectedUser(null);
    setOpenUserMenuId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const handleDocClick = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-user-actions-root]')) return;
      setOpenUserMenuId(null);
    };

    if (activeTab === 'users') {
      document.addEventListener('mousedown', handleDocClick);
      return () => document.removeEventListener('mousedown', handleDocClick);
    }
  }, [activeTab]);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard');
    } catch {
      // Fallback for older browsers
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Copied to clipboard');
      } catch {
        alert('Copy failed');
      }
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await getAllQuestions();
      setQuestions(res.data.questions || []);
    } catch (err) {
      setError('Failed to fetch questions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (q = '') => {
    try {
      setUsersError(null);
      setUsersLoading(true);
      const res = await getAdminUsers({ q });
      setUsersStats(res.data.stats);
      setUsers(res.data.users || []);
      setUserPage(1);
    } catch (err) {
      setUsersError(err.response?.data?.message || 'Failed to fetch users.');
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const setCategory = (cat) => {
    setFormData({ ...formData, category: cat });
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setFormData({
      category: 'hr',
      difficulty: 'medium',
      question_text: '',
      expected_keywords: '',
      ideal_answer: '',
      time_limit: 120,
    });
  };

  const handleEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setFormData({
      category: q.category || 'hr',
      difficulty: q.difficulty || 'medium',
      question_text: q.question_text || '',
      expected_keywords: q.expected_keywords || '',
      ideal_answer: q.ideal_answer || '',
      time_limit: q.time_limit || 120,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!formData.question_text) return alert("Question text is required");

    const payload = {
      ...formData,
      time_limit: formData.time_limit === '' ? null : Number(formData.time_limit),
    };

    try {
      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, payload);
      } else {
        await addQuestion(payload);
      }
      resetQuestionForm();
      fetchQuestions();
    } catch (err) {
      alert(editingQuestionId ? 'Failed to update question' : 'Failed to add question');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(id);
      fetchQuestions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete question');
      console.error(err);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!u?.id) return;
    const label = u.name || u.email || `User #${u.id}`;
    if (!window.confirm(`Delete ${label}? This will remove their interview history.`)) return;

    try {
      await deleteAdminUser(u.id);
      if (selectedUser?.id === u.id) setSelectedUser(null);
      setOpenUserMenuId(null);
      await fetchUsers(userSearch);
      alert('User deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
      console.error(err);
    }
  };

  const usersFiltered = useMemo(() => {
    const s = userSearch.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      (u.name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s)
    );
  }, [users, userSearch]);

  const usersTotal = usersFiltered.length;
  const totalPages = Math.max(1, Math.ceil(usersTotal / pageSize));
  const page = Math.min(userPage, totalPages);
  const startIndex = (page - 1) * pageSize;
  const pageRows = usersFiltered.slice(startIndex, startIndex + pageSize);
  const showingFrom = usersTotal === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + pageSize, usersTotal);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-primary)', textAlign: 'center' }}>Loading Admin Panel...</div>;

  return (
    <div className="admin-page-wrapper">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <div className="logo-icon" aria-hidden="true">
              <img src={logo} alt="" />
            </div>
            <span>InterviewAI</span>
          </Link>

          <div className="navbar-links">
            <button className={tabClass('questions')} onClick={() => setActiveTab('questions')}>Questions</button>
            <button className={tabClass('users')} onClick={() => setActiveTab('users')}>Users</button>
            <button className={tabClass('settings')} onClick={() => setActiveTab('settings')}>Settings</button>
          </div>

          <div className="navbar-actions admin-profile-actions" style={{ position: 'relative' }}>
            <div
              className="avatar"
              title={user?.name || 'Admin'}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            {menuOpen && (
              <div className="admin-profile-menu">
                <div className="admin-profile-menu-header">
                  <div className="admin-profile-name">{user?.name || 'System Admin'}</div>
                  <div className="admin-profile-email">{user?.email || 'admin@example.com'}</div>
                </div>
                <button
                  className="admin-profile-signout"
                  onClick={() => {
                    authLogout();
                    navigate('/login');
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="admin-container">
        {activeTab === 'questions' && (
          <div className="admin-grid">
          
          {/* Left Column - Form */}
          <div className="admin-left">
            <div className="admin-header">
              <h1>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h1>
              <p>Create a new interview question for users to practice.</p>
            </div>

            <form className="admin-form-card" onSubmit={handleSaveQuestion}>
              <div className="form-group pb-2">
                <label>Question Type</label>
                <div className="type-buttons">
                  <button 
                    type="button" 
                    className={`type-btn ${formData.category === 'hr' ? 'active hr' : ''}`}
                    onClick={() => setCategory('hr')}
                  >
                    <span className="icon">💼</span> HR
                  </button>
                  <button 
                    type="button" 
                    className={`type-btn ${formData.category === 'technical' ? 'active technical' : ''}`}
                    onClick={() => setCategory('technical')}
                  >
                    <span className="icon">{'</>'}</span> Technical
                  </button>
                  <button 
                    type="button" 
                    className={`type-btn ${formData.category === 'behavioral' ? 'active behavioral' : ''}`}
                    onClick={() => setCategory('behavioral')}
                  >
                    <span className="icon">👤</span> Behavioral
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Question Text</label>
                <textarea 
                  name="question_text"
                  placeholder="e.g., Tell me about a time you had a conflict with a coworker..."
                  rows="3"
                  value={formData.question_text}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Ideal Answer Guidelines</label>
                <textarea 
                  name="ideal_answer"
                  placeholder="Write the key points the candidate should cover (use short bullet-like sentences)."
                  rows="3"
                  value={formData.ideal_answer}
                  onChange={handleInputChange}
                />
                <div className="field-hint">
                  Use this for AI scoring. Include 3–6 key points, what good looks like, and any must-mention concepts.
                </div>
              </div>

              <div className="form-group">
                <label>Expected Keywords</label>
                <input
                  className="input-text"
                  name="expected_keywords"
                  placeholder="e.g., communication, conflict resolution, collaboration"
                  value={formData.expected_keywords}
                  onChange={handleInputChange}
                />
                <div className="field-hint">
                  Comma-separated keywords the AI should look for.
                </div>
              </div>

              <div className="form-group">
                <label>Time Limit (seconds)</label>
                <input
                  className="input-text"
                  type="number"
                  name="time_limit"
                  min="30"
                  max="600"
                  value={formData.time_limit}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group pb-2">
                <label>Difficulty Level</label>
                <div className="select-wrapper">
                  <select name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={resetQuestionForm}>Cancel</button>
                <button type="submit" className="btn-save">{editingQuestionId ? 'Update Question' : 'Save Question'}</button>
              </div>
            </form>
          </div>

          {/* Right Column - List */}
          <div className="admin-right">
            <div className="recently-added-header">
              <h2>Recently Added</h2>
              <a href="#viewall">View All</a>
            </div>

            {error && <div className="error-text">{error}</div>}

            <div className="questions-list">
              {questions.map(q => (
                <div className="question-card" key={q.id}>
                  <div className="card-top">
                    <span className={`pill ${q.category}`}>{q.category.toUpperCase()}</span>
                    <span className="difficulty-text">{q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}</span>
                  </div>
                  <div className="card-body">
                    <p>{q.question_text}</p>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="action-btn edit-btn" onClick={() => handleEditQuestion(q)}>
                      <span className="icon">✏️</span> Edit
                    </button>
                    <button type="button" className="action-btn delete-btn" onClick={() => handleDelete(q.id)}>
                      <span className="icon">🗑️</span> Delete
                    </button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && !loading && (
                <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '2rem' }}>No questions added yet.</p>
              )}
            </div>
          </div>

        </div>

        )}

        {activeTab === 'users' && (
          <div className="admin-users">
            <div className="users-header-row">
              <div>
                <h1 className="users-title">User Management</h1>
                <p className="users-subtitle">View and manage candidate accounts and interview progress.</p>
              </div>

              <div className="users-header-actions">
                <div className="users-search">
                  <span className="users-search-icon">🔍</span>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchUsers(userSearch);
                    }}
                    placeholder="Search users..."
                  />
                </div>

                <button
                  type="button"
                  className="invite-btn"
                  onClick={() => handleCopy(`${window.location.origin}/register`)}
                >
                  <span className="invite-icon">👤</span>
                  Invite User
                </button>
              </div>
            </div>

            <div className="users-stats">
              <div className="stat-card">
                <div className="stat-label">Total Users</div>
                <div className="stat-value">{usersStats.totalUsers.toLocaleString()}</div>
              
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Sessions</div>
                <div className="stat-value">{usersStats.activeSessions.toLocaleString()}</div>
                
              </div>
              <div className="stat-card">
                <div className="stat-label">Premium Users</div>
                <div className="stat-value">{usersStats.premiumUsers.toLocaleString()}</div>
                
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Interview Score</div>
                <div className="stat-value">{Math.round(usersStats.avgInterviewScore || 0)}%</div>
        
              </div>
            </div>

            <div className="users-table-card">
              {usersError && <div className="error-text">{usersError}</div>}
              {usersLoading && <div className="users-loading">Loading users...</div>}

              {selectedUser && (
                <div className="admin-user-profile" role="region" aria-label="User profile">
                  <div className="admin-user-profile-header">
                    <div>
                      <div className="admin-user-profile-title">User Profile</div>
                      <div className="admin-user-profile-subtitle">View candidate details inside Admin</div>
                    </div>
                    <button type="button" className="admin-user-profile-close" onClick={() => setSelectedUser(null)}>
                      ✕
                    </button>
                  </div>

                  <div className="admin-user-profile-grid">
                    <div>
                      <div className="admin-user-profile-label">Name</div>
                      <div className="admin-user-profile-value">{selectedUser.name || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="admin-user-profile-label">Email</div>
                      <div className="admin-user-profile-value">{selectedUser.email}</div>
                    </div>
                    <div>
                      <div className="admin-user-profile-label">Status</div>
                      <div className="admin-user-profile-value" style={{ textTransform: 'capitalize' }}>{selectedUser.status}</div>
                    </div>
                    <div>
                      <div className="admin-user-profile-label">Interviews</div>
                      <div className="admin-user-profile-value">{selectedUser.interviews}</div>
                    </div>
                    <div>
                      <div className="admin-user-profile-label">Avg Score</div>
                      <div className="admin-user-profile-value">{Math.round(selectedUser.avgScore)}%</div>
                    </div>
                  </div>
                </div>
              )}

              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="num">Interviews</th>
                    <th className="num">Avg Score</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u) => {
                    const initials = (u.name || 'U').trim().split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
                    const premium = u.interviews >= 10 && u.avgScore >= 85;
                    const scoreClass = u.avgScore >= 80 ? 'score-high' : u.avgScore >= 60 ? 'score-mid' : 'score-low';
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar-circle">{initials || 'U'}</div>
                            <div>
                              <div className="user-name">{u.name || 'Unknown'}</div>
                              <div className="user-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={premium ? 'role-badge premium' : 'role-badge'}>{premium ? 'Premium' : 'Candidate'}</span>
                        </td>
                        <td>
                          <span className={u.status === 'active' ? 'status-badge active' : 'status-badge inactive'}>
                            <span className="dot" />
                            {u.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="num">{u.interviews}</td>
                        <td className={`num ${scoreClass}`}>{Math.round(u.avgScore)}%</td>
                        <td className="actions">
                          <div className="actions-cell" data-user-actions-root>
                            <button
                              type="button"
                              className="icon-btn"
                              title="View"
                              aria-label="View user"
                              onClick={() => {
                                setSelectedUser(u);
                                setOpenUserMenuId(null);
                              }}
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title="More"
                              aria-label="More actions"
                              onClick={() => setOpenUserMenuId((prev) => (prev === u.id ? null : u.id))}
                            >
                              ⋮
                            </button>

                            {openUserMenuId === u.id && (
                              <div className="actions-menu" role="menu" aria-label="Actions">
                                <button
                                  type="button"
                                  className="actions-menu-item"
                                  role="menuitem"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setOpenUserMenuId(null);
                                  }}
                                >
                                  View profile
                                </button>
                                <button
                                  type="button"
                                  className="actions-menu-item"
                                  role="menuitem"
                                  onClick={() => {
                                    handleCopy(u.email);
                                    setOpenUserMenuId(null);
                                  }}
                                >
                                  Copy email
                                </button>
                                <button
                                  type="button"
                                  className="actions-menu-item danger"
                                  role="menuitem"
                                  onClick={() => handleDeleteUser(u)}
                                >
                                  Delete user
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {pageRows.length === 0 && !usersLoading && (
                    <tr>
                      <td colSpan={6} className="empty">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="users-table-footer">
                <div className="entries">Showing {showingFrom} to {showingTo} of {usersTotal.toLocaleString()} entries</div>
                <div className="pager">
                  <button type="button" className="pager-btn" disabled={page === 1} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>Previous</button>
                  <button type="button" className="pager-btn" disabled={page === totalPages} onClick={() => setUserPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="admin-users">
            <div className="users-header-row">
              <div>
                <h1 className="users-title">Settings</h1>
                <p className="users-subtitle">No settings configured yet.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}