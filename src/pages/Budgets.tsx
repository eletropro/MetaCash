import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Budget, Customer, UserProfile } from '../types';
import { analyzeElectricalProjectPDF } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  Sparkles, 
  Receipt, 
  FileSignature, 
  Search, 
  Upload, 
  X, 
  ChevronRight,
  AlertCircle,
  Edit2,
  Trash2 as TrashIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Budgets({ user }: { user: User }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [aiKeyStatus, setAiKeyStatus] = useState<'checking' | 'ok' | 'missing'>('checking');
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<{ description: string; quantity: number; price: number }[]>([]);
  const [materials, setMaterials] = useState<{ description: string; quantity: number; price: number }[]>([]);
  const [analysis, setAnalysis] = useState<Budget['projectAnalysis'] | null>(null);
  const [contractDetails, setContractDetails] = useState<Budget['contractDetails']>({
    deadline: '15 dias úteis',
    paymentTerms: '50% entrada, 50% na entrega',
    warranty: '90 dias para mão de obra',
    customClauses: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'budgets'), where('uid', '==', user.uid), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    });

    const qCust = query(collection(db, 'customers'), where('uid', '==', user.uid));
    const unsubscribeCust = onSnapshot(qCust, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    const getProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        if (data.contractClauses) {
          setContractDetails(prev => ({ ...prev, customClauses: data.contractClauses || '' }));
        }
      }
    };
    getProfile();

    // Check AI Key status
    const key = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);
    setAiKeyStatus(key ? 'ok' : 'missing');

    return () => {
      unsubscribe();
      unsubscribeCust();
    };
  }, [user.uid]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingAI(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await analyzeElectricalProjectPDF(base64);
        
        if (!result) {
          alert("A IA não conseguiu processar este PDF. Tente um arquivo mais nítido ou verifique sua chave de API.");
          setLoadingAI(false);
          return;
        }

        setAnalysis(result);
          const newItems = [];
          if (result.sockets) newItems.push({ description: 'Instalação de Tomadas', quantity: result.sockets, price: 35 });
          if (result.switches) newItems.push({ description: 'Instalação de Interruptores', quantity: result.switches, price: 35 });
          if (result.dichroics) newItems.push({ description: 'Instalação de Dicroicas/Spots', quantity: result.dichroics, price: 45 });
          if (result.ledPanels) newItems.push({ description: 'Instalação de Painéis LED', quantity: result.ledPanels, price: 70 });
          if (result.ledProfiles) {
            result.ledProfiles.forEach((p: any) => {
              newItems.push({ description: `Instalação Perfil LED (${p.type})`, quantity: p.meters, price: 100 });
            });
          }
          
          // Calculate current total of items
          const currentTotal = newItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
          
          // If AI suggested value is higher, add the difference as "Complexity/Safety Margin"
          if (result.suggestedValue && result.suggestedValue > currentTotal) {
            const diff = result.suggestedValue - currentTotal;
            newItems.push({ 
              description: 'Mão de Obra e Margem de Segurança (IA)', 
              quantity: 1, 
              price: diff 
            });
          }
          
          setItems([...items, ...newItems]);
        };
        reader.readAsDataURL(file);
      } catch (error) {
      console.error("Error uploading file:", error);
      alert("Erro ao analisar o PDF. Verifique se a chave da IA está correta nas configurações da Vercel (VITE_GEMINI_API_KEY).");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCustomerId = customerId;
    let finalCustomerName = customerSearch;

    // Grouping by phone logic
    if (!finalCustomerId && customerPhone) {
      const existingCustomer = customers.find(c => c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''));
      if (existingCustomer) {
        finalCustomerId = existingCustomer.id!;
        finalCustomerName = existingCustomer.name;
      } else {
        // Create new customer if phone doesn't exist
        const docRef = await addDoc(collection(db, 'customers'), {
          uid: user.uid,
          name: finalCustomerName,
          phone: customerPhone,
          email: '',
          notes: 'Criado via Orçamento',
          lastInteraction: new Date().toISOString()
        });
        finalCustomerId = docRef.id;
      }
    }

    const totalItems = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const totalMaterials = materials.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const total = totalItems + totalMaterials;

    const budgetData = {
      uid: user.uid,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      title,
      items,
      materials,
      totalAmount: total,
      status: editingBudget ? editingBudget.status : 'pending',
      date: editingBudget ? editingBudget.date : new Date().toISOString(),
      projectAnalysis: analysis,
      contractDetails,
      contractText: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ELÉTRICOS

1. OBJETO DO CONTRATO
O presente contrato tem por objeto a prestação de serviços de ${title}, conforme itens descritos no orçamento anexo.

2. PRAZO DE EXECUÇÃO
O prazo estimado para a conclusão dos serviços é de ${contractDetails.deadline}.

3. VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ ${total.toLocaleString('pt-BR')}.
Condições de pagamento: ${contractDetails.paymentTerms}.

4. GARANTIA
O prestador oferece garantia de ${contractDetails.warranty} sobre a mão de obra executada.

5. OBRIGAÇÕES DO CONTRATANTE
Fornecer os materiais necessários (salvo acordo em contrário) e livre acesso ao local da obra.

6. CLÁUSULAS ADICIONAIS
${contractDetails.customClauses}

Data: ${new Date().toLocaleDateString('pt-BR')}
__________________________
Assinatura do Prestador`
    };

    if (editingBudget?.id) {
      await updateDoc(doc(db, 'budgets', editingBudget.id), budgetData);
    } else {
      await addDoc(collection(db, 'budgets'), budgetData);
    }

    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      await deleteDoc(doc(db, 'budgets', id));
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setCustomerId(budget.customerId);
    setCustomerSearch(budget.customerName);
    const customer = customers.find(c => c.id === budget.customerId);
    if (customer) setCustomerPhone(customer.phone);
    setTitle(budget.title);
    setItems(budget.items);
    setMaterials(budget.materials || []);
    setAnalysis(budget.projectAnalysis || null);
    setContractDetails(budget.contractDetails || {
      deadline: '15 dias úteis',
      paymentTerms: '50% entrada, 50% na entrega',
      warranty: '90 dias para mão de obra',
      customClauses: profile?.contractClauses || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingBudget(null);
    setCustomerId('');
    setCustomerSearch('');
    setCustomerPhone('');
    setTitle('');
    setItems([]);
    setMaterials([]);
    setAnalysis(null);
    setContractDetails({
      deadline: '15 dias úteis',
      paymentTerms: '50% entrada, 50% na entrega',
      warranty: '90 dias para mão de obra',
      customClauses: profile?.contractClauses || ''
    });
  };

  const handleApprove = async (budget: Budget) => {
    if (!budget.id) return;
    await updateDoc(doc(db, 'budgets', budget.id), { status: 'approved' });
    
    await addDoc(collection(db, 'transactions'), {
      uid: user.uid,
      type: 'income',
      amount: budget.totalAmount,
      description: `Orçamento Aprovado: ${budget.title}`,
      category: 'Serviço',
      date: new Date().toISOString(),
      budgetId: budget.id
    });
  };

  const generatePDF = (budget: Budget, type: 'budget' | 'contract' | 'receipt') => {
    console.log(`Generating ${type} PDF for ${budget.customerName}...`);
    
    try {
      // Safety checks for basic data
      const safeCustomerName = budget.customerName || 'Cliente não identificado';
      const safeTitle = budget.title || 'Serviço sem título';
      const safeTotal = typeof budget.totalAmount === 'number' ? budget.totalAmount : 0;
      const safeDate = budget.date ? new Date(budget.date) : new Date();
      const formattedDate = isNaN(safeDate.getTime()) ? new Date().toLocaleDateString('pt-BR') : safeDate.toLocaleDateString('pt-BR');

      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Helper for Footer
      const addFooter = (doc: jsPDF) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.setDrawColor(240, 240, 240);
          doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
          doc.text(`MetaCash - Gestão Inteligente | Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      };

      // Header Background (Premium Slate)
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, pageWidth, 55, 'F');
      
      // Logo / Company Name
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(profile?.companyName || 'MetaCash', margin, 32);
      
      // Company Info (Right Aligned)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      const companyInfo = [
        `${profile?.ownerName || 'Profissional Especializado'}`,
        `Contato: ${profile?.phone || 'Não informado'}`,
        `E-mail: ${profile?.email || user.email}`
      ];
      doc.text(companyInfo, pageWidth - margin, 25, { align: 'right' });
      
      // Decorative Accent Line (Brand Color)
      doc.setDrawColor(88, 101, 242);
      doc.setLineWidth(1.5);
      doc.line(margin, 45, 60, 45);

      if (type === 'budget') {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('PROPOSTA COMERCIAL', margin, 75);
        
        // Client Info Section
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, 85, pageWidth - (margin * 2), 35, 4, 4, 'FD');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(88, 101, 242);
        doc.text('DADOS DO CLIENTE', margin + 8, 93);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text([
          `Cliente: ${safeCustomerName}`,
          `Data de Emissão: ${formattedDate}`,
          `Projeto: ${safeTitle}`
        ], margin + 8, 102, { lineHeightFactor: 1.4 });

        const itemsArray = Array.isArray(budget.items) ? budget.items : [];
        const tableData = itemsArray.map(item => {
          const q = typeof item.quantity === 'number' ? item.quantity : 0;
          const p = typeof item.price === 'number' ? item.price : 0;
          return [
            item.description || 'Item sem descrição',
            q.toString(),
            `R$ ${p.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `R$ ${(q * p).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
        });

        autoTable(doc, {
          startY: 135,
          head: [['Descrição do Serviço / Item', 'Qtd', 'Vlr. Unitário', 'Subtotal']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [15, 23, 42], 
            fontSize: 10, 
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 5
          },
          columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right', cellWidth: 40 },
            3: { halign: 'right', cellWidth: 40 }
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 5,
            textColor: [51, 65, 85],
            lineColor: [241, 245, 249]
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          }
        });

        let finalY = (doc as any).lastAutoTable?.finalY || 135;

        // Add Materials Table if present
        const materialsArray = Array.isArray(budget.materials) ? budget.materials : [];
        if (materialsArray.length > 0) {
          const matTableData = materialsArray.map(mat => {
            const q = typeof mat.quantity === 'number' ? mat.quantity : 0;
            const p = typeof mat.price === 'number' ? mat.price : 0;
            return [
              mat.description || 'Material sem descrição',
              q.toString(),
              `R$ ${p.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `R$ ${(q * p).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ];
          });

          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(88, 101, 242);
          doc.text('MATERIAIS', margin, finalY + 15);

          autoTable(doc, {
            startY: finalY + 20,
            head: [['Descrição do Material', 'Qtd', 'Vlr. Unitário', 'Subtotal']],
            body: matTableData,
            theme: 'striped',
            headStyles: { 
              fillColor: [71, 85, 105], 
              fontSize: 10, 
              fontStyle: 'bold',
              halign: 'center',
              cellPadding: 5
            },
            columnStyles: {
              0: { cellWidth: 'auto' },
              1: { halign: 'center', cellWidth: 20 },
              2: { halign: 'right', cellWidth: 40 },
              3: { halign: 'right', cellWidth: 40 }
            },
            styles: { 
              fontSize: 9, 
              cellPadding: 5,
              textColor: [51, 65, 85],
              lineColor: [241, 245, 249]
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            }
          });
          finalY = (doc as any).lastAutoTable?.finalY || finalY + 20;
        }
        
        // Ensure we are on the last page the table occupied
        const totalPages = (doc as any).internal.getNumberOfPages();
        doc.setPage(totalPages);

        // Position for Total Box
        if (finalY > pageHeight - 85) {
          doc.addPage();
          finalY = 35;
        } else {
          finalY += 25;
        }

        // Total Highlight Box (Premium Look)
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(pageWidth - 95, finalY - 12, 75, 20, 2, 2, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`VALOR TOTAL: R$ ${safeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - margin - 5, finalY + 1, { align: 'right' });
        
        // Signatures Section - Fixed at bottom but moves to new page if needed
        let sigY = pageHeight - 60;
        
        // If total box is too close to signature, move signature to next page
        if (finalY > sigY - 30) {
          doc.addPage();
          sigY = pageHeight - 60;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        
        doc.line(margin, sigY, 90, sigY);
        doc.text(profile?.companyName || 'Assinatura do Prestador', margin + 35, sigY + 6, { align: 'center' });
        
        doc.line(pageWidth - 90, sigY, pageWidth - margin, sigY);
        doc.text('Assinatura do Cliente', pageWidth - margin - 35, sigY + 6, { align: 'center' });

      } else if (type === 'contract') {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', margin, 75);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        
        const contractText = budget.contractText || `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ELÉTRICOS

1. OBJETO DO CONTRATO
O presente contrato tem por objeto a prestação de serviços de ${safeTitle}, conforme itens descritos no orçamento anexo.

2. PRAZO DE EXECUÇÃO
O prazo estimado para a conclusão dos serviços é de ${budget.contractDetails?.deadline || 'A combinar'}.

3. VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de R$ ${safeTotal.toLocaleString('pt-BR')}.
Condições de pagamento: ${budget.contractDetails?.paymentTerms || 'A combinar'}.

4. GARANTIA
O prestador oferece garantia de ${budget.contractDetails?.warranty || '90 dias'} sobre a mão de obra executada.

5. OBRIGAÇÕES DO CONTRATANTE
Fornecer os materiais necessários (salvo acordo em contrário) e livre acesso ao local da obra.

Data: ${formattedDate}

__________________________
Assinatura do Prestador`;

        const splitText = doc.splitTextToSize(contractText, pageWidth - (margin * 2));
        doc.text(splitText, margin, 90, { lineHeightFactor: 1.6 });

      } else {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('RECIBO DE PAGAMENTO', margin, 75);
        
        // Receipt Frame
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(252, 252, 252);
        doc.roundedRect(margin, 85, pageWidth - (margin * 2), 95, 4, 4, 'FD');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        
        const receiptText = `Recebemos de ${safeCustomerName.toUpperCase()}, a importância de R$ ${safeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente à quitação total dos serviços de ${safeTitle.toUpperCase()} realizados conforme proposta técnica aprovada.

Damos por este recibo a plena e geral quitação dos valores acima mencionados, nada mais havendo a reclamar sobre o objeto deste pagamento.`;
        
        const splitReceipt = doc.splitTextToSize(receiptText, pageWidth - (margin * 2) - 20);
        doc.text(splitReceipt, margin + 10, 105, { lineHeightFactor: 1.7 });
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, margin + 10, 155);
        
        // Signature Line
        doc.line(pageWidth / 2 - 50, pageHeight - 80, pageWidth / 2 + 50, pageHeight - 80);
        doc.setFontSize(10);
        doc.text(profile?.companyName || 'Assinatura do Prestador', pageWidth / 2, pageHeight - 74, { align: 'center' });
      }

      addFooter(doc);

      const fileName = `${type}_${safeCustomerName.replace(/\s/g, '_')}.pdf`;
      
      // Standard Save (Most reliable)
      doc.save(fileName);
      
      console.log("PDF generated and download triggered.");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Verifique se os dados do orçamento estão completos.`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 sm:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Orçamentos</h2>
          <p className="text-zinc-400 text-xs sm:text-sm">Propostas comerciais e contratos profissionais.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary w-full sm:w-auto py-3 sm:py-2.5">
          <Plus size={20} /> Novo Orçamento
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {budgets.map((b) => (
          <motion.div
            key={b.id}
            layout
            className="card-saas p-6 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg leading-tight">{b.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">{b.customerName} • {new Date(b.date).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 
                  b.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {b.status === 'approved' ? 'Aprovado' : b.status === 'rejected' ? 'Recusado' : 'Pendente'}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(b)} className="p-1.5 text-zinc-500 hover:text-emerald-400 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => b.id && handleDelete(b.id)} className="p-1.5 text-zinc-500 hover:text-rose-500 transition-colors">
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Valor Total</p>
                <p className="text-2xl font-bold text-white">R$ {b.totalAmount.toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => generatePDF(b, 'budget')} className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors" title="Orçamento">
                  <FileText size={20} />
                </button>
                <button onClick={() => generatePDF(b, 'contract')} className="p-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors" title="Contrato">
                  <FileSignature size={20} />
                </button>
                {b.status === 'approved' && (
                  <button onClick={() => generatePDF(b, 'receipt')} className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-colors" title="Recibo">
                    <Receipt size={20} />
                  </button>
                )}
              </div>
            </div>

            {b.status === 'pending' && (
              <button
                onClick={() => handleApprove(b)}
                className="w-full btn-primary py-3 text-sm"
              >
                <CheckCircle size={18} /> Aprovar e Faturar
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto pt-10">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-zinc-900 w-full max-w-3xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col border border-zinc-800"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-20">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
                  <p className="text-xs sm:text-sm text-zinc-400">Preencha os dados ou use a IA para analisar um projeto.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">Cliente</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerResults(true);
                        }}
                        onFocus={() => setShowCustomerResults(true)}
                        className="input-saas pr-12 py-3"
                        placeholder="Buscar cliente..."
                      />
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    </div>
                    
                    <AnimatePresence>
                      {showCustomerResults && customerSearch && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-30 w-full mt-2 bg-white border border-zinc-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto"
                        >
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setCustomerId(c.id!);
                                  setCustomerSearch(c.name);
                                  setCustomerPhone(c.phone);
                                  setShowCustomerResults(false);
                                }}
                                className="w-full p-4 text-left hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-between border-b border-zinc-100 last:border-0"
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-zinc-900">{c.name}</span>
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{c.phone}</span>
                                </div>
                                <ChevronRight size={16} className="text-zinc-400" />
                              </button>
                            ))
                          ) : (
                            <div className="p-6 text-center text-zinc-400 text-sm">Nenhum cliente encontrado.</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {!customerId && (
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">Telefone do Cliente (Agrupamento)</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="input-saas py-3"
                        placeholder="Ex: 5511999999999"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">Título do Projeto</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input-saas py-3"
                      placeholder="Ex: Reforma Elétrica - Casa de Praia"
                      required
                    />
                  </div>
                </div>

                {/* AI Analysis Section */}
                <div className="bg-emerald-500/10 rounded-3xl p-5 sm:p-6 border border-emerald-500/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2 text-emerald-500 font-bold">
                        <Sparkles size={20} />
                        <span className="text-sm sm:text-base">Análise de Projeto com IA</span>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="application/pdf"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loadingAI}
                        className="btn-primary py-2.5 px-4 text-xs w-full sm:w-auto"
                      >
                        {loadingAI ? 'Analisando...' : <><Upload size={16} /> Analisar PDF do Projeto</>}
                      </button>
                    </div>
                    
                    {!analysis && !loadingAI && (
                      <div className="flex items-start gap-3 text-emerald-500/70 text-[10px] sm:text-xs italic">
                        <AlertCircle size={16} className="shrink-0" />
                        <p>Dica: Faça o upload do PDF do projeto elétrico para que a IA extraia automaticamente os materiais e sugira um valor.</p>
                      </div>
                    )}

                    {analysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 mt-4"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                          {analysis.sockets && (
                            <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
                              <p className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Tomadas</p>
                              <p className="font-bold text-emerald-500">{analysis.sockets} pts</p>
                            </div>
                          )}
                          {analysis.switches && (
                            <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
                              <p className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Interruptores</p>
                              <p className="font-bold text-emerald-500">{analysis.switches} pts</p>
                            </div>
                          )}
                          {analysis.dichroics && (
                            <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
                              <p className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Dicroicas</p>
                              <p className="font-bold text-emerald-500">{analysis.dichroics} pts</p>
                            </div>
                          )}
                          {analysis.ledPanels && (
                            <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
                              <p className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Painéis LED</p>
                              <p className="font-bold text-emerald-500">{analysis.ledPanels} un</p>
                            </div>
                          )}
                          {analysis.ledProfiles && analysis.ledProfiles.map((p, i) => (
                            <div key={i} className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700">
                              <p className="text-[9px] text-zinc-400 uppercase font-bold mb-1">Perfil LED ({p.type})</p>
                              <p className="font-bold text-emerald-500">{p.meters}m</p>
                            </div>
                          ))}
                        </div>
                        
                        <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700 space-y-2">
                          <p className="text-[10px] text-emerald-500 font-bold uppercase">Base de Cálculo IA</p>
                          <p className="text-xs text-emerald-400 leading-relaxed">{analysis.calculationBasis}</p>
                          <p className="text-sm font-bold text-white">Valor Total Sugerido: R$ {analysis.suggestedValue?.toLocaleString('pt-BR')}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <Sparkles className="absolute -right-6 -bottom-6 text-emerald-900/20 opacity-50" size={120} />
                </div>

                {/* Items Table */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Mão de Obra / Serviços</label>
                    <button
                      type="button"
                      onClick={() => setItems([...items, { description: '', quantity: 1, price: 0 }])}
                      className="text-emerald-500 text-xs font-bold hover:underline text-left"
                    >
                      + Adicionar Serviço
                    </button>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx}
                        className="flex flex-col sm:flex-row gap-3 p-4 sm:p-0 bg-zinc-800 sm:bg-transparent rounded-2xl border border-zinc-700 sm:border-0 relative"
                      >
                        <div className="flex-1">
                          <label className="sm:hidden block text-[9px] font-bold text-zinc-400 uppercase mb-1">Descrição</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].description = e.target.value;
                              setItems(newItems);
                            }}
                            className="w-full input-saas py-2.5 text-sm"
                            placeholder="Descrição do serviço"
                          />
                        </div>
                        <div className="flex items-center gap-2 sm:w-48">
                          <div className="w-16">
                            <label className="sm:hidden block text-[9px] font-bold text-zinc-400 uppercase mb-1">Qtd</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].quantity = parseInt(e.target.value) || 0;
                                setItems(newItems);
                              }}
                              className="w-full input-saas py-2.5 text-sm text-center"
                              placeholder="Qtd"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="sm:hidden block text-[9px] font-bold text-zinc-400 uppercase mb-1">Valor Unitário</label>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].price = parseFloat(e.target.value) || 0;
                                setItems(newItems);
                              }}
                              className="w-full input-saas py-2.5 text-sm"
                              placeholder="Valor"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="absolute top-3 right-3 sm:relative sm:top-0 sm:right-0 p-2 text-zinc-300 hover:text-red-500 active:scale-90 transition-all"
                        >
                          <X size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Materials Table */}
                <div className="space-y-4 pt-6 border-t border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Materiais (Opcional)</label>
                    <button
                      type="button"
                      onClick={() => setMaterials([...materials, { description: '', quantity: 1, price: 0 }])}
                      className="text-emerald-500 text-xs font-bold hover:underline text-left"
                    >
                      + Adicionar Material
                    </button>
                  </div>
                  <div className="space-y-3">
                    {materials.map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx}
                        className="flex flex-col sm:flex-row gap-3 p-4 sm:p-0 bg-zinc-800 sm:bg-transparent rounded-2xl border border-zinc-700 sm:border-0 relative"
                      >
                        <div className="flex-1">
                          <label className="sm:hidden block text-[9px] font-bold text-zinc-400 uppercase mb-1">Descrição do Material</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const newMats = [...materials];
                              newMats[idx].description = e.target.value;
                              setMaterials(newMats);
                            }}
                            className="w-full input-saas py-2.5 text-sm"
                            placeholder="Ex: Cabo Flexível 2.5mm"
                          />
                        </div>
                        <div className="flex items-center gap-2 sm:w-48">
                          <div className="w-16">
                            <label className="sm:hidden block text-[9px] font-bold text-zinc-400 uppercase mb-1">Qtd</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newMats = [...materials];
                                newMats[idx].quantity = parseInt(e.target.value) || 0;
                                setMaterials(newMats);
                              }}
                              className="w-full input-saas py-2.5 text-sm text-center"
                              placeholder="Qtd"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="sm:hidden block text-[9px] font-bold text-zinc-400 uppercase mb-1">Valor Unitário</label>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const newMats = [...materials];
                                newMats[idx].price = parseFloat(e.target.value) || 0;
                                setMaterials(newMats);
                              }}
                              className="w-full input-saas py-2.5 text-sm"
                              placeholder="Valor"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMaterials(materials.filter((_, i) => i !== idx))}
                          className="absolute top-3 right-3 sm:relative sm:top-0 sm:right-0 p-2 text-zinc-300 hover:text-red-500 active:scale-90 transition-all"
                        >
                          <X size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Contract Details Section */}
                <div className="space-y-4 pt-6 border-t border-zinc-100">
                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <FileSignature size={18} className="text-brand-600" />
                    Detalhes do Contrato
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Prazo de Entrega</label>
                      <input
                        type="text"
                        value={contractDetails?.deadline}
                        onChange={(e) => setContractDetails({...contractDetails!, deadline: e.target.value})}
                        className="input-saas py-2.5 text-sm"
                        placeholder="Ex: 10 dias úteis"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Pagamento</label>
                      <input
                        type="text"
                        value={contractDetails?.paymentTerms}
                        onChange={(e) => setContractDetails({...contractDetails!, paymentTerms: e.target.value})}
                        className="input-saas py-2.5 text-sm"
                        placeholder="Ex: 50% entrada"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Garantia</label>
                      <input
                        type="text"
                        value={contractDetails?.warranty}
                        onChange={(e) => setContractDetails({...contractDetails!, warranty: e.target.value})}
                        className="input-saas py-2.5 text-sm"
                        placeholder="Ex: 1 ano"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Cláusulas Extras</label>
                    <textarea
                      value={contractDetails?.customClauses}
                      onChange={(e) => setContractDetails({...contractDetails!, customClauses: e.target.value})}
                      className="input-saas py-2.5 text-sm h-24 resize-none"
                      placeholder="Adicione observações ou cláusulas específicas para este contrato..."
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-6 sticky bottom-0 bg-white pb-4">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Total Estimado</p>
                    <p className="text-3xl font-bold text-zinc-900">
                      R$ {(items.reduce((acc, i) => acc + (i.quantity * i.price), 0) + materials.reduce((acc, i) => acc + (i.quantity * i.price), 0)).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <button type="submit" className="btn-primary w-full sm:w-auto py-4 px-12 text-lg shadow-xl shadow-brand-500/30">
                    Gerar Proposta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
