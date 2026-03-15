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
      const today = new Date().getDate();
      const todayStr = new Date().toISOString().split('T')[0];
      const notifiedKey = `notified_loans_${todayStr}`;

      const q = query(
        collection(db, 'loans'), 
        where('uid', '==', user.uid), 
        where('status', '==', 'active')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
        const notifiedLoans = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

        loans.forEach(loan => {
          // Check if today is the payment day
          if (loan.paymentDay === today && !notifiedLoans.includes(loan.id)) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Lembrete de Pagamento", {
                body: `${loan.customerName} hoje tem que pagar uma parcela do empréstimo.`,
                icon: "https://cdn-icons-png.flaticon.com/512/10433/10433048.png"
              });
              
              // Mark as notified for today
              notifiedLoans.push(loan.id);
            }
          }
        });

        localStorage.setItem(notifiedKey, JSON.stringify(notifiedLoans));
      }, (error) => {
        console.error("Notification Manager Error:", error);
      });

      return unsubscribe;
    };

    const unsubscribe = checkLoans();
    return () => unsubscribe();
  }, [user]);

  return null;
}
