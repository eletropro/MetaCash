import { GoogleGenAI } from "@google/genai";
import { Transaction, Budget, Customer } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFinancialInsights(transactions: Transaction[]) {
  const summary = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const prompt = `Analise o seguinte resumo financeiro de um pequeno negócio de eletricista:
  Entradas: R$ ${summary.income}
  Saídas: R$ ${summary.expense}
  Saldo: R$ ${summary.income - summary.expense}
  
  Dê um conselho curto e motivador sobre como está a gestão financeira.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights no momento.";
  }
}

export async function generateCRMMessage(customer: Customer, action: 'convince' | 'thank') {
  const prompt = `Gere uma mensagem curta e profissional para WhatsApp para um cliente chamado ${customer.name}.
  Contexto: ${customer.notes || "Cliente de serviços elétricos"}.
  Objetivo: ${action === 'convince' ? 'Convencer o cliente a fechar um orçamento ou serviço pendente.' : 'Agradecer por um serviço já realizado e se colocar à disposição.'}
  A mensagem deve ser amigável e direta.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
}

export async function analyzeElectricalProjectPDF(base64Data: string) {
  const prompt = `Analise o seguinte documento PDF de um projeto elétrico e extraia detalhadamente:
  1. Quantidade de Tomadas (novas e existentes a trocar).
  2. Quantidade de Interruptores (simples, paralelos, intermediários).
  3. Quantidade de Dicroicas/Spots.
  4. Quantidade de Painéis de LED.
  5. Metragem de Perfil de LED, especificando se é de EMBUTIR ou SOBREPOR.
  6. Outros componentes relevantes (quadro, disjuntores, etc).

  Lógica de Cálculo de Preço (Referência):
  - Tomada/Interruptor: R$ 35,00 por ponto.
  - Dicroica/Spot: R$ 45,00 por ponto.
  - Painel de LED: R$ 70,00 por unidade.
  - Perfil de LED: R$ 100,00 por metro linear (instalação).
  - Mão de obra base: Considere a complexidade e some 20% de margem de segurança.

  Retorne APENAS um JSON com as chaves: 
  sockets (number), 
  switches (number), 
  dichroics (number), 
  ledPanels (number), 
  ledProfiles (array de objetos {meters: number, type: 'embutir' | 'sobrepor'}), 
  otherDetails (string), 
  suggestedValue (number),
  calculationBasis (string - breve explicação de como chegou no valor).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data
          }
        }
      ],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini PDF Error:", error);
    return null;
  }
}
