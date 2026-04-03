import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId
  });
}
const firestoreDb = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);

// Initialize Mercado Pago
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
if (!mpAccessToken) {
  console.warn("MERCADOPAGO_ACCESS_TOKEN is not set. Payments will not work.");
}
const mpClient = new MercadoPagoConfig({ 
  accessToken: mpAccessToken || '' 
});
const mpPayment = new Payment(mpClient);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "CTCrossBol Reserva API" });
  });

  // Cleanup Expired Bookings
  app.post("/api/bookings/cleanup", async (req, res) => {
    try {
      const bookingsRef = firestoreDb.collection('tenants').doc('main-ct').collection('bookings');
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const q = await bookingsRef
        .where('status', '==', 'pending')
        .where('createdAt', '<', thirtyMinsAgo)
        .get();
      
      if (!q.empty) {
        const batch = firestoreDb.batch();
        q.docs.forEach(doc => {
          batch.update(doc.ref, { status: 'cancelled', cancellationReason: 'timeout' });
        });
        await batch.commit();
        console.log(`Cancelled ${q.size} expired bookings.`);
      }
      
      res.json({ cancelledCount: q.size });
    } catch (error: any) {
      console.error("Cleanup Error Details:", {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Mercado Pago: Check Payment Status
  app.get("/api/payments/mercadopago/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await mpPayment.get({ id });
      
      console.log(`Checking status for payment ${id}: ${result.status}`);

      // If approved, update Firestore
      if (result.status === 'approved') {
        const bookingsRef = firestoreDb.collection('tenants').doc('main-ct').collection('bookings');
        const q = await bookingsRef.where('mercadopagoPaymentId', '==', id).get();
        
        if (!q.empty) {
          const bookingDoc = q.docs[0];
          if (bookingDoc.data().status !== 'confirmed') {
            await bookingDoc.ref.update({ status: 'confirmed' });
            console.log(`Booking ${bookingDoc.id} confirmed via status check!`);
          }
        }
      }

      res.json({ 
        id: result.id, 
        status: result.status,
        status_detail: result.status_detail 
      });
    } catch (error: any) {
      console.error("Status Check Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Mercado Pago: Create PIX Payment
  app.post("/api/payments/mercadopago/pix", async (req, res) => {
    try {
      const { amount, description, email, firstName, lastName, bookingId } = req.body;
      console.log(`Creating PIX payment for ${amount} BRL (Booking: ${bookingId})...`);

      if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
        console.error("MERCADOPAGO_ACCESS_TOKEN is missing!");
        return res.status(500).json({ error: "Mercado Pago Access Token not configured" });
      }

      // Use the App URL for webhooks if available
      const notificationUrl = process.env.APP_URL 
        ? `${process.env.APP_URL}/api/webhooks/mercadopago`
        : undefined;

      const paymentData = {
        body: {
          transaction_amount: Number(amount),
          description: description,
          payment_method_id: 'pix',
          notification_url: notificationUrl,
          external_reference: bookingId, // Link to our booking ID
          payer: {
            email: email,
            first_name: firstName,
            last_name: lastName,
          },
        },
      };

      const result = await mpPayment.create(paymentData);
      console.log("Mercado Pago Payment Created:", result.id);
      
      res.json({
        id: result.id,
        status: result.status,
        pix_copy_paste: result.point_of_interaction?.transaction_data?.qr_code,
        pix_qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      });
    } catch (error: any) {
      console.error("Mercado Pago Error Details:", error.message);
      if (error.cause) console.error("Error Cause:", JSON.stringify(error.cause));
      res.status(500).json({ 
        error: "Failed to create Mercado Pago payment",
        details: error.message 
      });
    }
  });

  // Stripe Webhook (Mock)
  app.post("/api/webhooks/stripe", (req, res) => {
    const event = req.body;
    console.log("Stripe Event Received:", event.type);
    res.json({ received: true });
  });

  // Mercado Pago Webhook
  app.post("/api/webhooks/mercadopago", async (req, res) => {
    try {
      const { topic, resource, id } = req.body;
      console.log("Mercado Pago Webhook Received:", { topic, resource, id });

      // Mercado Pago sends notifications in different formats
      const paymentId = id || (resource && resource.split('/').pop());
      
      if (paymentId && (topic === 'payment' || resource?.includes('payment'))) {
        const result = await mpPayment.get({ id: paymentId });
        
        if (result.status === 'approved') {
          const bookingsRef = firestoreDb.collection('tenants').doc('main-ct').collection('bookings');
          
          // Try to find by external_reference first (most reliable)
          if (result.external_reference) {
            const bookingDoc = await bookingsRef.doc(result.external_reference).get();
            if (bookingDoc.exists) {
              await bookingDoc.ref.update({ status: 'confirmed' });
              console.log(`Booking ${bookingDoc.id} confirmed via webhook (external_reference)!`);
              return res.status(200).send("OK");
            }
          }

          // Fallback to searching by payment ID
          const q = await bookingsRef.where('mercadopagoPaymentId', '==', paymentId).get();
          
          if (!q.empty) {
            const bookingDoc = q.docs[0];
            await bookingDoc.ref.update({ status: 'confirmed' });
            console.log(`Booking ${bookingDoc.id} confirmed via webhook (paymentId)!`);
          }
        }
      }
      
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Webhook Error:", error.message);
      res.status(500).send("Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
