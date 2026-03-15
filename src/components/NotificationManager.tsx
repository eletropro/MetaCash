import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Loan } from '../types';
import { User } from 'firebase/auth';

export default function NotificationManager({ user }: { user: User }) {
  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    const checkLoans = () => {
      const today = new Date();
      const currentHour = today.getHours();
      const NOTIFICATION_HOUR = 8;
      
      const todayStr = today.toISOString().split('T')[0];
      const notifiedKey = `notified_loans_${todayStr}`;

      const q = query(
        collection(db, 'loans'), 
        where('uid', '==', user.uid), 
        where('status', '==', 'active')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        // Only notify if it's past the scheduled hour
        if (new Date().getHours() < NOTIFICATION_HOUR) return;

        const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
        const notifiedLoans = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
        const todayDay = new Date().getDate();

        loans.forEach(loan => {
          if (loan.paymentDay === todayDay && !notifiedLoans.includes(loan.id)) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Lembrete de Pagamento", {
                body: `${loan.customerName} hoje tem que pagar uma parcela do empréstimo.`,
                icon: "https://cdn-icons-png.flaticon.com/512/10433/10433048.png"
              });
              
              notifiedLoans.push(loan.id);
            }
          }
        });

        localStorage.setItem(notifiedKey, JSON.stringify(notifiedLoans));
      }, (error) => {
        console.error("Notification Manager Error:", error);
      });

      // If it's before 8 AM, schedule a check at 8 AM
      if (currentHour < NOTIFICATION_HOUR) {
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(NOTIFICATION_HOUR, 0, 0, 0);
        const delay = scheduledTime.getTime() - now.getTime();
        
        const timer = setTimeout(() => {
          // Triggering a re-render or just calling the logic again
          // Since we have onSnapshot, we just need to wait for it to trigger or manually check
          // But onSnapshot is already listening. We just need to make sure it runs the logic.
          // We can force a check by just running the logic inside the snapshot handler again
          // or simply wait for any change. To be safe, let's just refresh the page or 
          // trigger a state change if we had one. 
          // Actually, the simplest way is to just call the check again.
          window.location.reload(); // Simple way to re-trigger everything at 8 AM
        }, delay);
        
        return () => {
          unsubscribe();
          clearTimeout(timer);
        };
      }

      return unsubscribe;
    };

    const unsubscribe = checkLoans();
    return () => unsubscribe();
  }, [user]);

  return null;
}
