import { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const ADMIN_EMAILS = ['diegotuleski@gmail.com', 'benjamintuleski@gmail.com'];

export function useAdminGuard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const session = await fetchAuthSession();
        const email = session.tokens?.idToken?.payload?.email as string;
        setIsAdmin(ADMIN_EMAILS.includes(email));
      } catch {
        setIsAdmin(false);
      }
    };
    check();
  }, []);

  return isAdmin;
}
