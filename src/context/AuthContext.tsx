import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { normalizeAuthPassword } from '../lib/authUtils';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch or sync user profile
  const fetchProfile = async (firebaseUser: User) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      const isTeacherEmail = 
        firebaseUser.email?.toLowerCase() === 'tranyenthanh.04.ct@gmail.com' ||
        firebaseUser.email?.toLowerCase().includes('yenthanh') ||
        firebaseUser.email?.toLowerCase().includes('admin');

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        if (isTeacherEmail && data.role !== 'admin') {
          const updated: UserProfile = {
            ...data,
            role: 'admin',
            displayName: data.displayName || 'Cô Yến Thanh'
          };
          await setDoc(userDocRef, updated, { merge: true });
          setUserProfile(updated);
        } else {
          setUserProfile(data);
        }
      } else {
        // First-time profile creation in Firestore
        const defaultRole: UserRole = isTeacherEmail ? 'admin' : 'student';
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: isTeacherEmail ? 'Cô Yến Thanh' : (firebaseUser.displayName || 'Học sinh'),
          role: defaultRole,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        await fetchProfile(firebaseUser);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; code?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      await fetchProfile(result.user);
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
      let email = loginId.trim();
      const normalizedPass = normalizeAuthPassword(pass);

      // If student input username without domain, format it
      if (roleIntent === 'student' && !email.includes('@')) {
        email = `${email.toLowerCase()}@yenthanh.edu.vn`;
      }

      // If teacher login
      if (roleIntent === 'admin') {
        if (!email.includes('@')) {
          email = 'tranyenthanh.04.ct@gmail.com';
        }

        try {
          // Attempt direct sign in with Firebase Auth
          const userCredential = await signInWithEmailAndPassword(auth, email, normalizedPass);
          await fetchProfile(userCredential.user);
          return { success: true };
        } catch (signInErr: any) {
          // Check if Email/Password sign-in method is disabled on Firebase project
          if (signInErr.code === 'auth/operation-not-allowed') {
            return {
              success: false,
              code: 'auth/operation-not-allowed',
              error: 'Phương thức đăng nhập Email/Mật khẩu chưa được bật trong Firebase Console.'
            };
          }

          // If first-time initialization of teacher account on this Firebase project
          if (
            signInErr.code === 'auth/user-not-found' ||
            signInErr.code === 'auth/invalid-credential'
          ) {
            try {
              // Create teacher admin account in Firebase Authentication with the credentials
              const newCred = await createUserWithEmailAndPassword(auth, email, normalizedPass);
              const teacherProfile: UserProfile = {
                uid: newCred.user.uid,
                email: newCred.user.email || email,
                displayName: 'Cô Yến Thanh',
                role: 'admin',
                createdAt: new Date().toISOString(),
              };
              await setDoc(doc(db, 'users', newCred.user.uid), teacherProfile);
              setUserProfile(teacherProfile);
              return { success: true };
            } catch (createErr: any) {
              if (createErr.code === 'auth/operation-not-allowed') {
                return {
                  success: false,
                  code: 'auth/operation-not-allowed',
                  error: 'Phương thức đăng nhập Email/Mật khẩu chưa được bật trong Firebase Console.'
                };
              }
              // If user already existed, then the password was simply wrong
              if (createErr.code === 'auth/email-already-in-use') {
                return { success: false, error: 'Mật khẩu quản trị không chính xác. Vui lòng kiểm tra lại.' };
              }
              return { success: false, error: createErr.message || 'Không thể đăng nhập tài khoản quản trị.' };
            }
          }
          if (signInErr.code === 'auth/wrong-password') {
            return { success: false, error: 'Mật khẩu quản trị không chính xác. Vui lòng thử lại.' };
          }
          return { success: false, error: 'Thông tin đăng nhập không chính xác hoặc tài khoản chưa kích hoạt.' };
        }
      } else {
        // Student login
        try {
          const cred = await signInWithEmailAndPassword(auth, email, normalizedPass);
          const docRef = doc(db, 'users', cred.user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            if (data.role !== 'student') {
              return { success: false, error: 'Tài khoản này không phải là tài khoản học sinh.' };
            }
            setUserProfile(data);
          }
          return { success: true };
        } catch (err: any) {
          if (err.code === 'auth/operation-not-allowed') {
            return {
              success: false,
              code: 'auth/operation-not-allowed',
              error: 'Phương thức đăng nhập Email/Mật khẩu chưa được bật trong Firebase Console.'
            };
          }
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
            return { success: false, error: 'Tên tài khoản hoặc mật khẩu không đúng. Vui lòng hỏi lại cô Yến Thanh.' };
          }
          return { success: false, error: 'Đăng nhập thất bại: ' + (err.message || 'Lỗi xác thực.') };
        }
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Đã có lỗi xảy ra.' };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
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
