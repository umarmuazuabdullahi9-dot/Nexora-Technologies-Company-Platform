// ============================================
// FIREBASE-COMMON.JS - Complete Firebase Logic
// Abdullahi Umar Muazu Portfolio System
// Database: Firebase Realtime Database (RTDB)
// ============================================

// ============================================
// FIREBASE CONFIGURATION - REAL CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyBs6BQeJrS6wkMifhQ2cRF8tmZecVBbSE8",
    authDomain: "abdullahi-umar-profolio.firebaseapp.com",
    databaseURL: "https://abdullahi-umar-profolio-default-rtdb.firebaseio.com",
    projectId: "abdullahi-umar-profolio",
    storageBucket: "abdullahi-umar-profolio.firebasestorage.app",
    messagingSenderId: "1081189087507",
    appId: "1:1081189087507:web:fab3da5c9c7ae87144c2e6",
    measurementId: "G-P6MH203VFE"
};

// ============================================
// FIREBASE INITIALIZATION (Modular SDK v9+)
// ============================================
let app = null;
let db = null;
let auth = null;
let storage = null;
let analytics = null;
let firebaseInitialized = false;

// Import Firebase modules (using global script tags in HTML)
function initFirebase() {
    if (firebaseInitialized) return true;

    try {
        // Check if Firebase SDK is loaded via script tags
        if (typeof firebase !== 'undefined') {
            // Using compat SDK (v9 compat)
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            db = firebase.database();
            auth = firebase.auth();
            if (firebase.storage) {
                storage = firebase.storage();
            }
            if (firebase.analytics) {
                analytics = firebase.analytics();
            }
            firebaseInitialized = true;
            console.log('%c✅ Firebase RTDB initialized successfully', 'color: #10b981; font-weight: bold;');
            return true;
        } else {
            console.warn('⚠️ Firebase SDK not loaded. Please include Firebase scripts.');
            return false;
        }
    } catch (error) {
        console.error('❌ Firebase init error:', error);
        return false;
    }
}

// ============================================
// AUTHENTICATION SYSTEM (Real Firebase Auth)
// ============================================
// NOTE: There is no hardcoded admin password anywhere in this file.
// Admin accounts are created in the Firebase Console (Authentication > Users),
// or via a one-time signup script you run yourself — never shipped in client JS.

function loginAdmin(email, password) {
    if (!firebaseInitialized) initFirebase();
    return auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // Add login log to Firestore
            DB.addLog({
                type: 'login',
                title: 'Admin Login',
                description: 'Successful login',
                time: 'Just now'
            }).catch(() => {});

            return { success: true, email: user.email, uid: user.uid };
        })
        .catch((error) => {
            let message = 'Invalid email or password. Please check your credentials.';
            if (error.code === 'auth/too-many-requests') {
                message = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/user-disabled') {
                message = 'This account has been disabled.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Please check your connection.';
            }
            return Promise.reject({ success: false, message });
        });
}

function logoutAdmin() {
    if (!firebaseInitialized) initFirebase();
    auth.signOut().finally(() => {
        window.location.href = 'admin-login.html';
    });
}

// Resolves once Firebase has determined the current auth state
// (firebase.User object if logged in, or null if not).
function getCurrentAdmin() {
    if (!firebaseInitialized) initFirebase();
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// Async guard for protected admin pages. Await this before rendering
// any admin data. Redirects to the login page if not authenticated.
// Returns the firebase.User object on success.
async function checkAuth() {
    const user = await getCurrentAdmin();
    if (!user) {
        window.location.href = 'admin-login.html';
        return null;
    }
    document.body.classList.remove('auth-pending');
    return user;
}

function getAdminEmail() {
    return (auth && auth.currentUser && auth.currentUser.email) || 'Admin';
}

// ============================================
// REALTIME DATABASE OPERATIONS
// ============================================
const DB = {
    // Helper: Get database reference
    _getRef(path) {
        if (!db) initFirebase();
        if (!db) throw new Error('Firebase not initialized');
        return db.ref(path);
    },

    // Helper: Generate unique ID
    _generateId() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Helper: Get timestamp
    _timestamp() {
        return new Date().toISOString();
    },

    // --- PROJECTS ---
    async getProjects() {
        try {
            const snapshot = await this._getRef('projects').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, project]) => ({ id, ...project })).reverse();
        } catch (error) {
            console.error('Error getting projects:', error);
            return [];
        }
    },

    async addProject(project) {
        try {
            const id = this._generateId();
            project.createdAt = this._timestamp();
            project.updatedAt = this._timestamp();
            await this._getRef('projects/' + id).set(project);
            return { id, ...project };
        } catch (error) {
            console.error('Error adding project:', error);
            throw error;
        }
    },

    async updateProject(id, data) {
        try {
            data.updatedAt = this._timestamp();
            await this._getRef('projects/' + id).update(data);
            return { id, ...data };
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    },

    async deleteProject(id) {
        try {
            await this._getRef('projects/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    },

    // --- MESSAGES ---
    async getMessages() {
        try {
            const snapshot = await this._getRef('messages').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, msg]) => ({ id, ...msg })).reverse();
        } catch (error) {
            console.error('Error getting messages:', error);
            return [];
        }
    },

    async addMessage(message) {
        try {
            const id = this._generateId();
            message.createdAt = this._timestamp();
            message.read = false;
            message.status = 'new';
            await this._getRef('messages/' + id).set(message);
            return { id, ...message };
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    },

    async markMessageAsRead(id) {
        try {
            await this._getRef('messages/' + id).update({ 
                read: true, 
                readAt: this._timestamp() 
            });
            return true;
        } catch (error) {
            console.error('Error marking message as read:', error);
            throw error;
        }
    },

    async deleteMessage(id) {
        try {
            await this._getRef('messages/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    },

    // --- BLOG POSTS ---
    async getBlogPosts() {
        try {
            const snapshot = await this._getRef('blog').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, post]) => ({ id, ...post })).reverse();
        } catch (error) {
            console.error('Error getting blog posts:', error);
            return [];
        }
    },

    async addBlogPost(post) {
        try {
            const id = this._generateId();
            post.createdAt = this._timestamp();
            post.updatedAt = this._timestamp();
            post.status = post.status || 'published';
            post.views = 0;
            await this._getRef('blog/' + id).set(post);
            return { id, ...post };
        } catch (error) {
            console.error('Error adding blog post:', error);
            throw error;
        }
    },

    async updateBlogPost(id, data) {
        try {
            data.updatedAt = this._timestamp();
            await this._getRef('blog/' + id).update(data);
            return { id, ...data };
        } catch (error) {
            console.error('Error updating blog post:', error);
            throw error;
        }
    },

    async deleteBlogPost(id) {
        try {
            await this._getRef('blog/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting blog post:', error);
            throw error;
        }
    },

    // --- USERS / VISITORS ---
    async getUsers() {
        try {
            const snapshot = await this._getRef('users').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, user]) => ({ id, ...user })).reverse();
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    },

    async addUser(user) {
        try {
            const id = this._generateId();
            user.createdAt = this._timestamp();
            user.lastActive = this._timestamp();
            user.visits = 1;
            await this._getRef('users/' + id).set(user);
            return { id, ...user };
        } catch (error) {
            console.error('Error adding user:', error);
            // Silently fail for visitors
            return user;
        }
    },

    async updateUser(id, data) {
        try {
            data.updatedAt = this._timestamp();
            await this._getRef('users/' + id).update(data);
            return { id, ...data };
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    async deleteUser(id) {
        try {
            await this._getRef('users/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // --- PORTFOLIO SETTINGS ---
    async getPortfolio() {
        try {
            const snapshot = await this._getRef('settings/portfolio').once('value');
            const data = snapshot.val();
            return data || this.getDefaultPortfolio();
        } catch (error) {
            console.error('Error getting portfolio:', error);
            return this.getDefaultPortfolio();
        }
    },

    async updatePortfolio(data) {
        try {
            data.updatedAt = this._timestamp();
            await this._getRef('settings/portfolio').update(data);
            return data;
        } catch (error) {
            console.error('Error updating portfolio:', error);
            throw error;
        }
    },

    getDefaultPortfolio() {
        // Only the name and starter bio/title copy are real — email, phone,
        // and social links are left empty rather than guessed, since a
        // fabricated email or social URL shown to real visitors could send
        // them to the wrong address or a page that isn't actually real.
        return {
            name: "Nexora Technologies",
            title: "Full Stack Development & Digital Solutions",
            bio: "Nexora Technologies builds scalable web applications, mobile apps, and digital solutions for businesses, government clients, and partners across Africa and beyond.",
            email: "",
            phone: "",
            location: "",
            skills: ["HTML5/CSS3", "JavaScript", "React", "Node.js", "Firebase", "UI/UX Design", "Responsive Design", "Git/GitHub"],
            social: {
                github: "",
                linkedin: "",
                twitter: "",
                portfolio: ""
            }
        };
    },

    // --- ANALYTICS ---
    async getAnalytics() {
        try {
            const snapshot = await this._getRef('settings/analytics').once('value');
            const data = snapshot.val();
            return data || this.getDefaultAnalytics();
        } catch (error) {
            console.error('Error getting analytics:', error);
            return this.getDefaultAnalytics();
        }
    },

    getDefaultAnalytics() {
        return {
            totalVisitors: 0,
            totalProjects: 0,
            totalMessages: 0,
            totalBlogPosts: 0,
            pageViews: {},
            dailyVisits: {},
            trafficSources: { direct: 0, social: 0, search: 0, referral: 0 },
            deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
            countries: {}
        };
    },

    async trackPageView(page) {
        try {
            const analyticsRef = this._getRef('settings/analytics');
            const snapshot = await analyticsRef.once('value');
            let analytics = snapshot.val() || this.getDefaultAnalytics();

            analytics.totalVisitors = (analytics.totalVisitors || 0) + 1;
            analytics.pageViews = analytics.pageViews || {};
            analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;

            // Real per-day visit counts (used for visit charts — no more Math.random() fake data)
            const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
            analytics.dailyVisits = analytics.dailyVisits || {};
            analytics.dailyVisits[today] = (analytics.dailyVisits[today] || 0) + 1;

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
            analytics.deviceBreakdown = analytics.deviceBreakdown || { mobile: 0, desktop: 0, tablet: 0 };
            if (isTablet) analytics.deviceBreakdown.tablet++;
            else if (isMobile) analytics.deviceBreakdown.mobile++;
            else analytics.deviceBreakdown.desktop++;

            analytics.countries = analytics.countries || {};
            analytics.countries['Nigeria'] = (analytics.countries['Nigeria'] || 0) + 1;

            await analyticsRef.set(analytics);
        } catch (error) {
            console.error('Error tracking page view:', error);
        }
    },

    // Returns real visit counts for the last N days as [{date, label, count}, ...],
    // oldest first, filling in 0 for days with no recorded visits.
    async getDailyVisits(days = 7) {
        const analytics = await this.getAnalytics();
        const dailyVisits = analytics.dailyVisits || {};
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            result.push({
                date: key,
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: dailyVisits[key] || 0
            });
        }
        return result;
    },

    // --- FILE UPLOADS (real Firebase Storage, not base64-in-database) ---
    // Uploads a File to Firebase Storage and resolves with its public download URL.
    // onProgress, if given, is called with a 0-100 integer as the upload proceeds.
    uploadImage(file, folder = 'uploads', onProgress) {
        if (!firebaseInitialized) initFirebase();
        if (!storage) {
            return Promise.reject(new Error('Firebase Storage is not initialized.'));
        }
        return new Promise((resolve, reject) => {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${folder}/${Date.now()}_${safeName}`;
            const ref = storage.ref().child(path);
            const task = ref.put(file);

            task.on('state_changed',
                (snapshot) => {
                    if (onProgress && snapshot.totalBytes) {
                        onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
                    }
                },
                (error) => reject(error),
                async () => {
                    try {
                        const url = await task.snapshot.ref.getDownloadURL();
                        resolve(url);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    },

    // Alias — uploadImage works for any file type (used for documents,
    // video, and audio in admin-storages.html too), 'uploadFile' just reads
    // more honestly at those call sites.
    uploadFile(file, folder, onProgress) {
        return this.uploadImage(file, folder, onProgress);
    },

    // --- ACTIVITY LOGS ---
    async getLogs() {
        try {
            const snapshot = await this._getRef('logs').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, log]) => ({ id, ...log })).reverse().slice(0, 100);
        } catch (error) {
            console.error('Error getting logs:', error);
            return [];
        }
    },

    async addLog(log) {
        try {
            const id = this._generateId();
            log.createdAt = this._timestamp();
            log.timestamp = Date.now();
            await this._getRef('logs/' + id).set(log);
            return { id, ...log };
        } catch (error) {
            console.error('Error adding log:', error);
            return log;
        }
    },

    async deleteLog(id) {
        try {
            await this._getRef('logs/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting log:', error);
            throw error;
        }
    },

    async clearLogs() {
        try {
            await this._getRef('logs').remove();
            return true;
        } catch (error) {
            console.error('Error clearing logs:', error);
            throw error;
        }
    },

    // --- MEDIA LIBRARY ---
    async getMedia() {
        try {
            const snapshot = await this._getRef('media').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, media]) => ({ id, ...media })).reverse();
        } catch (error) {
            console.error('Error getting media:', error);
            return [];
        }
    },

    async addMedia(media) {
        try {
            const id = this._generateId();
            media.createdAt = this._timestamp();
            await this._getRef('media/' + id).set(media);
            return { id, ...media };
        } catch (error) {
            console.error('Error adding media:', error);
            throw error;
        }
    },

    async deleteMedia(id) {
        try {
            await this._getRef('media/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting media:', error);
            throw error;
        }
    },

    // --- SOCIAL MEDIA ---
    async getSocialMedia() {
        try {
            const snapshot = await this._getRef('socialMedia').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, social]) => ({ id, ...social })).reverse();
        } catch (error) {
            console.error('Error getting social media:', error);
            return [];
        }
    },

    async addSocialMedia(social) {
        try {
            const id = this._generateId();
            social.createdAt = this._timestamp();
            social.updatedAt = this._timestamp();
            await this._getRef('socialMedia/' + id).set(social);
            return { id, ...social };
        } catch (error) {
            console.error('Error adding social media:', error);
            throw error;
        }
    },

    async updateSocialMedia(id, data) {
        try {
            data.updatedAt = this._timestamp();
            await this._getRef('socialMedia/' + id).update(data);
            return { id, ...data };
        } catch (error) {
            console.error('Error updating social media:', error);
            throw error;
        }
    },

    async deleteSocialMedia(id) {
        try {
            await this._getRef('socialMedia/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting social media:', error);
            throw error;
        }
    },

    // --- TEAM MEMBERS ---
    async getTeamMembers() {
        try {
            const snapshot = await this._getRef('team').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, member]) => ({ id, ...member }))
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        } catch (error) {
            console.error('Error getting team members:', error);
            return [];
        }
    },

    async addTeamMember(member) {
        try {
            const id = this._generateId();
            member.createdAt = this._timestamp();
            member.updatedAt = this._timestamp();
            await this._getRef('team/' + id).set(member);
            return { id, ...member };
        } catch (error) {
            console.error('Error adding team member:', error);
            throw error;
        }
    },

    async updateTeamMember(id, data) {
        try {
            data.updatedAt = this._timestamp();
            await this._getRef('team/' + id).update(data);
            return { id, ...data };
        } catch (error) {
            console.error('Error updating team member:', error);
            throw error;
        }
    },

    async deleteTeamMember(id) {
        try {
            await this._getRef('team/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting team member:', error);
            throw error;
        }
    },

    // --- GALLERY ---
    async getGallery() {
        try {
            const snapshot = await this._getRef('gallery').once('value');
            const data = snapshot.val();
            if (!data) return [];
            return Object.entries(data).map(([id, item]) => ({ id, ...item })).reverse();
        } catch (error) {
            console.error('Error getting gallery:', error);
            return [];
        }
    },

    async addGalleryItem(item) {
        try {
            const id = this._generateId();
            item.createdAt = this._timestamp();
            await this._getRef('gallery/' + id).set(item);
            return { id, ...item };
        } catch (error) {
            console.error('Error adding gallery item:', error);
            throw error;
        }
    },

    async deleteGalleryItem(id) {
        try {
            await this._getRef('gallery/' + id).remove();
            return true;
        } catch (error) {
            console.error('Error deleting gallery item:', error);
            throw error;
        }
    },

    // --- STORAGE (128GB) ---
    async getStorageUsage() {
        try {
            const snapshot = await this._getRef('settings/storage').once('value');
            const data = snapshot.val();
            return data || this.getDefaultStorage();
        } catch (error) {
            console.error('Error getting storage:', error);
            return this.getDefaultStorage();
        }
    },

    getDefaultStorage() {
        return {
            totalSpace: 128 * 1024 * 1024 * 1024,
            usedSpace: 0,
            files: {},
            folders: [
                { name: 'Images', icon: '🖼️', count: 0 },
                { name: 'Documents', icon: '📄', count: 0 },
                { name: 'Videos', icon: '🎬', count: 0 },
                { name: 'Audio', icon: '🎵', count: 0 },
                { name: 'Others', icon: '📦', count: 0 }
            ]
        };
    },

    async addStorageFile(file) {
        try {
            const id = this._generateId();
            file.createdAt = this._timestamp();

            // Get current storage
            const storageSnapshot = await this._getRef('settings/storage').once('value');
            let storage = storageSnapshot.val() || this.getDefaultStorage();

            // Add file
            if (!storage.files) storage.files = {};
            storage.files[id] = file;

            // Update used space
            storage.usedSpace = (storage.usedSpace || 0) + (file.size || 0);

            await this._getRef('settings/storage').set(storage);
            return { id, ...file };
        } catch (error) {
            console.error('Error adding storage file:', error);
            throw error;
        }
    },

    async deleteStorageFile(id) {
        try {
            const storageSnapshot = await this._getRef('settings/storage').once('value');
            let storage = storageSnapshot.val();
            if (!storage || !storage.files || !storage.files[id]) return true;

            const fileSize = storage.files[id].size || 0;
            delete storage.files[id];
            storage.usedSpace = Math.max(0, (storage.usedSpace || 0) - fileSize);

            await this._getRef('settings/storage').set(storage);
            return true;
        } catch (error) {
            console.error('Error deleting storage file:', error);
            throw error;
        }
    }
};

// Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format bytes (alias for formatFileSize)
function formatBytes(bytes) {
    return formatFileSize(bytes);
}

// ============================================
// UI UTILITIES
// ============================================
function showToast(message, type = 'success', duration = 3000) {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    container.appendChild(toast);

    const removeToast = () => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    };

    setTimeout(removeToast, duration);
    toast.addEventListener('click', removeToast);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showLoading(element, text = 'Loading...') {
    if (!element) return;
    element.dataset.originalHTML = element.innerHTML;
    element.innerHTML = `<div class="spinner spinner-sm"></div> <span>${text}</span>`;
    element.disabled = true;
}

function hideLoading(element) {
    if (!element) return;
    element.innerHTML = element.dataset.originalHTML || element.innerHTML;
    element.disabled = false;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function generateId(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Copied to clipboard!', 'success');
    } catch {
        showToast('Failed to copy', 'error');
    }
    document.body.removeChild(textarea);
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// THEME MANAGEMENT
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (next === 'light') {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
        }
    }
}

function updateThemeIcon(theme) {
    const toggles = document.querySelectorAll('.theme-toggle i');
    toggles.forEach(icon => {
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

// ============================================
// CONFIRMATION DIALOG
// ============================================
function showConfirm(title, message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '3000';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 420px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-question-circle" style="color: var(--warning-color);"></i> ${title}</h3>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
                <button class="btn btn-danger" id="confirmOk">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmCancel').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });

    overlay.querySelector('#confirmOk').addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}

// ============================================
// DATA EXPORT
// ============================================
function exportToJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export successful!', 'success');
}

function exportToCSV(headers, rows, filename) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export successful!', 'success');
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    initMobileMenu();
    initScrollAnimations();
    initTheme();

    console.log('%c🚀 AUM Portfolio System Loaded (RTDB Mode)', 'color: #3b82f6; font-size: 14px; font-weight: bold;');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DB, loginAdmin, logoutAdmin, getCurrentAdmin, checkAuth, showToast };
}
