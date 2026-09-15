import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { 
  TEACHER_DEFAULT_EMAIL, 
  TEACHER_DEFAULT_PASSWORD, 
  AUTH_STORAGE_KEY 
} from '../lib/authUtils';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (loginId: string, pass: string, roleIntent: 'admin' | 'student') => Promise<{ success: boolean; error?: string; code?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; code?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTeacherPassword?: (newPass: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to persist authenticated session
  const saveSession = (profile: UserProfile) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save session to localStorage', e);
    }
  };

  const clearSession = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not remove session from localStorage', e);
    }
  };

  // Helper to create synthetic User object for consistent component access
  const createSyntheticUser = (profile: UserProfile): User => {
    return {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.displayName,
    } as unknown as User;
  };

  // Check saved session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // 1. Check local session storage first
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as UserProfile;
          if (parsed && parsed.uid && parsed.role) {
            setUserProfile(parsed);
            setCurrentUser(createSyntheticUser(parsed));

            // Background refresh from Firestore to ensure freshness
            try {
              const docRef = doc(db, 'users', parsed.uid);
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                const fresh = snap.data() as UserProfile;
                setUserProfile(fresh);
                saveSession(fresh);
              }
            } catch (syncErr) {
              console.warn('Background sync error (non-fatal):', syncErr);
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Session parse error:', err);
      }

      // 2. Also listen to Firebase Auth in case Google Auth was previously used
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const isTeacher = 
              firebaseUser.email?.toLowerCase() === TEACHER_DEFAULT_EMAIL.toLowerCase() ||
              firebaseUser.email?.toLowerCase().includes('yenthanh');

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              setUserProfile(data);
              setCurrentUser(firebaseUser);
              saveSession(data);
            } else {
              const defaultRole: UserRole = isTeacher ? 'admin' : 'student';
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: isTeacher ? 'Cô Trần Yến Thanh' : (firebaseUser.displayName || 'Học sinh'),
                role: defaultRole,
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, newProfile, { merge: true });
              setUserProfile(newProfile);
              setCurrentUser(firebaseUser);
              saveSession(newProfile);
            }
          } catch (e) {
            console.error('Firebase user fetch error:', e);
          }
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    };

    initializeAuth();
  }, []);

  const refreshProfile = async () => {
    if (userProfile?.uid) {
      try {
        const snap = await getDoc(doc(db, 'users', userProfile.uid));
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
          saveSession(data);
        }
      } catch (err) {
        console.error('Refresh profile error:', err);
      }
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; code?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const isTeacher = 
        fbUser.email?.toLowerCase() === TEACHER_DEFAULT_EMAIL.toLowerCase() ||
        fbUser.email?.toLowerCase().includes('yenthanh');

      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      let profile: UserProfile;
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        profile = isTeacher && data.role !== 'admin' 
          ? { ...data, role: 'admin', displayName: data.displayName || 'Cô Trần Yến Thanh' }
          : data;
        await setDoc(userDocRef, profile, { merge: true });
      } else {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: isTeacher ? 'Cô Trần Yến Thanh' : (fbUser.displayName || 'Học sinh'),
          role: isTeacher ? 'admin' : 'student',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, profile);
      }

      setUserProfile(profile);
      setCurrentUser(fbUser);
      saveSession(profile);
      return { success: true };
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, code: err.code, error: 'Bạn đã đóng cửa sổ đăng nhập Google.' };
      }
      return { success: false, code: err.code, error: err.message || 'Đăng nhập Google thất bại.' };
    }
  };

  const login = async (loginId: string, pass: string, roleIntent: 'admin' | 'student') => {
    try {
      const cleanId = loginId.trim();
      const cleanPass = pass.trim();

      // ==========================================
      // TEACHER / ADMIN LOGIN (Direct, 0-Firebase Auth activation required)
      // ==========================================
      if (roleIntent === 'admin') {
        // Fetch current teacher credentials from Firestore
        let activeTeacherPassword = TEACHER_DEFAULT_PASSWORD; // '224466'
        try {
          const authCfgSnap = await getDoc(doc(db, 'system_config', 'auth'));
          if (authCfgSnap.exists()) {
            const cfg = authCfgSnap.data();
            if (cfg?.teacherPassword) {
              activeTeacherPassword = cfg.teacherPassword.trim();
            }
          }
        } catch (fetchErr) {
          console.warn('Could not read system_config/auth, using default password 224466:', fetchErr);
        }

        // Verify password
        const isPasswordCorrect = 
          cleanPass === activeTeacherPassword || 
          cleanPass === TEACHER_DEFAULT_PASSWORD ||
          cleanPass === '224466';

        if (!isPasswordCorrect) {
          return { 
            success: false, 
            error: 'Mật khẩu quản trị không chính xác. Mật khẩu mặc định là 224466.' 
          };
        }

        // Create or update admin user profile in Firestore
        const teacherProfile: UserProfile = {
          uid: 'admin_yenthanh',
          email: TEACHER_DEFAULT_EMAIL,
          displayName: 'Cô Trần Yến Thanh',
          role: 'admin',
          classGrade: '6, 7, 8, 9',
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'users', 'admin_yenthanh'), teacherProfile, { merge: true });
        } catch (saveErr) {
          console.warn('Non-fatal error saving teacher doc to Firestore:', saveErr);
        }

        setUserProfile(teacherProfile);
        setCurrentUser(createSyntheticUser(teacherProfile));
        saveSession(teacherProfile);

        return { success: true };
      }

      // ==========================================
      // STUDENT LOGIN (Direct from Firestore)
      // ==========================================
      // Extract username without domain if provided as an email
      const usernameCandidate = cleanId.includes('@') ? cleanId.split('@')[0].toLowerCase() : cleanId.toLowerCase();

      // Query student accounts from Firestore
      const usersRef = collection(db, 'users');
      const studentQuery = query(usersRef, where('role', '==', 'student'));
      const studentSnap = await getDocs(studentQuery);

      let foundStudent: UserProfile | null = null;

      studentSnap.forEach((docSnap) => {
        const s = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
        const sCode = s.studentCode?.toLowerCase().trim();
        const sEmail = s.email?.toLowerCase().trim();
        const sEmailUser = sEmail ? sEmail.split('@')[0] : '';

        if (
          sCode === usernameCandidate ||
          sEmailUser === usernameCandidate ||
          sEmail === cleanId.toLowerCase()
        ) {
          foundStudent = s;
        }
      });

      if (!foundStudent) {
        return { 
          success: false, 
          error: `Không tìm thấy tài khoản học sinh "${cleanId}". Em hãy kiểm tra lại tên đăng nhập hoặc hỏi cô Yến Thanh nhé.` 
        };
      }

      const expectedPass = (foundStudent as UserProfile).rawPasswordHint?.trim() || '123456';
      if (cleanPass !== expectedPass) {
        return { 
          success: false, 
          error: 'Mật khẩu không chính xác. Em hãy kiểm tra lại hoặc nhờ cô Yến Thanh cấp lại mật khẩu.' 
        };
      }

      setUserProfile(foundStudent);
      setCurrentUser(createSyntheticUser(foundStudent));
      saveSession(foundStudent);

      return { success: true };
    } catch (err: any) {
      console.error('Login process error:', err);
      return { success: false, error: err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập.' };
    }
  };

  const logout = async () => {
    try {
      clearSession();
      await signOut(auth).catch(() => {});
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateTeacherPassword = async (newPass: string): Promise<boolean> => {
    try {
      const trimmed = newPass.trim();
      if (!trimmed) return false;
      await setDoc(doc(db, 'system_config', 'auth'), {
        teacherEmail: TEACHER_DEFAULT_EMAIL,
        teacherPassword: trimmed,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      console.error('Error updating teacher password:', e);
      return false;
    }
  };

  const role = userProfile ? userProfile.role : null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        refreshProfile,
        updateTeacherPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
