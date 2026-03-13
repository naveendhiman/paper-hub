// Frontend API Client - Add this to your HTML before closing </head> tag
// This replaces the hardcoded papersDB object

class PaperHubAPI {
  constructor(baseUrl = '') {
    // Auto-detect API base URL
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (window.location.hostname === 'localhost') {
      this.baseUrl = 'http://localhost:3000';
    } else {
      this.baseUrl = window.location.origin;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Add auth token if available
    const token = localStorage.getItem('nit_paperhub_token');
    if (token) {
      defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, mergedOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Authentication
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      localStorage.setItem('nit_paperhub_token', response.token);
    }

    return response;
  }

  async logout() {
    localStorage.removeItem('nit_paperhub_token');
  }

  // Papers
  async uploadPaper(formData) {
    // Special handling for multipart form data
    const token = localStorage.getItem('nit_paperhub_token');
    const headers = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/papers/upload`, {
      method: 'POST',
      headers,
      body: formData, // Don't stringify - it's multipart
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  }

  async getPapers(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    const endpoint = `/papers/get${query ? '?' + query : ''}`;
    return this.request(endpoint);
  }

  async approvePaper(paperId) {
    return this.request('/papers/approve', {
      method: 'POST',
      body: JSON.stringify({ paperId }),
    });
  }

  async rejectPaper(paperId, reason = '') {
    return this.request('/papers/reject', {
      method: 'POST',
      body: JSON.stringify({ paperId, reason }),
    });
  }

  async deletePaper(paperId) {
    return this.request(`/papers/delete?paperId=${paperId}`, {
      method: 'DELETE',
    });
  }
}

// Initialize the API client
const api = new PaperHubAPI();

// ============ IMPORTANT MODIFICATIONS TO EXISTING FUNCTIONS ============

// 1. Replace the old doLogin function with API-based login
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;

  if (!email || !pw) {
    showToast('Please enter email and password', 'error');
    return;
  }

  // Show loading state
  const loginBtn = document.querySelector('.modal-buttons .btn-primary');
  const originalText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  api.login(email, pw)
    .then((response) => {
      if (response.success) {
        state.isAdmin = true;
        document.getElementById('studentTabs').style.display = 'none';
        document.getElementById('adminTabs').style.display = 'flex';
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.getElementById('aiSetupBtn').style.display = 'flex';
        closeLogin();
        showToast('👋 Welcome, CR!', 'success');
        showPage('admin');
        renderAdmin(); // Fetch and display pending papers
      }
    })
    .catch((error) => {
      showToast('❌ ' + error.message, 'error');
    })
    .finally(() => {
      loginBtn.disabled = false;
      loginBtn.textContent = originalText;
    });
}

// 2. Update doLogout to clear token
function doLogout() {
  state.isAdmin = false;
  api.logout();
  document.getElementById('studentTabs').style.display = 'flex';
  document.getElementById('adminTabs').style.display = 'none';
  document.getElementById('loginBtn').style.display = 'block';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('aiSetupBtn').style.display = 'none';
  showPage('subjects');
  showToast('Signed out.', 'default');
}

// 3. Replace renderPapersGallery to fetch from API
async function renderPapersGallery(subject) {
  const container = document.getElementById('papersGrid');
  const noDataEl = document.getElementById('noData');

  try {
    // Show loading state
    container.innerHTML = '<div class="loading">Loading papers...</div>';

    // Fetch papers from API
    const response = await api.getPapers({
      subject: subject,
      status: 'approved',
      limit: 50,
    });

    if (!response.success) {
      throw new Error(response.message);
    }

    const papers = response.papers;

    if (papers.length === 0) {
      container.innerHTML = '';
      noDataEl.style.display = 'block';
      showToast('No papers available for this subject', 'default');
      return;
    }

    noDataEl.style.display = 'none';
    container.innerHTML = '';

    papers.forEach((paper) => {
      const card = document.createElement('div');
      card.className = 'paper-card';
      card.innerHTML = `
        <div class="paper-img">
          <img src="${paper.imageUrl}" alt="${paper.title}" style="width:100%;height:155px;object-fit:cover;">
        </div>
        <div class="paper-body">
          <h4 class="paper-title">${escapeHtml(paper.title)}</h4>
          <p class="paper-meta">${escapeHtml(paper.uploaderName)} • ${formatDate(paper.uploadedDate)}</p>
          <button class="btn btn-sm btn-blue" onclick="openLightbox('${paper.imageUrl}', '${escapeHtml(paper.title)}', '${escapeHtml(paper.uploaderName)}')">
            View
          </button>
          <a href="${paper.imageUrl}" download class="btn btn-sm btn-outline" style="margin-left:6px;">
            Download
          </a>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading papers:', error);
    container.innerHTML = '';
    showToast('Error loading papers: ' + error.message, 'error');
  }
}

// 4. Update uploadPaperInit to use API
function uploadPaperInit() {
  const fileInput = document.getElementById('paperFile');
  const uploadZone = document.querySelector('.inline-upload');

  // Drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  uploadZone.addEventListener('dragenter', () => uploadZone.classList.add('drag'));
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
  uploadZone.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    fileInput.files = files;
    uploadZone.classList.remove('drag');
    previewFile();
  }

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', previewFile);

  async function previewFile() {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.querySelector('.preview-wrap');
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview" />
        <div>
          <p style="font-weight:600;">${file.name}</p>
          <p style="font-size:0.8rem;color:#6b7280;">${(file.size / 1024).toFixed(2)} KB</p>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  }
}

// 5. Update submitUpload to use API
async function submitUpload() {
  const fileInput = document.getElementById('paperFile');
  const subject = document.getElementById('paperSubject').value.trim();
  const title = document.getElementById('paperTitle').value.trim();
  const year = document.getElementById('paperYear').value;
  const semester = document.getElementById('paperSemester').value;
  const paperType = document.getElementById('paperType').value;
  const uploaderName = document.getElementById('uploaderName').value.trim();
  const uploaderEmail = document.getElementById('uploaderEmail').value.trim();
  const file = fileInput.files[0];

  // Validation
  if (!file || !subject || !title || !uploaderName || !uploaderEmail) {
    showToast('All fields are required', 'error');
    return;
  }

  if (!uploaderEmail.includes('@')) {
    showToast('Please enter a valid email', 'error');
    return;
  }

  const submitBtn = document.querySelector('.inline-form .btn-primary');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  try {
    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    formData.append('title', title);
    formData.append('year', year);
    formData.append('semester', semester);
    formData.append('paperType', paperType);
    formData.append('uploaderName', uploaderName);
    formData.append('uploaderEmail', uploaderEmail);

    // Upload via API
    const response = await api.uploadPaper(formData);

    if (response.success) {
      showToast('✅ Paper uploaded! Awaiting CR approval.', 'success');

      // Reset form
      document.getElementById('uploadForm').reset();
      document.querySelector('.preview-wrap').innerHTML = '';
      fileInput.value = '';

      // Refresh uploaded papers
      showPage('myUploads');
      renderMyUploads();
    } else {
      showToast('Upload failed: ' + response.message, 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showToast('Upload error: ' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Paper';
  }
}

// 6. Update renderAdmin to show pending papers
async function renderAdmin() {
  const container = document.getElementById('adminPendingList');

  try {
    container.innerHTML = '<div class="loading">Loading pending papers...</div>';

    // Fetch pending papers
    const response = await api.getPapers({
      status: 'pending',
      limit: 100,
    });

    if (!response.success) {
      throw new Error(response.message);
    }

    const papers = response.papers;

    if (papers.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#6b7280;">No pending papers for review</p>';
      return;
    }

    container.innerHTML = '';

    papers.forEach((paper) => {
      const card = document.createElement('div');
      card.className = 'paper-card';
      card.innerHTML = `
        <div class="paper-img">
          <img src="${paper.imageUrl}" alt="${paper.title}" style="width:100%;height:155px;object-fit:cover;">
        </div>
        <div class="paper-body">
          <h4 class="paper-title">${escapeHtml(paper.title)}</h4>
          <p class="paper-meta">${escapeHtml(paper.uploaderName)}</p>
          <p style="font-size:0.8rem;color:#6b7280;">${paper.subject} • ${paper.year}</p>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="btn btn-sm btn-green" onclick="approveSubmit('${paper.id}')">Approve</button>
            <button class="btn btn-sm btn-red" onclick="rejectSubmit('${paper.id}')">Reject</button>
            <button class="btn btn-sm btn-outline" onclick="deleteSubmit('${paper.id}')">Delete</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading admin papers:', error);
    container.innerHTML = '<p style="color:red;">Error loading pending papers: ' + error.message + '</p>';
  }
}

// 7. Update approve, reject, delete functions
async function approveSubmit(paperId) {
  try {
    const response = await api.approvePaper(paperId);
    if (response.success) {
      showToast('✅ Paper approved and published!', 'success');
      renderAdmin();
      updateAdminChip();
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function rejectSubmit(paperId) {
  const reason = prompt('Enter rejection reason (optional):');
  try {
    const response = await api.rejectPaper(paperId, reason);
    if (response.success) {
      showToast('Paper rejected', 'error');
      renderAdmin();
      updateAdminChip();
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

async function deleteSubmit(paperId) {
  if (!confirm('Are you sure you want to permanently delete this paper?')) return;

  try {
    const response = await api.deletePaper(paperId);
    if (response.success) {
      showToast('🗑 Paper deleted permanently', 'error');
      renderAdmin();
      updateAdminChip();
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}

// 8. Helper function to format dates
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

// 9. Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// 10. Update updateAdminChip to fetch count from API
async function updateAdminChip() {
  try {
    const response = await api.getPapers({
      status: 'pending',
      limit: 1,
    });
    const count = response.pagination?.total || 0;
    document.getElementById('pendingChip').textContent = count;
    document.getElementById('adminPendingChip').textContent = count;
  } catch (error) {
    console.error('Error updating chip:', error);
  }
}

// 11. Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Check if user has valid token
  const token = localStorage.getItem('nit_paperhub_token');
  if (token) {
    // Try to restore admin state
    state.isAdmin = true;
    document.getElementById('studentTabs').style.display = 'none';
    document.getElementById('adminTabs').style.display = 'flex';
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';
  }

  // Load initial data
  initSubjects();
  updateApiKeyStatus();
  updateAdminChip();
});
