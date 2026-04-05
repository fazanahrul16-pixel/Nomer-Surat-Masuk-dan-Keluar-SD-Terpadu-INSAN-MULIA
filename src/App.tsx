import React, { createContext, useContext, useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  getDocFromServer,
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  LogOut, 
  Mail, 
  Send, 
  LayoutDashboard, 
  FileText, 
  Printer, 
  Menu, 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Search,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-gray-600 mb-6">Maaf, aplikasi mengalami kendala teknis. Silakan muat ulang halaman.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Muat Ulang
            </button>
            {process.env.NODE_ENV !== 'production' && (
              <pre className="mt-4 p-4 bg-gray-100 rounded text-left text-xs overflow-auto max-h-40">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Types ---
interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'staff';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // New user, default to staff
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            role: 'staff',
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Surat Masuk', path: '/surat-masuk', icon: Mail },
    { name: 'Surat Keluar', path: '/surat-keluar', icon: Send },
    { name: 'Rekap Laporan', path: '/rekap', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-700 text-white p-4 flex justify-between items-center shadow-md">
        <span className="font-bold text-lg">SDT Insan Mulia</span>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-indigo-800 text-white flex-shrink-0 shadow-xl z-20`}>
        <div className="p-6 hidden md:block">
          <h1 className="text-xl font-bold tracking-tight">SD Terpadu Insan Mulia</h1>
          <p className="text-indigo-300 text-xs mt-1">Sistem Persuratan</p>
        </div>
        <nav className="mt-4 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                location.pathname === item.path ? 'bg-indigo-600 text-white' : 'text-indigo-100 hover:bg-indigo-700'
              }`}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-indigo-700">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
              {profile?.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.email}</p>
              <p className="text-xs text-indigo-300 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full p-3 text-indigo-100 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

// --- Pages ---

const Login = () => {
  const { signIn, user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="text-indigo-600" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">SD Terpadu Insan Mulia</h1>
        <p className="text-gray-500 mb-8">Sistem Informasi Manajemen Persuratan</p>
        <button
          onClick={signIn}
          className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-3 hover:bg-gray-50 transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span>Masuk dengan Google</span>
        </button>
        <p className="mt-8 text-xs text-gray-400">
          Gunakan akun email sekolah atau admin untuk mengakses sistem.
        </p>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
            <Route path="/surat-masuk" element={<PrivateRoute><Layout><IncomingMailPage /></Layout></PrivateRoute>} />
            <Route path="/surat-keluar" element={<PrivateRoute><Layout><OutgoingMailPage /></Layout></PrivateRoute>} />
            <Route path="/rekap" element={<PrivateRoute><Layout><RekapPage /></Layout></PrivateRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// --- Dashboard Component ---

const Dashboard = () => {
  const [stats, setStats] = useState({ incoming: 0, outgoing: 0 });

  useEffect(() => {
    const unsubIn = onSnapshot(collection(db, 'incomingMails'), (snap) => {
      setStats(prev => ({ ...prev, incoming: snap.size }));
    });
    const unsubOut = onSnapshot(collection(db, 'outgoingMails'), (snap) => {
      setStats(prev => ({ ...prev, outgoing: snap.size }));
    });
    return () => { unsubIn(); unsubOut(); };
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
            <Mail size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Surat Masuk</p>
            <p className="text-3xl font-bold text-gray-800">{stats.incoming}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-green-100 text-green-600 rounded-xl">
            <Send size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Surat Keluar</p>
            <p className="text-3xl font-bold text-gray-800">{stats.outgoing}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-indigo-50 border border-indigo-100 p-8 rounded-3xl">
        <h3 className="text-xl font-bold text-indigo-900 mb-2">Selamat Datang di Sistem Persuratan</h3>
        <p className="text-indigo-700 max-w-2xl">
          Aplikasi ini dirancang untuk mempermudah pengelolaan administrasi surat menyurat di SD Terpadu Insan Mulia. 
          Anda dapat mencatat surat masuk, surat keluar, dan mencetak rekapitulasi data secara berkala.
        </p>
      </div>
    </div>
  );
};

// --- Incoming Mail Page ---

const IncomingMailPage = () => {
  const [mails, setMails] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMail, setEditingMail] = useState<any>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    mailNumber: '',
    sender: '',
    subject: '',
    receivedDate: format(new Date(), 'yyyy-MM-dd'),
    mailDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'incomingMails'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setMails(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMail) {
        await updateDoc(doc(db, 'incomingMails', editingMail.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'incomingMails'), {
          ...formData,
          createdBy: user?.uid,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingMail(null);
      setFormData({ mailNumber: '', sender: '', subject: '', receivedDate: format(new Date(), 'yyyy-MM-dd'), mailDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (mail: any) => {
    setEditingMail(mail);
    setFormData({
      mailNumber: mail.mailNumber,
      sender: mail.sender,
      subject: mail.subject,
      receivedDate: mail.receivedDate,
      mailDate: mail.mailDate,
      notes: mail.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus surat ini?')) {
      await deleteDoc(doc(db, 'incomingMails', id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Surat Masuk</h2>
        <button
          onClick={() => { setEditingMail(null); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>Tambah Surat</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">No. Surat</th>
                <th className="px-6 py-4 font-semibold">Pengirim</th>
                <th className="px-6 py-4 font-semibold">Perihal</th>
                <th className="px-6 py-4 font-semibold">Tgl Terima</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mails.map((mail) => (
                <tr key={mail.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{mail.mailNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{mail.sender}</td>
                  <td className="px-6 py-4 text-gray-600">{mail.subject}</td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(mail.receivedDate), 'dd MMM yyyy', { locale: id })}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(mail)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(mail.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {mails.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Belum ada data surat masuk.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-6">{editingMail ? 'Edit Surat Masuk' : 'Tambah Surat Masuk'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat</label>
                  <input
                    required
                    type="text"
                    value={formData.mailNumber}
                    onChange={(e) => setFormData({ ...formData, mailNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pengirim</label>
                  <input
                    required
                    type="text"
                    value={formData.sender}
                    onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perihal</label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Surat</label>
                  <input
                    required
                    type="date"
                    value={formData.mailDate}
                    onChange={(e) => setFormData({ ...formData, mailDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Terima</label>
                  <input
                    required
                    type="date"
                    value={formData.receivedDate}
                    onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Outgoing Mail Page ---

const OutgoingMailPage = () => {
  const [mails, setMails] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMail, setEditingMail] = useState<any>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    mailNumber: '',
    recipient: '',
    subject: '',
    mailDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'outgoingMails'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setMails(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMail) {
        await updateDoc(doc(db, 'outgoingMails', editingMail.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'outgoingMails'), {
          ...formData,
          createdBy: user?.uid,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingMail(null);
      setFormData({ mailNumber: '', recipient: '', subject: '', mailDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (mail: any) => {
    setEditingMail(mail);
    setFormData({
      mailNumber: mail.mailNumber,
      recipient: mail.recipient,
      subject: mail.subject,
      mailDate: mail.mailDate,
      notes: mail.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus surat ini?')) {
      await deleteDoc(doc(db, 'outgoingMails', id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Surat Keluar</h2>
        <button
          onClick={() => { setEditingMail(null); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>Tambah Surat</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">No. Surat</th>
                <th className="px-6 py-4 font-semibold">Penerima</th>
                <th className="px-6 py-4 font-semibold">Perihal</th>
                <th className="px-6 py-4 font-semibold">Tgl Surat</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mails.map((mail) => (
                <tr key={mail.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{mail.mailNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{mail.recipient}</td>
                  <td className="px-6 py-4 text-gray-600">{mail.subject}</td>
                  <td className="px-6 py-4 text-gray-600">{format(new Date(mail.mailDate), 'dd MMM yyyy', { locale: id })}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleEdit(mail)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(mail.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {mails.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Belum ada data surat keluar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-6">{editingMail ? 'Edit Surat Keluar' : 'Tambah Surat Keluar'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat</label>
                  <input
                    required
                    type="text"
                    value={formData.mailNumber}
                    onChange={(e) => setFormData({ ...formData, mailNumber: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Penerima</label>
                  <input
                    required
                    type="text"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perihal</label>
                <input
                  required
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Surat</label>
                <input
                  required
                  type="date"
                  value={formData.mailDate}
                  onChange={(e) => setFormData({ ...formData, mailDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Rekap Page ---

const RekapPage = () => {
  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');
  const [data, setData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const collectionName = type === 'incoming' ? 'incomingMails' : 'outgoingMails';
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const filtered = allData.filter(item => {
        const itemDate = item.mailDate;
        return itemDate >= startDate && itemDate <= endDate;
      });
      setData(filtered);
    });
    return unsub;
  }, [type, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 no-print">
        <h2 className="text-2xl font-bold text-gray-800">Rekap Laporan</h2>
        <button
          onClick={handlePrint}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
        >
          <Printer size={20} />
          <span>Cetak Laporan</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Surat</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="incoming">Surat Masuk</option>
              <option value="outgoing">Surat Keluar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center text-gray-500 text-sm italic">
            <Search size={16} className="mr-2" />
            Menampilkan {data.length} data
          </div>
        </div>
      </div>

      {/* Print View */}
      <div className="print-area bg-white p-8 rounded-lg shadow-sm md:shadow-none border md:border-none">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold uppercase">SD Terpadu Insan Mulia</h1>
          <p className="text-sm">Jl. Contoh Alamat No. 123, Kota, Provinsi</p>
          <div className="h-1 bg-black w-full my-4"></div>
          <h2 className="text-xl font-bold underline">LAPORAN REKAPITULASI {type === 'incoming' ? 'SURAT MASUK' : 'SURAT KELUAR'}</h2>
          <p className="text-sm mt-1">Periode: {format(new Date(startDate), 'dd/MM/yyyy')} s/d {format(new Date(endDate), 'dd/MM/yyyy')}</p>
        </div>

        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-2 w-10">No</th>
              <th className="border border-black px-2 py-2">No. Surat</th>
              <th className="border border-black px-2 py-2">{type === 'incoming' ? 'Pengirim' : 'Penerima'}</th>
              <th className="border border-black px-2 py-2">Perihal</th>
              <th className="border border-black px-2 py-2">Tgl Surat</th>
              {type === 'incoming' && <th className="border border-black px-2 py-2">Tgl Terima</th>}
              <th className="border border-black px-2 py-2">Ket</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                <td className="border border-black px-2 py-2">{item.mailNumber}</td>
                <td className="border border-black px-2 py-2">{type === 'incoming' ? item.sender : item.recipient}</td>
                <td className="border border-black px-2 py-2">{item.subject}</td>
                <td className="border border-black px-2 py-2 text-center">{format(new Date(item.mailDate), 'dd/MM/yyyy')}</td>
                {type === 'incoming' && <td className="border border-black px-2 py-2 text-center">{format(new Date(item.receivedDate), 'dd/MM/yyyy')}</td>}
                <td className="border border-black px-2 py-2">{item.notes || '-'}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={type === 'incoming' ? 7 : 6} className="border border-black px-2 py-8 text-center text-gray-500 italic">Tidak ada data untuk periode ini.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-64">
            <p>Dicetak pada: {format(new Date(), 'dd MMMM yyyy', { locale: id })}</p>
            <p className="mt-16 font-bold underline">Admin Persuratan</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; }
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
};
